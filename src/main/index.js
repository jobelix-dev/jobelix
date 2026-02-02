/**
 * Jobelix - Electron Main Process Entry Point
 * Orchestrates all modules and manages application lifecycle
 * 
 * STARTUP OPTIMIZATION:
 * With APPIMAGE_EXTRACT_AND_RUN on Linux, startup is now ~100ms instead of ~50s.
 * We no longer use a splash screen - the main window shows immediately.
 * Auto-update check is deferred until after the main window content loads.
 */

// Load environment variables from .env.local (for Electron main process)
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { app } from 'electron';
import { setupIpcHandlers } from './modules/ipc-handlers.js';
import { createMainWindow, onMainWindowReady } from './modules/window-manager.js';
import { initAutoUpdater } from './modules/update-manager.js';
import { logPlatformInfo, initializeDataDirectories, isMac } from './modules/platform-utils.js';
import { waitForNextJs } from './utils/dev-utils.js';
import logger from './utils/logger.js';

// Store reference to main window
let _mainWindow = null;

// Startup timing for performance debugging
const startupTimings = {
  processStart: Date.now(),
  appReady: 0,
  ipcSetup: 0,
  dataDirs: 0,
  mainWindowCreated: 0,
  mainContentLoaded: 0,
};

/**
 * Log startup timing milestone
 */
function logTiming(milestone, label) {
  startupTimings[milestone] = Date.now();
  const elapsed = startupTimings[milestone] - startupTimings.processStart;
  logger.info(`⏱️ [${elapsed}ms] ${label}`);
}

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    logTiming('appReady', 'App ready, starting initialization');
    
    // Setup IPC handlers first
    setupIpcHandlers();
    logTiming('ipcSetup', 'IPC handlers registered');
    
    // Initialize data directories (cross-platform userData folder)
    initializeDataDirectories();
    logTiming('dataDirs', 'Data directories initialized');
    
    // Log platform information for debugging
    logPlatformInfo();
    
    // In development mode, wait for Next.js to be ready before proceeding
    if (!app.isPackaged) {
      logger.info('Development mode detected - waiting for Next.js server...');
      const isNextReady = await waitForNextJs();
      
      if (!isNextReady) {
        logger.error('Next.js server is not responding. Please ensure Next.js is running:');
        logger.error('  Run: npm start (in another terminal)');
        logger.error('  Or: npm run dev (to start both Next.js and Electron together)');
        app.quit();
        return;
      }
      
      logger.success('Next.js server is ready - proceeding with app initialization');
    }
    
    // Register callback for when main window content loads
    // This defers non-critical operations (like update check) until after window is visible
    onMainWindowReady(() => {
      logTiming('mainContentLoaded', 'Main window content loaded, starting deferred operations');
      
      // Initialize auto-updater AFTER window is visible
      // This ensures user sees the app immediately, update check happens in background
      initAutoUpdater();
      logger.info('Auto-updater initialized (deferred)');
    });
    
    // Create main window (no splash screen - startup is now fast)
    _mainWindow = await createMainWindow();
    logTiming('mainWindowCreated', 'Main window created');
    
    // Log timing summary
    logger.info('='.repeat(50));
    logger.info('STARTUP TIMING SUMMARY');
    logger.info('='.repeat(50));
    logger.info(`Total time to window creation: ${startupTimings.mainWindowCreated - startupTimings.processStart}ms`);
    logger.info('='.repeat(50));
    
  } catch (error) {
    logger.error('Fatal error during app initialization:', error);
    app.quit();
  }
}

/**
 * App lifecycle event handlers
 */

// When Electron is ready, initialize the app
app.whenReady().then(() => {
  logger.info('='.repeat(60));
  logger.info('Jobelix Application Starting');
  logger.info('='.repeat(60));
  
  initializeApp();
});

// Before app quits, clean up processes
app.on('will-quit', () => {
  logger.info('Application shutting down...');
  logger.info('Cleanup complete');
});

// When all windows are closed
app.on('window-all-closed', () => {
  // On macOS, apps typically stay open until explicitly quit
  if (!isMac()) {
    logger.info('All windows closed - quitting application');
    app.quit();
  } else {
    logger.info('All windows closed - keeping app running (macOS)');
  }
});

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

logger.info('Main process module loaded');
