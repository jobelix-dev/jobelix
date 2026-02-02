#!/usr/bin/env node
/**
 * After-pack script for electron-builder
 * 
 * 1. Strips debug symbols from binaries to reduce package size
 * 2. On Linux: Creates wrapper script for fast AppImage startup (APPIMAGE_EXTRACT_AND_RUN)
 * 
 * This runs after the app is packaged but before creating the installer/AppImage
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
export default async function afterPack(context) {
  const { appOutDir, electronPlatformName } = context;
  
  console.log(`\n🔧 After-pack: Processing ${electronPlatformName}...`);

  if (electronPlatformName === 'linux') {
    await stripLinux(appOutDir);
    await createLinuxWrapper(appOutDir);
  } else if (electronPlatformName === 'darwin') {
    await stripMac(appOutDir);
  }
  // Windows binaries are already stripped by default in release builds
  
  console.log('✅ After-pack complete\n');
}

/**
 * Strip debug symbols from Linux binaries
 */
async function stripLinux(appOutDir) {
  const binaries = [
    'jobelix',                    // Main Electron binary
    'chrome_crashpad_handler',
    'libffmpeg.so',
    'libEGL.so',
    'libGLESv2.so',
    'libvk_swiftshader.so',
    'libvulkan.so.1',
  ];

  // Check if strip is available
  try {
    execSync('which strip', { stdio: 'ignore' });
  } catch {
    console.log('  ⚠️  strip not found, skipping Linux symbol stripping');
    return;
  }

  for (const binary of binaries) {
    const binaryPath = path.join(appOutDir, binary);
    if (fs.existsSync(binaryPath)) {
      try {
        const sizeBefore = fs.statSync(binaryPath).size;
        execSync(`strip --strip-debug "${binaryPath}"`, { stdio: 'ignore' });
        const sizeAfter = fs.statSync(binaryPath).size;
        const saved = ((sizeBefore - sizeAfter) / 1024 / 1024).toFixed(2);
        if (sizeBefore > sizeAfter) {
          console.log(`  ✓ ${binary}: saved ${saved}MB`);
        }
      } catch (_error) {
        // Some binaries may not be strippable, that's ok
        console.log(`  - ${binary}: skipped (not strippable)`);
      }
    }
  }
}

/**
 * Create a wrapper script for Linux AppImage that enables fast startup
 * 
 * By default, AppImage runs through FUSE which is extremely slow on some systems.
 * Setting APPIMAGE_EXTRACT_AND_RUN=1 makes it extract to /tmp and run directly,
 * which can improve startup time from 50+ seconds to <1 second.
 * 
 * We rename the original binary and create a wrapper that sets the env var.
 */
async function createLinuxWrapper(appOutDir) {
  console.log('  Creating fast-startup wrapper for Linux...');
  
  const binaryName = 'jobelix';
  const originalBinary = path.join(appOutDir, binaryName);
  const renamedBinary = path.join(appOutDir, `${binaryName}.bin`);
  
  if (!fs.existsSync(originalBinary)) {
    console.log(`  ⚠️  Binary not found: ${originalBinary}`);
    return;
  }
  
  // Rename original binary
  fs.renameSync(originalBinary, renamedBinary);
  
  // Create wrapper script that sets APPIMAGE_EXTRACT_AND_RUN
  // This dramatically improves startup time on Linux by bypassing FUSE
  const wrapperScript = `#!/bin/bash
# Jobelix fast-startup wrapper
# Sets APPIMAGE_EXTRACT_AND_RUN=1 to bypass slow FUSE layer
# This improves startup time from ~50s to <1s on many Linux systems

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
export APPIMAGE_EXTRACT_AND_RUN=1
exec "\${SCRIPT_DIR}/${binaryName}.bin" "$@"
`;
  
  fs.writeFileSync(originalBinary, wrapperScript, { mode: 0o755 });
  console.log(`  ✓ Created wrapper script with APPIMAGE_EXTRACT_AND_RUN=1`);
}

/**
 * Strip debug symbols from macOS binaries using strip -x
 */
async function stripMac(appOutDir) {
  const appName = 'Jobelix.app';
  const frameworksPath = path.join(appOutDir, appName, 'Contents', 'Frameworks');
  const macOSPath = path.join(appOutDir, appName, 'Contents', 'MacOS');

  // Check if strip is available
  try {
    execSync('which strip', { stdio: 'ignore' });
  } catch {
    console.log('  ⚠️  strip not found, skipping macOS symbol stripping');
    return;
  }

  // Strip the main executable
  const mainBinary = path.join(macOSPath, 'Jobelix');
  if (fs.existsSync(mainBinary)) {
    try {
      const sizeBefore = fs.statSync(mainBinary).size;
      execSync(`strip -x "${mainBinary}"`, { stdio: 'ignore' });
      const sizeAfter = fs.statSync(mainBinary).size;
      const saved = ((sizeBefore - sizeAfter) / 1024 / 1024).toFixed(2);
      if (sizeBefore > sizeAfter) {
        console.log(`  ✓ Jobelix (main): saved ${saved}MB`);
      }
    } catch {
      console.log('  - Jobelix (main): skipped');
    }
  }

  // Strip helper apps in Frameworks
  if (fs.existsSync(frameworksPath)) {
    const helpers = fs.readdirSync(frameworksPath).filter(f => f.endsWith('.app'));
    for (const helper of helpers) {
      const helperBinary = path.join(
        frameworksPath, 
        helper, 
        'Contents', 
        'MacOS', 
        helper.replace('.app', '')
      );
      if (fs.existsSync(helperBinary)) {
        try {
          execSync(`strip -x "${helperBinary}"`, { stdio: 'ignore' });
          console.log(`  ✓ ${helper}: stripped`);
        } catch {
          // Silent fail for helpers
        }
      }
    }
  }
}
