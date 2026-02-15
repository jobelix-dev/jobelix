/**
 * Jobelix - Electron Main Process Entry Point
 * 
 * Startup optimizations:
 * - GPU acceleration disabled (fixes 10-30s delay on some systems)
 * - Auto-updater deferred until after window loads
 * - Local loading screen for instant feedback
 * - Memory optimizations to reduce RAM footprint
 */

// CRITICAL: Must disable GPU before any other Electron imports
import { app } from 'electron';
app.disableHardwareAcceleration();

// Suppress GPU-related errors on Linux when hardware acceleration is disabled
// These SharedImageManager errors are harmless but noisy
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Memory optimization switches
// Reduce memory footprint by limiting caches and disabling unused features
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256 --optimize-for-size');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('disable-features', 'TranslateUI,BlinkGenPropertyTrees,MediaRouter');
app.commandLine.appendSwitch('disk-cache-size', '52428800'); // 50MB disk cache instead of default
app.commandLine.appendSwitch('media-cache-size', '10485760'); // 10MB media cache
app.commandLine.appendSwitch('disable-component-update'); // Disable background component updates
app.commandLine.appendSwitch('disable-domain-reliability'); // Disable domain reliability monitoring

// Single instance lock - prevents crashes from multiple app instances
// This is especially important during install when installer might launch the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running - exit silently
  app.quit();
}

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { setupIpcHandlers } from './modules/ipc-handlers.js';
import { createMainWindow, onMainWindowReady, getMainWindow } from './modules/window-manager.js';
import { initAutoUpdater } from './modules/update-manager.js';
import { logPlatformInfo, initializeDataDirectories, isMac } from './modules/platform-utils.js';
import { waitForNextJs } from './utils/dev-utils.js';
import logger from './utils/logger.js';

// Handle second instance - focus the existing window instead of crashing
app.on('second-instance', () => {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

const startTime = Date.now();
const elapsed = () => Date.now() - startTime;

async function initializeApp() {
  try {
    logger.info(`⏱️ [${elapsed()}ms] App ready, starting initialization`);
    
    // Clear all caches in dev mode to prevent stale chunk issues
    if (!app.isPackaged) {
      const { session } = await import('electron');
      logger.info('Development mode - clearing caches...');
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ['appcache', 'serviceworkers', 'cachestorage', 'websql', 'indexdb']
      });
      logger.success('Caches cleared');
    }
    
    setupIpcHandlers();
    logger.info(`⏱️ [${elapsed()}ms] IPC handlers registered`);
    
    initializeDataDirectories();
    logger.info(`⏱️ [${elapsed()}ms] Data directories initialized`);
    
    logPlatformInfo();
    
    // In dev mode, wait for Next.js server
    if (!app.isPackaged) {
      logger.info('Development mode - waiting for Next.js...');
      if (!await waitForNextJs()) {
        logger.error('Next.js not responding. Run: npm run dev');
        app.quit();
        return;
      }
      logger.success('Next.js ready');
    }
    
    // Defer auto-updater until after window content loads
    onMainWindowReady(() => {
      logger.info(`⏱️ [${elapsed()}ms] Content loaded, starting auto-updater`);
      initAutoUpdater();
    });
    
    await createMainWindow();
    logger.info(`⏱️ [${elapsed()}ms] Main window created`);
    
  } catch (error) {
    logger.error('Fatal error:', error);
    app.quit();
  }
}

// App lifecycle
app.whenReady().then(() => {
  logger.info('='.repeat(50));
  logger.info('Jobelix Starting');
  logger.info('='.repeat(50));
  initializeApp();
});

app.on('window-all-closed', () => {
  if (!isMac()) {
    app.quit();
  }
});

// Error handlers
process.on('uncaughtException', (err) => logger.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));

logger.info('Main process loaded');
