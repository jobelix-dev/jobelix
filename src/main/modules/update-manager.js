/**
 * Update Manager
 * Handles automatic updates using electron-updater and update UI
 */

import { app, shell, dialog } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { createUpdateWindow } from './window-manager.js';
import { IPC_CHANNELS, TIMING } from '../config/constants.js';
import logger from '../utils/logger.js';

let isUpdateDownloaded = false;
let updateWindow = null;

/**
 * Configure electron-updater settings
 */
export function setupAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = false; // Don't auto-download, ask user first
  autoUpdater.autoInstallOnAppQuit = true; // Auto-install when app quits
  
  // Set logger
  autoUpdater.logger = logger.getLogger();
  
  logger.info('Auto-updater configured');
  
  // Check for updates (will use GitHub releases based on package.json config)
  if (app.isPackaged) {
    logger.info('Checking for updates from GitHub releases...');
    autoUpdater.checkForUpdates();
  }
}

/**
 * Setup auto-updater event listeners for seamless background updates
 */
export function setupAutoUpdaterListeners() {
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('Update available:', info.version);
    
    // Auto-download the update
    logger.info('Downloading update...');
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('Update not available. Current version is', info.version);
  });

  autoUpdater.on('error', (err) => {
    logger.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    logger.debug(logMessage);
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.success('Update downloaded. Version:', info.version);
    // Install update on next restart (or immediately if user confirms)
    // autoUpdater.quitAndInstall(); // Uncomment to force immediate restart
  });
}

/**
 * Show update required window with auto-updater integration
 * Blocks app launch until update is installed or user quits
 * @param {Object} details - Version check details
 * @returns {BrowserWindow} Update window instance
 */
export function showUpdateRequiredWindow(details) {
  logger.info('Showing update required window');
  
  updateWindow = createUpdateWindow(details);
  
  // Open external links in browser
  updateWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Setup close handler with update awareness
  updateWindow.on('close', (e) => {
    logger.debug(`Close handler triggered. isUpdateDownloaded: ${isUpdateDownloaded}, isPackaged: ${app.isPackaged}`);
    
    if (isUpdateDownloaded) {
      // Update is ready - quit and install
      logger.info('Installing update and quitting...');
      autoUpdater.quitAndInstall(false, true);
    } else if (app.isPackaged) {
      // Still downloading - confirm with user (only in packaged mode)
      e.preventDefault();
      
      dialog.showMessageBox(updateWindow, {
        type: 'warning',
        buttons: ['Cancel Download & Quit', 'Continue Download'],
        defaultId: 1,
        title: 'Update in Progress',
        message: 'An update is being downloaded.',
        detail: 'If you quit now, you\'ll need to download it again next time. Continue?'
      }).then(result => {
        if (result.response === 0) {
          // User chose to quit
          logger.info('User chose to quit during update');
          isUpdateDownloaded = false;
          app.quit();
        } else {
          logger.info('User chose to continue download');
        }
      }).catch(err => {
        logger.error('Dialog error:', err);
        app.quit(); // Fallback: just quit if dialog fails
      });
    } else {
      // Development mode or auto-updater not active - allow closing
      logger.info('Allowing close (dev mode or no auto-updater)');
      app.quit();
    }
  });

  // If in packaged mode, use autoUpdater to download and install
  if (app.isPackaged) {
    logger.info('Starting automatic update download...');
    
    // Setup listeners specifically for required update
    autoUpdater.on('update-available', (info) => {
      logger.info('Required update available:', info.version);
      updateWindow.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE, {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      });
      autoUpdater.downloadUpdate();
    });

    autoUpdater.on('download-progress', (progressObj) => {
      updateWindow.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOAD_PROGRESS, progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      logger.success('Required update downloaded. Installing...');
      isUpdateDownloaded = true;
      updateWindow.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED, {
        version: info.version
      });
      
      // Wait 2 seconds then force install
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true);
      }, TIMING.AUTO_INSTALL_DELAY_MS);
    });

    autoUpdater.on('error', (err) => {
      logger.error('Auto-updater error:', err);
      // Fallback to manual download if auto-update fails
      updateWindow.webContents.send(IPC_CHANNELS.UPDATE_ERROR, {
        message: 'Automatic update failed. Please download manually.',
        error: err.message
      });
    });

    // Start checking for updates
    autoUpdater.checkForUpdates();
  }

  return updateWindow;
}

/**
 * Get update manager state
 * @returns {{isUpdateDownloaded: boolean}}
 */
export function getUpdateState() {
  return {
    isUpdateDownloaded
  };
}
