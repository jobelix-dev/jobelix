/**
 * Window Manager
 * Handles creation and management of all Electron windows
 */

import { BrowserWindow, app } from 'electron';
import path from 'path';
import { URLS, FILES, WINDOW_CONFIG, TIMING, DIRECTORIES } from '../config/constants.js';
import logger from '../utils/logger.js';

// Timeout for main window to load content (30 seconds)
const MAIN_WINDOW_LOAD_TIMEOUT_MS = 30000;

// Store reference to main window for IPC communication
let mainWindowRef = null;

// Track if update is being processed (download or install)
// When true, don't close splash even if main window loads
let updateInProgress = false;

/**
 * Get the main window reference
 * @returns {BrowserWindow|null} The main window or null if not created
 */
export function getMainWindow() {
  return mainWindowRef;
}

/**
 * Set update in progress flag
 * Called by update-manager when download starts
 * @param {boolean} inProgress 
 */
export function setUpdateInProgress(inProgress) {
  updateInProgress = inProgress;
  logger.debug(`Update in progress: ${inProgress}`);
}

/**
 * Check if update is in progress
 * @returns {boolean}
 */
export function isUpdateInProgress() {
  return updateInProgress;
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
 * Create a splash/loader window
 * Displays while the main application loads
 * @returns {BrowserWindow} The splash window instance
 */
export function createSplashWindow() {
  logger.info('Creating splash window...');
  
  const splash = new BrowserWindow({
    ...WINDOW_CONFIG.SPLASH,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  // Use app.getAppPath() for packaged app, process.cwd() for dev
  const basePath = app.isPackaged ? app.getAppPath() : process.cwd();
  const loaderPath = path.join(basePath, FILES.LOADER);
  splash.loadFile(loaderPath);
  
  logger.success('Splash window created');
  return splash;
}

/**
 * Send status update to splash window
 * @param {BrowserWindow} splash - The splash window
 * @param {string} stage - Status stage (checking, available, downloading, ready, loading, no-update, error)
 * @param {string|number} data - Additional data (version or progress percentage)
 */
export function updateSplashStatus(splash, stage, data = '') {
  if (splash && !splash.isDestroyed()) {
    try {
      const dataArg = typeof data === 'string' ? `'${data}'` : data;
      splash.webContents.executeJavaScript(`updateStatus('${stage}', ${dataArg})`);
    } catch (error) {
      logger.warn('Failed to update splash status:', error.message);
    }
  }
}

/**
 * Create the main application window
 * @returns {Promise<{mainWindow: BrowserWindow, splash: BrowserWindow}>} The main window and splash window instances
 */
export async function createMainWindow() {
  logger.info('Creating main window...');
  
  // Create splash screen
  const splash = createSplashWindow();

  // Create main window (hidden initially)
  // Use app.getAppPath() for packaged app, process.cwd() for dev
  const basePath = app.isPackaged ? app.getAppPath() : process.cwd();
  
  const mainWindow = new BrowserWindow({
    ...WINDOW_CONFIG.MAIN,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(basePath, FILES.PRELOAD),
    },
    icon: path.join(basePath, DIRECTORIES.BUILD, FILES.ICON)
  });

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

  // Track if splash has been closed
  let splashClosed = false;
  
  /**
   * Close splash and show main window
   * Called when main window content has loaded or timeout reached
   * Will NOT close splash if an update is being downloaded/installed
   */
  const showMainWindow = (reason) => {
    if (splashClosed) return;
    
    // Don't close splash during update - user should see progress
    if (updateInProgress) {
      logger.info(`Main window ready (${reason}), but update in progress - keeping splash visible`);
      return;
    }
    
    splashClosed = true;
    
    logger.info(`Showing main window (reason: ${reason})`);
    
    if (!splash.isDestroyed()) {
      splash.destroy();
    }
    
    mainWindow.maximize(); // Start maximized
    mainWindow.show();
  };

  // Wait for actual content to load (not just ready-to-show)
  // This ensures user doesn't see a blank white window
  mainWindow.webContents.once('did-finish-load', () => {
    logger.success('Main window content loaded');
    showMainWindow('content-loaded');
  });

  // Fallback timeout in case loading takes too long or fails
  // This prevents user from being stuck on splash forever
  setTimeout(() => {
    if (!splashClosed) {
      logger.warn(`Main window load timeout after ${MAIN_WINDOW_LOAD_TIMEOUT_MS}ms`);
      showMainWindow('timeout');
    }
  }, MAIN_WINDOW_LOAD_TIMEOUT_MS);

  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error(`Main window failed to load: ${errorDescription} (code: ${errorCode})`);
    // Don't immediately show - let the timeout handle it or retry logic could be added
  });

  logger.info(`Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl); // Don't await - let it load asynchronously

  logger.success('Main window created');
  
  // Return both windows so update-manager can access splash
  return { mainWindow, splash };
}

/**
 * Get the appropriate URL for the current environment
 * @returns {string} URL to load
 */
export function getStartUrl() {
  return app.isPackaged ? URLS.PRODUCTION : URLS.DEVELOPMENT;
}
