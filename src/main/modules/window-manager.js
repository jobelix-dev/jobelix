/**
 * Window Manager
 * Handles creation and management of all Electron windows
 */

import { BrowserWindow, app } from 'electron';
import path from 'path';
import { URLS, FILES, WINDOW_CONFIG, TIMING, DIRECTORIES } from '../config/constants.js';
import logger from '../utils/logger.js';

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
    } catch (err) {
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
  
  const splash = new BrowserWindow(WINDOW_CONFIG.SPLASH);
  
  // Use app.getAppPath() for packaged app, process.cwd() for dev
  const basePath = app.isPackaged ? app.getAppPath() : process.cwd();
  const loaderPath = path.join(basePath, FILES.LOADER);
  splash.loadFile(loaderPath);
  
  logger.success('Splash window created');
  return splash;
}

/**
 * Create the main application window
 * @returns {Promise<BrowserWindow>} The main window instance
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

  // Show main window and destroy splash when ready
  // IMPORTANT: Set up event handler BEFORE loading URL
  mainWindow.once('ready-to-show', () => {
    logger.success('Main window ready to show');
    splash.destroy();
    mainWindow.maximize(); // Start maximized
    mainWindow.show();
  });

  logger.info(`Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl); // Don't await - let it load asynchronously

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
