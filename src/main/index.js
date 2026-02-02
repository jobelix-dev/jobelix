/**
 * Jobelix - Electron Main Process Entry Point
 * Orchestrates all modules and manages application lifecycle
 */

// Load environment variables from .env.local (for Electron main process)
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { app } from 'electron';
import { setupIpcHandlers } from './modules/ipc-handlers.js';
import { createMainWindow } from './modules/window-manager.js';
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
  splashCreated: 0,
  mainWindowCreated: 0,
  autoUpdaterInit: 0,
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
    
    // Create main window and splash screen
    // Splash is returned so update-manager can show progress on it
    const { mainWindow: window, splash } = await createMainWindow();
    _mainWindow = window;
    logTiming('mainWindowCreated', 'Main window and splash created');
    
    // Initialize auto-updater (checks GitHub releases and downloads updates)
    // Pass splash window so it can display download progress to user
    initAutoUpdater(splash);
    logTiming('autoUpdaterInit', 'Auto-updater initialized');
    
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
