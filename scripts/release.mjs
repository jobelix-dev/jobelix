import { spawnSync } from 'child_process';
import fs from 'fs';

function isArchLinux() {
  try {
    if (!fs.existsSync('/etc/os-release')) return false;
    const content = fs.readFileSync('/etc/os-release', 'utf-8');
    const id = content.match(/^ID=(.*)$/m)?.[1]?.replace(/"/g, '') || '';
    const like = content.match(/^ID_LIKE=(.*)$/m)?.[1]?.replace(/"/g, '') || '';
    return id === 'arch' || like.includes('arch');
  } catch {
    return false;
  }
}

function resolveLinuxLabel() {
  return isArchLinux() ? 'linux-arch' : 'ubuntu-22.04';
}

// Setup environment
const env = { ...process.env };
if (process.platform === 'linux') {
  env.JOBELIX_LINUX_LABEL = resolveLinuxLabel();
}

// Parse arguments
const args = process.argv.slice(2);
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

console.log('='.repeat(60));
console.log('Release Script Starting');
console.log('='.repeat(60));
console.log('Platform:', process.platform);
console.log('Command:', cmd);
console.log('Arguments:', ['electron-builder', ...args].join(' '));
console.log('='.repeat(60));

// Run electron-builder
const result = spawnSync(cmd, ['electron-builder', ...args], {
  stdio: 'inherit',
  env,
  shell: true, // Important for Windows to resolve npx.cmd properly
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
