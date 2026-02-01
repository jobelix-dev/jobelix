/**
 * Update Manager
 * Handles automatic updates using electron-updater
 * 
 * Flow:
 * 1. On app launch, check GitHub releases for newer version
 * 2. If update available, download it in background (with progress shown to user)
 * 3. Install update when app restarts
 */

import { app } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import logger from '../utils/logger.js';
import { updateSplashStatus, getMainWindow } from './window-manager.js';

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
  autoUpdater.autoDownload = true;          // Download updates automatically
  autoUpdater.autoInstallOnAppQuit = true;  // Install when app quits
  autoUpdater.logger = logger.getLogger();

  // Event handlers - update splash screen with progress
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
    updateSplashStatus(splashWindow, 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info(`Update available: v${info.version}`);
    logger.info('Downloading update...');
    updateSplashStatus(splashWindow, 'available', info.version);
    
    // Also notify main window renderer
    sendToMainWindow('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });
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
