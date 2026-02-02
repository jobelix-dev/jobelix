/**
 * Window Manager - Handles Electron window creation and lifecycle
 */

import { BrowserWindow, app } from 'electron';
import path from 'path';
import { URLS, FILES, WINDOW_CONFIG, DIRECTORIES } from '../config/constants.js';
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
 * Production: Loads local loading.html instantly, then navigates to remote URL
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
    },
    icon: path.join(basePath, DIRECTORIES.BUILD, FILES.ICON)
  });

  mainWindowRef = mainWindow;
  mainWindow.on('closed', () => { mainWindowRef = null; });
  
  // Maximize immediately - this persists through page navigations
  mainWindow.maximize();

  // Show window once first paint is ready
  mainWindow.once('ready-to-show', () => {
    logger.debug(`⏱️ Window ready-to-show at ${Date.now() - startTime}ms`);
    mainWindow.show();
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

/** Production: Load local loading screen, then navigate to remote URL */
async function loadProductionContent(window, basePath, startTime) {
  const loadingPath = path.join(basePath, DIRECTORIES.BUILD, FILES.LOADING_HTML);
  
  // Load local loading screen for instant feedback
  await window.loadFile(loadingPath);
  logger.debug(`⏱️ Loading screen shown in ${Date.now() - startTime}ms`);
  
  // Setup handler for when remote content loads
  window.webContents.once('did-finish-load', () => {
    const url = window.webContents.getURL();
    if (url.startsWith('https://')) {
      logger.success(`Remote content loaded in ${Date.now() - startTime}ms`);
      triggerReadyCallback();
    }
  });
  
  window.webContents.once('did-fail-load', (_, code, desc, url) => {
    if (url?.startsWith('https://')) {
      logger.error(`Failed to load remote URL: ${desc} (code: ${code})`);
    }
  });
  
  // Navigate to remote URL (loading screen stays visible until this loads)
  logger.info(`Navigating to: ${URLS.PRODUCTION}`);
  window.loadURL(URLS.PRODUCTION);
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
