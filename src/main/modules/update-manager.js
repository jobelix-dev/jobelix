/**
 * Update Manager
 * Handles automatic updates using electron-updater
 * 
 * Flow:
 * 1. On app launch, check GitHub releases for newer version
 * 2. On Windows/macOS: Download and install automatically
 * 3. On Linux: Notify user of available update (don't auto-install due to distro variants)
 * 
 * Linux Note:
 * electron-updater doesn't differentiate between Linux distributions.
 * We build separate AppImages for Ubuntu and Arch, but the updater would
 * download whichever is in latest-linux.yml (typically Ubuntu).
 * To prevent installing the wrong binary, we disable auto-download on Linux
 * and show a notification directing users to download manually.
 */

import { app, shell } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import logger from '../utils/logger.js';
import { updateSplashStatus, getMainWindow, setUpdateInProgress } from './window-manager.js';

// GitHub releases page for manual download
const RELEASES_URL = 'https://github.com/jobelix-dev/jobelix-releases/releases/latest';

/**
 * Send update event to main window renderer process
 */
function sendToMainWindow(channel, data) {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Check if running on Linux
 */
function isLinux() {
  return process.platform === 'linux';
}

/**
 * Initialize auto-updater and check for updates
 * Call this once when app is ready (only in packaged mode)
 * 
 * @param {BrowserWindow} splashWindow - The splash window to send progress updates to
 */
export function initAutoUpdater(splashWindow) {
  if (!app.isPackaged) {
    logger.info('Skipping auto-updater in development mode');
    return;
  }

  // Configure auto-updater
  // On Linux: Don't auto-download (we have distro-specific builds)
  // On Windows/macOS: Auto-download is safe
  autoUpdater.autoDownload = !isLinux();
  autoUpdater.autoInstallOnAppQuit = !isLinux();
  autoUpdater.logger = logger.getLogger();

  if (isLinux()) {
    logger.info('Linux detected: Auto-update disabled (distro-specific builds)');
    logger.info('Users will be notified of updates and directed to download manually');
  }

  // Event handlers - update splash screen with progress
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
    updateSplashStatus(splashWindow, 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info(`Update available: v${info.version}`);
    
    if (isLinux()) {
      // On Linux: Don't download, just notify
      logger.info('Linux: Skipping auto-download, will notify user');
      updateSplashStatus(splashWindow, 'no-update'); // Continue loading app
      
      // Notify renderer after main window loads
      setTimeout(() => {
        sendToMainWindow('update-available', {
          version: info.version,
          releaseNotes: info.releaseNotes,
          releaseDate: info.releaseDate,
          manualDownload: true, // Flag to show "Download manually" UI
          downloadUrl: RELEASES_URL,
        });
      }, 3000); // Delay to ensure main window is ready
    } else {
      // On Windows/macOS: Download automatically
      // Mark update in progress to keep splash visible
      setUpdateInProgress(true);
      logger.info('Downloading update...');
      updateSplashStatus(splashWindow, 'available', info.version);
      
      sendToMainWindow('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
        manualDownload: false,
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info(`App is up to date (v${info.version})`);
    updateSplashStatus(splashWindow, 'no-update');
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    logger.debug(`Download progress: ${percent}%`);
    updateSplashStatus(splashWindow, 'downloading', percent);
    
    // Also notify main window renderer
    sendToMainWindow('update-download-progress', {
      bytesPerSecond: progress.bytesPerSecond,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.success(`Update v${info.version} downloaded. Will install on restart.`);
    updateSplashStatus(splashWindow, 'ready');
    
    // Also notify main window renderer
    sendToMainWindow('update-downloaded', {
      version: info.version,
    });
    
    // Give user a moment to see the "Installing..." message, then quit and install
    setTimeout(() => {
      logger.info('Quitting and installing update...');
      autoUpdater.quitAndInstall();
    }, 2000);
  });

  autoUpdater.on('error', (err) => {
    logger.error('Auto-updater error:', err.message);
    // On error, just continue loading the app normally
    updateSplashStatus(splashWindow, 'error');
    
    // Also notify main window renderer
    sendToMainWindow('update-error', {
      message: err.message,
      error: err.toString(),
    });
  });

  // Check for updates
  logger.info('Checking GitHub releases for updates...');
  autoUpdater.checkForUpdates().catch((err) => {
    logger.error('Failed to check for updates:', err.message);
    updateSplashStatus(splashWindow, 'error');
  });
}

/**
 * Open the releases page for manual download
 * Called from renderer when user clicks "Download Update" on Linux
 */
export function openReleasesPage() {
  shell.openExternal(RELEASES_URL);
}
