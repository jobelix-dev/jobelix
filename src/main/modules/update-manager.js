/**
 * Update Manager - Automatic Application Updates via electron-updater
 * 
 * ============================================================================
 * OVERVIEW
 * ============================================================================
 * This module handles automatic updates for the Jobelix Electron app.
 * It uses electron-updater which checks GitHub Releases for new versions.
 * 
 * ============================================================================
 * UPDATE FLOW (REVISED - NO SPLASH SCREEN)
 * ============================================================================
 * 1. App launches → main window shown immediately (startup is now fast)
 * 2. After content loads → initAutoUpdater() called (deferred)
 * 3. Checks GitHub releases for newer version
 * 4. If update available:
 *    - Windows/macOS: Auto-downloads, shows progress in UpdateNotification.tsx,
 *      then shows native dialog asking to install now or later
 *    - Linux: Detects distro (Arch/Ubuntu), shows notification with direct download link
 * 5. User chooses when to install (no forced restarts)
 * 
 * ============================================================================
 * IPC EVENTS SENT TO RENDERER
 * ============================================================================
 * - 'update-available'         → New version found (version, releaseNotes, manualDownload flag)
 * - 'update-download-progress' → Download progress (percent, bytesPerSecond, etc.)
 * - 'update-downloaded'        → Ready to install (version)
 * - 'update-error'             → Update failed (message)
 * 
 * ============================================================================
 * LINUX DISTRO DETECTION
 * ============================================================================
 * electron-updater doesn't differentiate between Linux distributions.
 * We build separate AppImages for Ubuntu and Arch.
 * 
 * Solution: Detect distro at runtime and provide direct download link:
 * - Reads /etc/os-release to detect Arch-based distros
 * - Constructs direct URL to correct AppImage
 * - Opens browser to download (user sees what they're getting)
 * 
 * ============================================================================
 * FILES INVOLVED
 * ============================================================================
 * - src/main/modules/update-manager.js   → This file (main process logic)
 * - app/components/UpdateNotification.tsx → React UI for update notifications
 * - preload.js                           → IPC bridge for update events
 * - lib/client/electronAPI.d.ts          → TypeScript types for electronAPI
 */

import { app, shell, dialog } from 'electron';
import fs from 'fs';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import logger from '../utils/logger.js';
import { getMainWindow } from './window-manager.js';

/**
 * GitHub repository info for releases
 */
const GITHUB_OWNER = 'jobelix-dev';
const GITHUB_REPO = 'jobelix-releases';

/**
 * GitHub releases page URL for manual download fallback
 */
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

/**
 * Send IPC event to main window's renderer process
 * Used to notify the React app about update status
 * 
 * @param {string} channel - IPC channel name (e.g., 'update-available')
 * @param {object} data - Data to send with the event
 */
function sendToMainWindow(channel, data) {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Check if running on Linux platform
 * @returns {boolean} True if running on Linux
 */
function isLinux() {
  return process.platform === 'linux';
}

/**
 * Detect Linux distribution type
 * Reads /etc/os-release to determine if running on Arch-based or Debian-based distro
 * 
 * @returns {{ distro: string, label: string }} Distro info for download URL construction
 *   - distro: 'arch' or 'ubuntu-22.04' (matches artifact naming)
 *   - label: Human-readable name for UI (e.g., 'Arch Linux', 'Ubuntu')
 */
function getLinuxDistro() {
  try {
    if (!fs.existsSync('/etc/os-release')) {
      logger.warn('Cannot detect Linux distro: /etc/os-release not found');
      return { distro: 'ubuntu-22.04', label: 'Linux' };
    }

    const content = fs.readFileSync('/etc/os-release', 'utf-8');
    const id = content.match(/^ID=(.*)$/m)?.[1]?.replace(/"/g, '') || '';
    const idLike = content.match(/^ID_LIKE=(.*)$/m)?.[1]?.replace(/"/g, '') || '';
    const prettyName = content.match(/^PRETTY_NAME=(.*)$/m)?.[1]?.replace(/"/g, '') || '';

    // Arch-based distributions
    const archDistros = ['arch', 'manjaro', 'endeavouros', 'garuda', 'arco', 'artix', 'cachyos'];
    const isArch = archDistros.includes(id) || archDistros.some(d => idLike.includes(d));

    if (isArch) {
      logger.info(`Detected Arch-based distro: ${prettyName || id}`);
      return { distro: 'arch', label: prettyName || 'Arch Linux' };
    }

    // Default to Ubuntu for Debian-based and others
    logger.info(`Detected distro: ${prettyName || id} (using Ubuntu build)`);
    return { distro: 'ubuntu-22.04', label: prettyName || 'Ubuntu' };

  } catch (error) {
    logger.error('Failed to detect Linux distro:', error.message);
    return { distro: 'ubuntu-22.04', label: 'Linux' };
  }
}

/**
 * Construct direct download URL for a specific version and distro
 * 
 * @param {string} version - Version number (e.g., '0.0.9')
 * @param {string} distro - Distro label (e.g., 'arch', 'ubuntu-22.04')
 * @returns {string} Direct download URL to the AppImage
 */
function getDirectDownloadUrl(version, distro) {
  // Artifact naming: Jobelix-{version}-{distro}.AppImage
  const filename = `Jobelix-${version}-${distro}.AppImage`;
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/${filename}`;
}

/**
 * Show dialog asking user whether to install update now or later
 * 
 * @param {string} version - The version that was downloaded
 */
async function showInstallDialog(version) {
  const mainWindow = getMainWindow();
  
  const result = await dialog.showMessageBox(mainWindow, {
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
    // User chose "Install Now"
    logger.info('User chose to install update now');
    autoUpdater.quitAndInstall();
  } else {
    // User chose "Install Later" - will install on next app quit
    logger.info('User chose to install update later (will install on quit)');
    // autoInstallOnAppQuit is already true, so it will install when user closes app
  }
}

/**
 * Initialize the auto-updater and begin checking for updates
 * 
 * CALLED AFTER main window content loads (deferred for faster perceived startup).
 * Only runs in packaged mode (skipped in development).
 * 
 * Flow:
 * 1. Configure autoUpdater settings based on platform
 * 2. Set up event handlers for update lifecycle
 * 3. Check GitHub releases for new version
 * 4. If update found: download (Win/Mac) or notify with direct link (Linux)
 * 5. After download: show dialog asking user to install now or later
 */
export function initAutoUpdater() {
  // Skip auto-updater in development mode (no packaged app to update)
  if (!app.isPackaged) {
    logger.info('Skipping auto-updater in development mode');
    return;
  }

  // ============================================================================
  // Configure auto-updater behavior based on platform
  // ============================================================================
  // 
  // Windows/macOS: Safe to auto-download and install
  // Linux: Disabled because we have distro-specific builds (Ubuntu/Arch)
  //        We detect distro and provide direct download link instead
  autoUpdater.autoDownload = !isLinux();
  autoUpdater.autoInstallOnAppQuit = !isLinux(); // Install on quit if user chooses "Later"
  autoUpdater.allowDowngrade = false; // Don't allow downgrading to older versions
  autoUpdater.logger = logger.getLogger();

  if (isLinux()) {
    const { distro, label } = getLinuxDistro();
    logger.info(`Linux detected: ${label} (${distro})`);
    logger.info('Auto-update disabled - will provide direct download link for correct distro');
  }

  // ============================================================================
  // Event Handlers - Update lifecycle events from electron-updater
  // ============================================================================

  /**
   * Event: Checking for updates
   * Triggered when autoUpdater.checkForUpdates() starts
   */
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
    // No splash screen - user sees main app while checking happens in background
  });

  /**
   * Event: Update available
   * Triggered when a newer version is found on GitHub releases
   * 
   * On Windows/macOS: Starts downloading automatically
   * On Linux: Detects distro and sends direct download link to renderer
   */
  autoUpdater.on('update-available', (info) => {
    logger.info(`Update available: v${info.version}`);
    
    if (isLinux()) {
      // ========================================================================
      // LINUX: Smart distro detection with direct download
      // ========================================================================
      const { distro, label } = getLinuxDistro();
      const directUrl = getDirectDownloadUrl(info.version, distro);
      
      logger.info(`Linux: Detected ${label}, direct download: ${directUrl}`);
      
      // Send notification to renderer immediately (window is already loaded)
      sendToMainWindow('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
        manualDownload: true,
        downloadUrl: directUrl, // Direct link to correct AppImage
        distroLabel: label,     // For UI: "Download for Arch Linux"
      });
    } else {
      // ========================================================================
      // WINDOWS/MACOS: Automatic download with progress
      // ========================================================================
      logger.info('Downloading update...');
      
      // Notify renderer to show progress UI
      sendToMainWindow('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
        manualDownload: false,
      });
    }
  });

  /**
   * Event: Update not available
   * Triggered when current version is already the latest
   */
  autoUpdater.on('update-not-available', (info) => {
    logger.info(`App is up to date (v${info.version})`);
    // No action needed - user doesn't need to know if already up to date
  });

  /**
   * Event: Download progress
   * Triggered periodically during update download (Windows/macOS only)
   * Sends progress to renderer for UpdateNotification component
   */
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    logger.debug(`Download progress: ${percent}%`);
    
    // Send to renderer for UpdateNotification progress bar
    sendToMainWindow('update-download-progress', {
      bytesPerSecond: progress.bytesPerSecond,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  /**
   * Event: Update downloaded
   * Triggered when download completes successfully
   * Shows dialog asking user to install now or later (no forced restart)
   */
  autoUpdater.on('update-downloaded', (info) => {
    logger.success(`Update v${info.version} downloaded.`);
    
    // Notify renderer
    sendToMainWindow('update-downloaded', {
      version: info.version,
    });
    
    // Show native dialog asking user to install now or later
    showInstallDialog(info.version);
  });

  /**
   * Event: Error
   * Triggered when update check or download fails
   * Non-blocking - app continues normally
   */
  autoUpdater.on('error', (err) => {
    logger.error('Auto-updater error:', err.message);
    
    // Notify renderer so they can show error toast
    sendToMainWindow('update-error', {
      message: err.message,
      error: err.toString(),
    });
  });

  // ============================================================================
  // Start the update check
  // ============================================================================
  logger.info('Checking GitHub releases for updates...');
  autoUpdater.checkForUpdates().catch((err) => {
    logger.error('Failed to check for updates:', err.message);
  });
}

/**
 * Open a URL in the user's default browser
 * Used for manual update download on Linux
 * 
 * @param {string} url - URL to open (can be direct download or releases page)
 */
export function openExternalUrl(url) {
  logger.info(`Opening external URL: ${url}`);
  shell.openExternal(url);
}

/**
 * Open the GitHub releases page in the user's default browser
 * Fallback if direct download URL fails
 * 
 * @deprecated Use openExternalUrl with direct download URL instead
 */
export function openReleasesPage() {
  shell.openExternal(RELEASES_URL);
}
