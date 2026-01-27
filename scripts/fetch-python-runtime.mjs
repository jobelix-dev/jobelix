import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';

const REPO = 'lukalafaye/LinkedinAutoApply';
const TAG = process.env.PY_RUNTIME_TAG;

if (!TAG) {
  console.error('Missing PY_RUNTIME_TAG. Example: PY_RUNTIME_TAG=py-runtime-v0.4.0');
  process.exit(1);
}

const PLATFORM_CONFIG = {
  win32: {
    assetName: 'main-windows-2022.zip',
    resourceFolder: 'win',
    executableName: 'main.exe',
  },
  darwin: {
    arm64: {
      assetName: 'main-macos-latest.zip',
      resourceFolder: 'mac',
      executableName: 'main',
    },
    x64: {
      assetName: 'main-macos-15-intel.zip',
      resourceFolder: 'mac',
      executableName: 'main',
    },
  },
  linux: {
    assetName: 'main-ubuntu-22.04.zip',
    resourceFolder: 'linux',
    executableName: 'main',
  },
};

function getPlatformConfig() {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    const arch = os.arch();
    const config = PLATFORM_CONFIG.darwin[arch];
    if (!config) {
      console.error(`Unsupported macOS architecture: ${arch}. Expected 'arm64' or 'x64'.`);
      process.exit(1);
    }
    return config;
  }
  
  const config = PLATFORM_CONFIG[platform];
  if (!config) {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }
  
  return config;
}

const platformConfig = getPlatformConfig();

if (typeof fetch !== 'function') {
  console.error('Global fetch is not available. Use Node 18+ to run this script.');
  process.exit(1);
}

function isArchLinux() {
  try {
    if (!fs.existsSync('/etc/os-release')) return false;
    const content = fs.readFileSync('/etc/os-release', 'utf-8');
    const idMatch = content.match(/^ID=(.+)$/m);
    const likeMatch = content.match(/^ID_LIKE=(.+)$/m);
    const id = idMatch ? idMatch[1].replace(/\"/g, '').toLowerCase() : '';
    const like = likeMatch ? likeMatch[1].replace(/\"/g, '').toLowerCase() : '';
    return id === 'arch' || like.includes('arch');
  } catch {
    return false;
  }
}

const isArch = process.platform === 'linux' && isArchLinux();
const resourceFolder = isArch ? 'linux-arch' : platformConfig.resourceFolder;

const repoRoot = path.resolve(process.cwd());
const resourcesRoot = path.join(repoRoot, 'resources');
const targetDir = path.join(resourcesRoot, resourceFolder, 'main');

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  'User-Agent': 'jobelix-runtime-fetch',
  Accept: 'application/vnd.github+json',
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

async function fetchReleaseList() {
  const url = `https://api.github.com/repos/${REPO}/releases?per_page=20`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch releases list: ${response.status} ${body}`);
  }
  return response.json();
}

async function fetchRelease() {
  if (TAG === 'latest') {
    const url = `https://api.github.com/repos/${REPO}/releases/latest`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to fetch latest release: ${response.status} ${body}`);
    }
    return response.json();
  }

  const url = `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`;
  const response = await fetch(url, { headers });
  if (response.status === 404) {
    const releases = await fetchReleaseList();
    const tags = releases
      .map((release) => release.tag_name)
      .filter(Boolean)
      .join(', ');
    throw new Error(
      `Release tag not found: ${TAG}. Available tags: ${tags || 'none'}.`
    );
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch release ${TAG}: ${response.status} ${body}`);
  }
  return response.json();
}

async function downloadAsset(asset, destination) {
  const response = await fetch(asset.url, {
    headers: {
      ...headers,
      Accept: 'application/octet-stream',
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to download asset: ${response.status} ${body}`);
  }
  await pipeline(response.body, fs.createWriteStream(destination));
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ['--help'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', () => resolve(true));
  });
}

async function extractZip(zipPath, destination) {
  const unzipAvailable = await commandExists('unzip');
  const tarAvailable = await commandExists('tar');

  if (process.platform === 'linux' && !unzipAvailable) {
    throw new Error('The "unzip" utility is required on Linux. Please install it (e.g., apt install unzip).');
  }

  if (unzipAvailable && process.platform !== 'win32') {
    await runCommand('unzip', ['-q', zipPath, '-d', destination]);
    return;
  }

  if (tarAvailable) {
    await runCommand('tar', ['-xf', zipPath, '-C', destination]);
    return;
  }

  throw new Error('Unable to extract zip archive. Please install "unzip" (macOS/Linux) or ensure "tar" is available (Windows).');
}

async function findExtractedMainFolder(extractDir) {
  const directMainDir = path.join(extractDir, 'main');
  const directStat = await fsPromises.stat(directMainDir).catch(() => null);
  if (directStat?.isDirectory()) {
    return directMainDir;
  }

  const entries = await fsPromises.readdir(extractDir, { withFileTypes: true });
  const candidateDirs = entries.filter((entry) => entry.isDirectory());
  const rootFolder =
    candidateDirs.find((entry) => entry.name.startsWith('main-')) ||
    (candidateDirs.length === 1 ? candidateDirs[0] : null);

  if (!rootFolder) {
    throw new Error('Unexpected archive structure: could not locate main-<platform> folder.');
  }

  const mainDir = path.join(extractDir, rootFolder.name, 'main');
  const stat = await fsPromises.stat(mainDir).catch(() => null);
  if (stat?.isDirectory()) {
    return mainDir;
  }

  for (const entry of candidateDirs) {
    const candidate = path.join(extractDir, entry.name, 'main');
    const candidateStat = await fsPromises.stat(candidate).catch(() => null);
    if (candidateStat?.isDirectory()) {
      return candidate;
    }
  }

  throw new Error('Unexpected archive structure: missing inner main/ directory.');
}

async function installRuntime() {
  console.log(`Fetching Python runtime ${TAG} for ${process.platform}...`);
  await fsPromises.mkdir(path.join(resourcesRoot, 'linux-arch'), { recursive: true });

  if (isArch) {
    const executablePath = path.join(targetDir, platformConfig.executableName);
    if (!fs.existsSync(executablePath)) {
      throw new Error(
        `Arch Linux detected. Expected runtime at ${executablePath}. ` +
          'Please compile manually and place the runtime in resources/linux-arch/main/.'
      );
    }
    console.log(`Arch Linux detected. Using existing runtime at ${targetDir}`);
    return;
  }

  const release = await fetchRelease();
  const asset = release.assets?.find((item) => item.name === platformConfig.assetName);

  if (!asset) {
    const available = release.assets?.map((item) => item.name).join(', ') || 'none';
    throw new Error(`Asset not found: ${platformConfig.assetName}. Available: ${available}`);
  }

  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jobelix-py-runtime-'));
  const zipPath = path.join(tmpDir, platformConfig.assetName);
  const extractDir = path.join(tmpDir, 'extract');

  await fsPromises.mkdir(extractDir, { recursive: true });

  console.log(`Downloading ${asset.name}...`);
  await downloadAsset(asset, zipPath);

  console.log('Extracting runtime...');
  await extractZip(zipPath, extractDir);

  const sourceMainDir = await findExtractedMainFolder(extractDir);

  await fsPromises.mkdir(path.dirname(targetDir), { recursive: true });
  await fsPromises.rm(targetDir, { recursive: true, force: true });
  await fsPromises.cp(sourceMainDir, targetDir, { recursive: true });

  if (process.platform !== 'win32') {
    const executablePath = path.join(targetDir, platformConfig.executableName);
    await fsPromises.chmod(executablePath, 0o755);
  }

  console.log(`Runtime installed to ${targetDir}`);
}

installRuntime().catch((error) => {
  console.error('Failed to install Python runtime:', error.message);
  process.exit(1);
});
