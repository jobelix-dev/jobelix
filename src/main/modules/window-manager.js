/**
 * Window Manager
 * Handles creation and management of all Electron windows
 * 
 * PERFORMANCE NOTE:
 * With the APPIMAGE_EXTRACT_AND_RUN optimization on Linux, startup is now
 * ~100ms instead of ~50 seconds. We no longer need a splash screen - the
 * main window shows immediately with a brief loading state while content loads.
 */

import { BrowserWindow, app } from 'electron';
import path from 'path';
import { URLS, FILES, WINDOW_CONFIG, TIMING, DIRECTORIES } from '../config/constants.js';
import logger from '../utils/logger.js';

// Store reference to main window for IPC communication
let mainWindowRef = null;

// Callback to be called when main window is ready (for deferred operations like update check)
let onMainWindowReadyCallback = null;

/**
 * Get the main window reference
 * @returns {BrowserWindow|null} The main window or null if not created
 */
export function getMainWindow() {
  return mainWindowRef;
}

/**
 * Set a callback to be called when main window content has loaded
 * Used by update-manager to defer update checks until after window is visible
 * @param {Function} callback 
 */
export function onMainWindowReady(callback) {
  onMainWindowReadyCallback = callback;
}

/**
 * Wait for Next.js development server to be ready
 * Polls the server until it responds or max attempts reached
 * @param {string} url - URL to check
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<boolean>} True if server is ready, false otherwise
 */
async function waitForNextJs(
  url, 
  maxAttempts = TIMING.NEXT_JS_WAIT.MAX_ATTEMPTS, 
  delayMs = TIMING.NEXT_JS_WAIT.DELAY_MS
) {
  logger.info(`Waiting for Next.js server at ${url}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        logger.success(`Next.js is ready after ${i * delayMs}ms`);
        return true;
      }
    } catch (_err) {
      logger.debug(`Waiting for Next.js... (attempt ${i + 1}/${maxAttempts})`);
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  logger.error('Next.js failed to start in time');
  return false;
}

/**
 * Create the main application window
 * 
 * CHANGES FROM PREVIOUS VERSION:
 * - No splash screen - main window shows immediately (startup is now fast)
 * - Window shown right away with background color as brief loading state
 * - Content loads asynchronously while user sees the window
 * - Update check is deferred until after content loads (via onMainWindowReady callback)
 * 
 * @returns {Promise<BrowserWindow>} The main window instance
 */
export async function createMainWindow() {
  const createStartTime = Date.now();
  logger.info('Creating main window...');
  
  // Use app.getAppPath() for packaged app, process.cwd() for dev
  const basePath = app.isPackaged ? app.getAppPath() : process.cwd();
  
  const mainWindow = new BrowserWindow({
    ...WINDOW_CONFIG.MAIN,
    show: false, // Initially hidden, show after ready-to-show
    // Set background color matching app theme - user sees this while content loads
    backgroundColor: '#f8fafc',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(basePath, FILES.PRELOAD),
    },
    icon: path.join(basePath, DIRECTORIES.BUILD, FILES.ICON)
  });

  logger.debug(`⏱️ BrowserWindow created in ${Date.now() - createStartTime}ms`);

  // Store reference for IPC communication
  mainWindowRef = mainWindow;
  
  // Clear reference when window is closed
  mainWindow.on('closed', () => {
    mainWindowRef = null;
  });

  // Determine URL based on environment
  const startUrl = app.isPackaged 
    ? URLS.PRODUCTION
    : URLS.DEVELOPMENT;

  // Wait for Next.js in development mode
  if (!app.isPackaged) {
    logger.info('Development mode: Waiting for Next.js server...');
    const isReady = await waitForNextJs(startUrl);
    
    if (!isReady) {
      logger.error('Next.js server did not start in time. Starting app anyway...');
    }
  }

  // Show window as soon as the renderer is ready to paint
  // This provides fast perceived startup - user sees window immediately
  mainWindow.once('ready-to-show', () => {
    logger.debug(`⏱️ Window ready-to-show at ${Date.now() - createStartTime}ms`);
    mainWindow.maximize();
    mainWindow.show();
    logger.success('Main window visible');
  });

  // When content fully loads, trigger deferred operations (like update check)
  mainWindow.webContents.once('did-finish-load', () => {
    const loadTime = Date.now() - createStartTime;
    logger.success(`Main window content loaded in ${loadTime}ms`);
    
    // Trigger any deferred callbacks (e.g., update check)
    if (onMainWindowReadyCallback) {
      logger.debug('Triggering onMainWindowReady callback');
      onMainWindowReadyCallback();
      onMainWindowReadyCallback = null;
    }
  });

  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(`Main window failed to load: ${errorDescription} (code: ${errorCode})`);
    // Still show the window so user isn't stuck
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });

  logger.info(`Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  logger.success('Main window created');
  
  return mainWindow;
}

/**
 * Get the appropriate URL for the current environment
 * @returns {string} URL to load
 */
export function getStartUrl() {
  return app.isPackaged ? URLS.PRODUCTION : URLS.DEVELOPMENT;
}

// ============================================================================
// REMOVED: Splash screen functionality
// ============================================================================
// The following functions have been removed because startup is now fast
// (~100ms with APPIMAGE_EXTRACT_AND_RUN) and splash screen is no longer needed:
//
// - createSplashWindow() - No longer used
// - updateSplashStatus() - No longer used  
// - setUpdateInProgress() - No longer needed (no splash to keep visible)
// - isUpdateInProgress() - No longer needed
//
// Update progress is now shown entirely through UpdateNotification.tsx in the
// main window's renderer process.
// ============================================================================
