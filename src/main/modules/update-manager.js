/**
 * Update Manager - Handles automatic updates via electron-updater
 * 
 * IPC Events sent to renderer:
 * - 'update-available' → New version found
 * - 'update-download-progress' → Download progress (Win/Mac)
 * - 'update-downloaded' → Ready to install
 * - 'update-error' → Update failed
 */

import { app, shell, dialog } from 'electron';
import fs from 'fs';
import logger from '../utils/logger.js';
import { getMainWindow } from './window-manager.js';

// Dynamically imported to avoid 1.4MB load at startup
let autoUpdater = null;

const GITHUB_OWNER = 'jobelix-dev';
const GITHUB_REPO = 'jobelix-releases';
const ARCH_DISTROS = ['arch', 'manjaro', 'endeavouros', 'garuda', 'arco', 'artix', 'cachyos'];

// ============================================================================
// Utility Functions
// ============================================================================

function sendToRenderer(channel, data) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function isLinux() {
  return process.platform === 'linux';
}

/** Detect Linux distro from /etc/os-release */
function getLinuxDistro() {
  try {
    if (!fs.existsSync('/etc/os-release')) {
      return { distro: 'ubuntu-22.04', label: 'Linux' };
    }

    const content = fs.readFileSync('/etc/os-release', 'utf-8');
    const id = content.match(/^ID=(.*)$/m)?.[1]?.replace(/"/g, '') || '';
    const idLike = content.match(/^ID_LIKE=(.*)$/m)?.[1]?.replace(/"/g, '') || '';
    const prettyName = content.match(/^PRETTY_NAME=(.*)$/m)?.[1]?.replace(/"/g, '') || '';

    const isArch = ARCH_DISTROS.includes(id) || ARCH_DISTROS.some(d => idLike.includes(d));
    
    if (isArch) {
      logger.info(`Detected Arch-based distro: ${prettyName || id}`);
      return { distro: 'arch', label: prettyName || 'Arch Linux' };
    }

    logger.info(`Detected distro: ${prettyName || id} (using Ubuntu build)`);
    return { distro: 'ubuntu-22.04', label: prettyName || 'Ubuntu' };
  } catch (error) {
    logger.error('Failed to detect Linux distro:', error.message);
    return { distro: 'ubuntu-22.04', label: 'Linux' };
  }
}

function getDownloadUrl(version, distro) {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/Jobelix-${version}-${distro}.AppImage`;
}

async function showInstallDialog(version) {
  const result = await dialog.showMessageBox(getMainWindow(), {
    type: 'info',
    title: 'Update Ready',
    message: `Jobelix v${version} has been downloaded.`,
    detail: 'Would you like to install it now? The app will restart.',
    buttons: ['Install Now', 'Install Later'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (result.response === 0) {
    logger.info('User chose to install update now');
    autoUpdater.quitAndInstall();
  } else {
    logger.info('User chose to install update later');
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupUpdateEvents() {
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info(`Update available: v${info.version}`);
    
    if (isLinux()) {
      const { distro, label } = getLinuxDistro();
      const downloadUrl = getDownloadUrl(info.version, distro);
      logger.info(`Linux: Direct download URL: ${downloadUrl}`);
      
      sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        manualDownload: true,
        downloadUrl,
        distroLabel: label,
      });
    } else {
      sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        manualDownload: false,
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info(`App is up to date (v${info.version})`);
  });

  autoUpdater.on('download-progress', (progress) => {
    logger.debug(`Download progress: ${Math.round(progress.percent)}%`);
    sendToRenderer('update-download-progress', {
      bytesPerSecond: progress.bytesPerSecond,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.success(`Update v${info.version} downloaded`);
    sendToRenderer('update-downloaded', { version: info.version });
    showInstallDialog(info.version);
  });

  autoUpdater.on('error', (err) => {
    logger.error('Auto-updater error:', err.message);
    sendToRenderer('update-error', { message: err.message });
  });
}

// ============================================================================
// Public API
// ============================================================================

/** Initialize auto-updater (called after main window loads) */
export async function initAutoUpdater() {
  if (!app.isPackaged) {
    logger.info('Skipping auto-updater in development mode');
    return;
  }

  // Dynamic import to avoid slowing startup
  try {
    const pkg = await import('electron-updater');
    autoUpdater = pkg.default.autoUpdater;
    logger.debug('electron-updater loaded');
  } catch (err) {
    logger.error('Failed to load electron-updater:', err.message);
    return;
  }

  // Configure based on platform
  // Linux: Manual download (we have distro-specific builds)
  // Win/Mac: Auto-download and install
  autoUpdater.autoDownload = !isLinux();
  autoUpdater.autoInstallOnAppQuit = !isLinux();
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = logger.getLogger();

  if (isLinux()) {
    const { label, distro } = getLinuxDistro();
    logger.info(`Linux detected: ${label} (${distro}) - manual download mode`);
  }

  setupUpdateEvents();

  logger.info('Checking for updates...');
  autoUpdater.checkForUpdates().catch(err => {
    logger.error('Failed to check for updates:', err.message);
  });
}

/** Open URL in default browser */
export function openExternalUrl(url) {
  logger.info(`Opening: ${url}`);
  shell.openExternal(url);
}
