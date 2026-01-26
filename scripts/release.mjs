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

const env = { ...process.env };
if (process.platform === 'linux') {
  env.JOBELIX_LINUX_LABEL = resolveLinuxLabel();
}

const args = process.argv.slice(2);
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(cmd, ['electron-builder', ...args], {
  stdio: 'inherit',
  env,
});

process.exit(result.status ?? 1);
