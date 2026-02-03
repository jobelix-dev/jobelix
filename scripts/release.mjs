#!/usr/bin/env node
/**
 * Release Script - Build and optionally publish Electron app
 * 
 * Detects OS and architecture, sets appropriate labels for artifact naming.
 * Fetches the latest GitHub release version to publish to.
 * 
 * Usage:
 *   npm run dist                        # Build only (uses package.json version)
 *   npm run release                     # Build and publish to latest GitHub release
 *   npm run release -- --version 1.2.3  # Build and publish at specific version
 *   JOBELIX_LINUX_LABEL=arch npm run release  # Override Linux label for Arch
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import https from 'https';
import { fileURLToPath } from 'url';

const GITHUB_OWNER = 'jobelix-dev';
const GITHUB_REPO = 'jobelix-releases';

/**
 * Fetch the latest release version from GitHub
 */
async function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'Jobelix-Release-Script',
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    // Add auth token if available
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 404) {
          // No releases yet
          resolve(null);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          // tag_name is typically "v1.2.3", strip the "v" prefix
          const version = json.tag_name?.replace(/^v/, '') || null;
          resolve(version);
        } catch (e) {
          reject(new Error(`Failed to parse GitHub response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('GitHub API request timed out'));
    });
    req.end();
  });
}

/**
 * Update package.json version
 */
function updatePackageVersion(version) {
  const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const oldVersion = pkg.version;
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  return oldVersion;
}

/**
 * Increment semantic version
 * @param {string} version - Current version (e.g., "1.2.3")
 * @param {'patch'|'minor'|'major'} bump - Which part to increment
 * @returns {string} New version
 */
function incrementVersion(version, bump = 'patch') {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  let [major, minor, patch] = parts;
  
  switch (bump) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
    default:
      patch++;
      break;
  }
  
  return `${major}.${minor}.${patch}`;
}

/**
 * Detect if running on Arch Linux or derivative
 */
function isArchLinux() {
  try {
    if (!fs.existsSync('/etc/os-release')) return false;
    const content = fs.readFileSync('/etc/os-release', 'utf-8');
    const id = content.match(/^ID=(.*)$/m)?.[1]?.replace(/"/g, '') || '';
    const like = content.match(/^ID_LIKE=(.*)$/m)?.[1]?.replace(/"/g, '') || '';
    const archDistros = ['arch', 'manjaro', 'endeavouros', 'garuda', 'arco', 'artix'];
    return archDistros.includes(id) || archDistros.some(d => like.includes(d));
  } catch {
    return false;
  }
}

/**
 * Get platform info matching CI naming conventions
 */
function getPlatformInfo() {
  const platform = process.platform;
  const arch = os.arch(); // 'x64', 'arm64', etc.
  
  if (platform === 'win32') {
    return { os: 'win', arch, label: null };
  }
  
  if (platform === 'darwin') {
    return { os: 'mac', arch, label: null };
  }
  
  if (platform === 'linux') {
    // Allow override via env var (e.g., JOBELIX_LINUX_LABEL=arch)
    const label = process.env.JOBELIX_LINUX_LABEL || (isArchLinux() ? 'arch' : 'ubuntu-22.04');
    return { os: 'linux', arch, label };
  }
  
  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Parse CLI arguments
 */
function parseArgs(args) {
  const result = {
    version: null,
    bump: 'patch', // Default to patch bump
    publish: false,
    extraArgs: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--version' && args[i + 1]) {
      result.version = args[++i].replace(/^v/, '');
    } else if (arg === '--bump' && args[i + 1]) {
      const bumpType = args[++i].toLowerCase();
      if (['patch', 'minor', 'major'].includes(bumpType)) {
        result.bump = bumpType;
      } else {
        console.warn(`Unknown bump type "${bumpType}", using "patch"`);
      }
    } else if (arg === '--publish') {
      result.publish = true;
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        result.extraArgs.push('--publish', args[++i]);
      } else {
        result.extraArgs.push('--publish', 'always');
      }
    } else {
      result.extraArgs.push(arg);
    }
  }

  return result;
}

// Main
async function main() {
  // Get platform info
  const platformInfo = getPlatformInfo();

  // Parse arguments
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  console.log('═'.repeat(60));
  console.log('Jobelix Release Script');
  console.log('═'.repeat(60));

  // Determine version
  let targetVersion = parsed.version;
  let versionSource = 'CLI argument';

  if (!targetVersion && parsed.extraArgs.includes('always')) {
    // Publishing - fetch latest version from GitHub (use same version to add platform build)
    console.log('Fetching latest release version from GitHub...');
    try {
      const latestVersion = await fetchLatestVersion();
      if (latestVersion) {
        // Use the same version (add this platform's build to existing release)
        targetVersion = latestVersion;
        versionSource = `GitHub latest (v${latestVersion})`;
        console.log(`  Latest release: v${latestVersion}`);
        console.log(`  Publishing to:  v${targetVersion}`);
      } else {
        // No releases yet, use package.json version
        const pkg = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8'));
        targetVersion = pkg.version;
        versionSource = 'package.json (no releases yet)';
        console.log('  No releases found, using package.json version');
      }
    } catch (error) {
      console.warn(`  Warning: Could not fetch GitHub releases: ${error.message}`);
      console.warn('  Falling back to package.json version');
      const pkg = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8'));
      targetVersion = pkg.version;
      versionSource = 'package.json (GitHub fetch failed)';
    }
  }

  // Update package.json version if needed
  if (targetVersion) {
    const oldVersion = updatePackageVersion(targetVersion);
    if (oldVersion !== targetVersion) {
      console.log(`Version:      ${oldVersion} → ${targetVersion} (${versionSource})`);
    } else {
      console.log(`Version:      ${targetVersion} (${versionSource})`);
    }
  } else {
    const pkg = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8'));
    console.log(`Version:      ${pkg.version} (package.json)`);
  }

  // Setup environment
  const env = { ...process.env };
  if (platformInfo.label) {
    env.JOBELIX_LINUX_LABEL = platformInfo.label;
  }

  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  // Build electron-builder command
  const builderArgs = ['electron-builder'];

  // Add platform flag
  if (platformInfo.os === 'win') builderArgs.push('--win');
  if (platformInfo.os === 'mac') builderArgs.push('--mac');
  if (platformInfo.os === 'linux') builderArgs.push('--linux');

  // Add architecture
  builderArgs.push(`--${platformInfo.arch}`);

  // Add any additional args
  builderArgs.push(...parsed.extraArgs);

  console.log(`Platform:     ${process.platform} (${platformInfo.os})`);
  console.log(`Architecture: ${platformInfo.arch}`);
  if (platformInfo.label) {
    console.log(`Linux Label:  ${platformInfo.label}`);
  }
  console.log(`Command:      ${cmd} ${builderArgs.join(' ')}`);
  console.log('═'.repeat(60));

  // Run electron-builder
  const result = spawnSync(cmd, builderArgs, {
    stdio: 'inherit',
    env,
    shell: true,
  });

  // Handle errors
  if (result.error) {
    console.error('\n❌ Error spawning electron-builder:');
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n❌ electron-builder exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }

  console.log('\n✅ Build completed successfully');
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
