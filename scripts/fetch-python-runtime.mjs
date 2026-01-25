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
    assetName: 'main-windows-latest.zip',
    resourceFolder: 'win',
    executableName: 'main.exe',
  },
  darwin: {
    assetName: 'main-macos-14.zip',
    resourceFolder: 'mac',
    executableName: 'main',
  },
  linux: {
    assetName: 'main-ubuntu-22.04.zip',
    resourceFolder: 'linux',
    executableName: 'main',
  },
};

const platformConfig = PLATFORM_CONFIG[process.platform];
if (!platformConfig) {
  console.error(`Unsupported platform: ${process.platform}`);
  process.exit(1);
}

if (typeof fetch !== 'function') {
  console.error('Global fetch is not available. Use Node 18+ to run this script.');
  process.exit(1);
}

const repoRoot = path.resolve(process.cwd());
const resourcesRoot = path.join(repoRoot, 'resources');
const targetDir = path.join(resourcesRoot, platformConfig.resourceFolder, 'main');

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  'User-Agent': 'jobelix-runtime-fetch',
  Accept: 'application/vnd.github+json',
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

async function fetchRelease() {
  const url = `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch release ${TAG}: ${response.status} ${body}`);
  }
  return response.json();
}

async function downloadAsset(url, destination) {
  const response = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
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
  const entries = await fsPromises.readdir(extractDir, { withFileTypes: true });
  const rootFolder = entries.find((entry) => entry.isDirectory() && entry.name.startsWith('main-'));

  if (!rootFolder) {
    throw new Error('Unexpected archive structure: could not locate main-<platform> folder.');
  }

  const mainDir = path.join(extractDir, rootFolder.name, 'main');
  const stat = await fsPromises.stat(mainDir).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error('Unexpected archive structure: missing inner main/ directory.');
  }

  return mainDir;
}

async function installRuntime() {
  console.log(`Fetching Python runtime ${TAG} for ${process.platform}...`);

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
  await downloadAsset(asset.browser_download_url, zipPath);

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
