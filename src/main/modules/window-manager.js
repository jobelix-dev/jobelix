/**
 * Window Manager - Handles Electron window creation and lifecycle
 */

import { BrowserWindow, app } from 'electron';
import path from 'path';
import { URLS, FILES, WINDOW_CONFIG, DIRECTORIES } from '../config/constants.js';
import { startLocalUiServer } from './local-ui-server.js';
import logger from '../utils/logger.js';

let mainWindowRef = null;
let onMainWindowReadyCallback = null;

/** Get the main window reference */
export function getMainWindow() {
  return mainWindowRef;
}

/** Register callback for when main window content loads (used for deferred operations) */
export function onMainWindowReady(callback) {
  onMainWindowReadyCallback = callback;
}

/**
 * Create the main application window
 * 
 * Production: Loads local loading.html instantly, then navigates to local bundled UI
 * Development: Loads localhost:3000 directly (index.js waits for Next.js first)
 */
export async function createMainWindow() {
  const startTime = Date.now();
  logger.info('Creating main window...');
  
  const basePath = app.isPackaged ? app.getAppPath() : process.cwd();
  
  const mainWindow = new BrowserWindow({
    ...WINDOW_CONFIG.MAIN,
    show: false,
    backgroundColor: '#667eea',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(basePath, FILES.PRELOAD),
      // Memory optimization settings
      spellcheck: false, // Disable spellcheck to save memory
      enableWebSQL: false, // Disable deprecated WebSQL
      backgroundThrottling: true, // Throttle background tabs
      v8CacheOptions: 'bypassHeatCheck', // Optimize V8 code caching
    },
    icon: path.join(basePath, DIRECTORIES.BUILD, FILES.ICON)
  });

  mainWindowRef = mainWindow;
  mainWindow.on('closed', () => { mainWindowRef = null; });

  // Show and maximize window once first paint is ready
  // Note: maximize() must be called AFTER show() on Windows to avoid a visual
  // glitch where the window briefly flashes at its un-maximized size
  mainWindow.once('ready-to-show', () => {
    logger.debug(`⏱️ Window ready-to-show at ${Date.now() - startTime}ms`);
    mainWindow.show();
    mainWindow.maximize();
    logger.success('Main window visible');
  });

  if (app.isPackaged) {
    await loadProductionContent(mainWindow, basePath, startTime);
  } else {
    loadDevelopmentContent(mainWindow, startTime);
  }

  logger.debug(`⏱️ Window setup complete in ${Date.now() - startTime}ms`);
  return mainWindow;
}

/** Production: Load local loading screen, then navigate to local bundled UI (fallback: remote URL) */
async function loadProductionContent(window, basePath, startTime) {
  const loadingPath = path.join(basePath, DIRECTORIES.BUILD, FILES.LOADING_HTML);
  
  // Load local loading screen for instant feedback
  await window.loadFile(loadingPath);
  logger.debug(`⏱️ Loading screen shown in ${Date.now() - startTime}ms`);
  
  // Setup handler for when app content loads
  window.webContents.once('did-finish-load', () => {
    const url = window.webContents.getURL();
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('https://')) {
      logger.success(`App content loaded in ${Date.now() - startTime}ms`);
      triggerReadyCallback();
    }
  });
  
  window.webContents.once('did-fail-load', (_, code, desc, url) => {
    if (url?.startsWith('http://127.0.0.1:')) {
      logger.error(`Failed to load local UI URL: ${desc} (code: ${code})`);
      logger.info('Falling back to remote URL...');
      window.loadURL(URLS.PRODUCTION);
      return;
    }

    if (url?.startsWith('https://')) {
      logger.error(`Failed to load fallback remote URL: ${desc} (code: ${code})`);
      logger.info('Retrying fallback remote URL in 3 seconds...');
      setTimeout(() => {
        logger.info(`Retry navigating to: ${URLS.PRODUCTION}`);
        window.loadURL(URLS.PRODUCTION);
      }, 3000);
    }
  });

  try {
    const localUiUrl = await startLocalUiServer();
    logger.info(`Navigating to local bundled UI: ${localUiUrl}`);
    window.loadURL(localUiUrl);
  } catch (error) {
    logger.error(`Failed to start local bundled UI server: ${error instanceof Error ? error.message : String(error)}`);
    logger.info(`Falling back to remote URL: ${URLS.PRODUCTION}`);
    window.loadURL(URLS.PRODUCTION);
  }
}

/** Development: Load localhost directly */
function loadDevelopmentContent(window, startTime) {
  window.webContents.once('did-finish-load', () => {
    logger.success(`Dev content loaded in ${Date.now() - startTime}ms`);
    triggerReadyCallback();
  });

  window.webContents.on('did-fail-load', (_, code, desc) => {
    logger.error(`Failed to load: ${desc} (code: ${code})`);
    if (!window.isVisible()) window.show();
  });
  
  logger.info(`Loading: ${URLS.DEVELOPMENT}`);
  window.loadURL(URLS.DEVELOPMENT);
}

/** Trigger the ready callback (for deferred operations like update check) */
function triggerReadyCallback() {
  if (onMainWindowReadyCallback) {
    logger.debug('Triggering onMainWindowReady callback');
    onMainWindowReadyCallback();
    onMainWindowReadyCallback = null;
  }
}
