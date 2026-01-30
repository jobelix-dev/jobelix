#!/usr/bin/env node
/**
 * Release Script - Build and optionally publish Electron app
 * 
 * Detects OS and architecture, sets appropriate labels for artifact naming.
 * Usage:
 *   npm run dist              # Build only
 *   npm run release           # Build and publish to GitHub
 *   JOBELIX_LINUX_LABEL=arch npm run release  # Override Linux label for Arch
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';

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

// Get platform info
const platformInfo = getPlatformInfo();

// Setup environment
const env = { ...process.env };
if (platformInfo.label) {
  env.JOBELIX_LINUX_LABEL = platformInfo.label;
}

// Parse arguments
const args = process.argv.slice(2);
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Build electron-builder command
const builderArgs = ['electron-builder'];

// Add platform flag
if (platformInfo.os === 'win') builderArgs.push('--win');
if (platformInfo.os === 'mac') builderArgs.push('--mac');
if (platformInfo.os === 'linux') builderArgs.push('--linux');

// Add architecture
builderArgs.push(`--${platformInfo.arch}`);

// Add any additional args (like --publish always)
builderArgs.push(...args);

console.log('═'.repeat(60));
console.log('Jobelix Release Script');
console.log('═'.repeat(60));
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
