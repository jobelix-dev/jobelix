/**
 * Window Manager - Handles Electron window creation and lifecycle
 */

import { BrowserWindow, app, shell } from 'electron';
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


function isTrustedAppNavigationTarget(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol === 'about:') {
      return parsed.href === 'about:blank';
    }

    if (parsed.protocol === 'data:') {
      return true;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const developmentOrigin = new URL(URLS.DEVELOPMENT).origin;
    const productionOrigin = new URL(URLS.PRODUCTION).origin;

    if (parsed.origin === developmentOrigin) return true;
    if (parsed.origin === productionOrigin) return true;

    // Allow Supabase OAuth URLs to open in popups
    // This enables OAuth login flows (Google, LinkedIn, GitHub) to work in Electron
    if (parsed.hostname.endsWith('.supabase.co') && parsed.pathname.startsWith('/auth/v1/')) {
      return true;
    }

    // Allow OAuth provider domains (Google, GitHub, LinkedIn)
    const oauthProviders = [
      'accounts.google.com',
      'github.com',
      'www.linkedin.com'
    ];
    if (oauthProviders.includes(parsed.hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function canOpenExternally(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

function openExternalNavigationTarget(rawUrl) {
  if (!canOpenExternally(rawUrl)) {
    logger.warn(`Blocked navigation to unsupported external URL: ${rawUrl}`);
    return;
  }

  shell.openExternal(rawUrl).catch((error) => {
    logger.warn(`Failed opening external URL (${rawUrl}): ${error instanceof Error ? error.message : String(error)}`);
  });
}

/**
 * Create the main application window
 *
 * Production: Loads local loading.html instantly, then navigates to Vercel-hosted UI
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

  // Security hardening: keep trusted app origins in-window and push everything
  // else to the OS browser (or block unsupported schemes).
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedAppNavigationTarget(url)) {
      return { action: 'allow' };
    }

    logger.warn(`Blocked window.open to untrusted target: ${url}`);
    openExternalNavigationTarget(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isTrustedAppNavigationTarget(url)) {
      return;
    }

    event.preventDefault();
    logger.warn(`Blocked navigation to untrusted target: ${url}`);
    openExternalNavigationTarget(url);
  });

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

/** Production: Load local loading screen, then navigate to Vercel-hosted UI. */
async function loadProductionContent(window, basePath, startTime) {
  const loadingPath = path.join(basePath, DIRECTORIES.BUILD, FILES.LOADING_HTML);

  // Load local loading screen for instant feedback while network request starts
  await window.loadFile(loadingPath);
  logger.debug(`⏱️ Loading screen shown in ${Date.now() - startTime}ms`);

  window.webContents.once('did-finish-load', () => {
    logger.success(`App content loaded in ${Date.now() - startTime}ms`);
    triggerReadyCallback();
  });

  window.webContents.once('did-fail-load', (_, code, desc) => {
    logger.error(`Failed to load production URL: ${desc} (code: ${code})`);
    // Retry once after 3 seconds (handles brief network blips at startup)
    setTimeout(() => {
      logger.info(`Retrying: ${URLS.PRODUCTION}`);
      window.loadURL(URLS.PRODUCTION);
    }, 3000);
  });

  logger.info(`Navigating to: ${URLS.PRODUCTION}`);
  await window.loadURL(URLS.PRODUCTION);
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
