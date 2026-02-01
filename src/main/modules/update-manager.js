/**
 * Update Manager
 * Handles automatic updates using electron-updater
 * 
 * Flow:
 * 1. On app launch, check GitHub releases for newer version
 * 2. If update available, download it in background
 * 3. Install update when app restarts
 */

import { app } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import logger from '../utils/logger.js';

/**
 * Initialize auto-updater and check for updates
 * Call this once when app is ready (only in packaged mode)
 */
export function initAutoUpdater() {
  if (!app.isPackaged) {
    logger.info('Skipping auto-updater in development mode');
    return;
  }

  // Configure auto-updater
  autoUpdater.autoDownload = true;          // Download updates automatically
  autoUpdater.autoInstallOnAppQuit = true;  // Install when app quits
  autoUpdater.logger = logger.getLogger();

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    logger.info(`Update available: v${info.version}`);
    logger.info('Downloading update in background...');
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info(`App is up to date (v${info.version})`);
  });

  autoUpdater.on('download-progress', (progress) => {
    logger.debug(`Download progress: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.success(`Update v${info.version} downloaded. Will install on restart.`);
  });

  autoUpdater.on('error', (err) => {
    logger.error('Auto-updater error:', err.message);
  });

  // Check for updates
  logger.info('Checking GitHub releases for updates...');
  autoUpdater.checkForUpdates().catch((err) => {
    logger.error('Failed to check for updates:', err.message);
  });
}
