#!/usr/bin/env node
/**
 * After-pack script for electron-builder
 * 
 * Strips debug symbols from binaries to reduce package size.
 * 
 * NOTE ON LINUX APPIMAGE STARTUP:
 * AppImage FUSE mounting can be slow on some systems (50+ seconds).
 * Users experiencing slow startup should run with:
 *   APPIMAGE_EXTRACT_AND_RUN=1 ./Jobelix.AppImage
 * or:
 *   ./Jobelix.AppImage --appimage-extract-and-run
 * 
 * This extracts to /tmp instead of FUSE mounting, reducing startup to <1s.
 * We cannot set this automatically because the env var must be set BEFORE
 * the AppImage runtime starts, not inside the packaged app.
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
  await pruneBundledStandalone(appOutDir);

  if (electronPlatformName === 'linux') {
    await stripLinux(appOutDir);
  } else if (electronPlatformName === 'darwin') {
    await stripMac(appOutDir);
  }
  // Windows binaries are already stripped by default in release builds
  
  console.log('✅ After-pack complete\n');
}

/**
 * Remove non-runtime files from bundled Next standalone output.
 * This keeps runtime behavior unchanged while shrinking installer size.
 */
async function pruneBundledStandalone(appOutDir) {
  const standaloneDir = path.join(appOutDir, 'resources', 'next', 'standalone');
  if (!fs.existsSync(standaloneDir)) {
    return;
  }

  let removedCount = 0;
  let removedBytes = 0;

  const shouldRemove = (filePath) => {
    const basename = path.basename(filePath).toLowerCase();

    if (basename.endsWith('.map')) return true;
    if (basename === '.npmignore') return true;
    if (basename === 'readme' || basename.startsWith('readme.')) return true;
    if (basename === 'changelog' || basename.startsWith('changelog.')) return true;
    if (basename === 'history' || basename.startsWith('history.')) return true;
    return false;
  };

  const walk = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!shouldRemove(fullPath)) continue;

      try {
        const size = fs.statSync(fullPath).size;
        fs.rmSync(fullPath, { force: true });
        removedCount += 1;
        removedBytes += size;
      } catch {
        // Ignore best-effort cleanup failures.
      }
    }
  };

  walk(standaloneDir);

  if (removedCount > 0) {
    const removedMb = (removedBytes / 1024 / 1024).toFixed(2);
    console.log(`  ✓ Pruned Next standalone: removed ${removedCount} files (${removedMb}MB)`);
  }
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
