/**
 * Window Manager
 * Handles creation and management of all Electron windows
 * 
 * STARTUP OPTIMIZATION:
 * In production mode, we load a local loading.html first for instant feedback,
 * then navigate to the remote URL. This eliminates the blank white screen
 * while waiting for the remote server to respond.
 * 
 * The loading screen shows immediately (<100ms) while the remote content
 * loads in the background. The user sees:
 * 1. Instant: Loading screen with Jobelix branding and spinner
 * 2. 2-10s later: Actual app content from jobelix.fr
 */

import { BrowserWindow, app } from 'electron';
import path from 'path';
import { URLS, FILES, WINDOW_CONFIG, DIRECTORIES } from '../config/constants.js';
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
 * Create the main application window
 * 
 * STARTUP OPTIMIZATION (Production Mode):
 * 1. Load local loading.html immediately - shows within ~100ms
 * 2. User sees branded loading screen while remote content fetches
 * 3. Navigate to remote URL once loading screen is displayed
 * 4. Update check deferred until remote content loads
 * 
 * Development Mode:
 * - Waits for Next.js dev server, then loads localhost:3000
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
    // Set background color matching loading screen gradient start
    backgroundColor: '#667eea',
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

  // Show window as soon as the renderer is ready to paint
  mainWindow.once('ready-to-show', () => {
    logger.debug(`⏱️ Window ready-to-show at ${Date.now() - createStartTime}ms`);
    mainWindow.maximize();
    mainWindow.show();
    logger.success('Main window visible');
  });

  if (app.isPackaged) {
    // =========================================================================
    // PRODUCTION MODE: Load local loading screen first, then remote URL
    // =========================================================================
    const loadingHtmlPath = path.join(basePath, DIRECTORIES.BUILD, FILES.LOADING_HTML);
    logger.info(`Loading local loading screen: ${loadingHtmlPath}`);
    
    // Load the local loading.html for instant visual feedback
    await mainWindow.loadFile(loadingHtmlPath);
    logger.debug(`⏱️ Loading screen shown in ${Date.now() - createStartTime}ms`);
    
    // Now navigate to the remote URL
    // The loading screen has a fallback that redirects after 500ms,
    // but we also trigger it from here for reliability
    logger.info(`Navigating to remote URL: ${URLS.PRODUCTION}`);
    
    // Track when remote content fully loads
    mainWindow.webContents.once('did-finish-load', () => {
      // Only trigger callback when we've loaded the remote URL (not the loading screen)
      const currentUrl = mainWindow.webContents.getURL();
      if (currentUrl.startsWith('https://') || currentUrl.startsWith('http://localhost')) {
        const loadTime = Date.now() - createStartTime;
        logger.success(`Remote content loaded in ${loadTime}ms`);
        
        // Trigger deferred callbacks (e.g., update check)
        if (onMainWindowReadyCallback) {
          logger.debug('Triggering onMainWindowReady callback');
          onMainWindowReadyCallback();
          onMainWindowReadyCallback = null;
        }
      }
    });
    
    // Handle remote load failures
    mainWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      // Only handle failures for the remote URL, not the loading screen
      if (validatedURL && validatedURL.startsWith('https://')) {
        logger.error(`Failed to load remote URL: ${errorDescription} (code: ${errorCode})`);
        // The loading screen has error handling built-in with retry button
      }
    });
    
    // Navigate to remote URL
    mainWindow.loadURL(URLS.PRODUCTION);
    
  } else {
    // =========================================================================
    // DEVELOPMENT MODE: Load localhost directly
    // =========================================================================
    // Note: index.js already waits for Next.js to be ready before calling createMainWindow
    
    // When content loads in dev mode, trigger deferred callbacks
    mainWindow.webContents.once('did-finish-load', () => {
      const loadTime = Date.now() - createStartTime;
      logger.success(`Development content loaded in ${loadTime}ms`);
      
      if (onMainWindowReadyCallback) {
        logger.debug('Triggering onMainWindowReady callback');
        onMainWindowReadyCallback();
        onMainWindowReadyCallback = null;
      }
    });

    // Handle load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error(`Main window failed to load: ${errorDescription} (code: ${errorCode})`);
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
    });
    
    logger.info(`Loading URL: ${URLS.DEVELOPMENT}`);
    mainWindow.loadURL(URLS.DEVELOPMENT);
  }

  logger.success('Main window created');
  
  return mainWindow;
}

// ============================================================================
// ARCHITECTURE NOTES
// ============================================================================
// 
// Production Mode Startup Flow:
// 1. Window created with purple background (#667eea)
// 2. Local loading.html loaded instantly (<100ms)
// 3. Window shown to user with loading animation
// 4. Navigate to https://www.jobelix.fr (2-10s depending on network)
// 5. When remote content loads, trigger update check
//
// The loading screen provides:
// - Instant visual feedback (no white screen)
// - Branded experience while waiting
// - Error handling with retry button for network issues
// - Status messages that update during loading
//
// Previous: Splash screen functionality removed (commit 75db261)
// Reason: APPIMAGE_EXTRACT_AND_RUN makes extraction fast, but network
//         loading of remote URL still takes time. Loading screen replaces
//         splash screen with a simpler, more reliable solution.
// ============================================================================
