/**
 * Window Manager - Handles Electron window creation and lifecycle
 */

import { BrowserWindow, app, shell } from 'electron';
import path from 'path';
import { URLS, FILES, WINDOW_CONFIG, DIRECTORIES } from '../config/constants.js';
import { startLocalUiServer } from './local-ui-server.js';
import logger from '../utils/logger.js';

let mainWindowRef = null;
let onMainWindowReadyCallback = null;
const ENABLE_REMOTE_UI_FALLBACK = process.env.JOBELIX_ENABLE_REMOTE_UI_FALLBACK === '1';
const LOCAL_UI_PORT_MIN = 43100;
const LOCAL_UI_PORT_MAX = 43199;

/** Get the main window reference */
export function getMainWindow() {
  return mainWindowRef;
}

/** Register callback for when main window content loads (used for deferred operations) */
export function onMainWindowReady(callback) {
  onMainWindowReadyCallback = callback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadLocalUiErrorPage(window, reason) {
  const safeReason = escapeHtml(reason || 'Unknown error');
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jobelix - Local UI Unavailable</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      main {
        width: min(640px, 90vw);
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      }
      h1 { margin: 0 0 8px; font-size: 20px; }
      p { margin: 0 0 12px; line-height: 1.5; color: #cbd5e1; }
      code {
        display: block;
        margin: 8px 0 16px;
        padding: 10px 12px;
        border-radius: 8px;
        background: #111827;
        border: 1px solid rgba(148, 163, 184, 0.2);
        color: #e2e8f0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        white-space: pre-wrap;
      }
      button {
        border: 0;
        border-radius: 8px;
        padding: 10px 14px;
        font-weight: 600;
        cursor: pointer;
        background: #22c55e;
        color: #052e16;
      }
      button[disabled] { opacity: 0.7; cursor: not-allowed; }
      .status { margin-top: 10px; min-height: 22px; font-size: 14px; color: #94a3b8; }
    </style>
  </head>
  <body>
    <main>
      <h1>Local desktop UI failed to start</h1>
      <p>Jobelix uses a bundled local UI for faster startup and stable desktop behavior.</p>
      <p>Click retry to restart the local UI server:</p>
      <code>${safeReason}</code>
      <button id="retry-btn" type="button">Retry Local UI</button>
      <p class="status" id="status" aria-live="polite"></p>
    </main>
    <script>
      (() => {
        const retryBtn = document.getElementById('retry-btn');
        const status = document.getElementById('status');
        const setStatus = (message) => { status.textContent = message || ''; };

        retryBtn.addEventListener('click', async () => {
          const api = window.electronAPI;
          if (!api || typeof api.retryLocalUiServer !== 'function') {
            setStatus('Desktop bridge unavailable. Restart Jobelix.');
            return;
          }

          retryBtn.disabled = true;
          setStatus('Restarting local UI server...');
          try {
            const result = await api.retryLocalUiServer();
            if (result && result.success && result.url) {
              window.location.replace(result.url);
              return;
            }
            setStatus((result && result.error) ? result.error : 'Retry failed.');
          } catch (err) {
            setStatus(err && err.message ? err.message : 'Retry failed.');
          } finally {
            retryBtn.disabled = false;
          }
        });
      })();
    </script>
  </body>
</html>`;

  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  await window.loadURL(dataUrl);
}

async function tryLoadRemoteFallback(window, reason) {
  if (!ENABLE_REMOTE_UI_FALLBACK) {
    return false;
  }

  logger.warn(`Using remote UI fallback because: ${reason}`);
  try {
    await window.loadURL(URLS.PRODUCTION);
    return true;
  } catch (error) {
    logger.error(`Remote fallback load failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function isLoopbackHost(hostname) {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
}

function isAllowedLocalUiPort(port) {
  const parsed = Number.parseInt(port || '', 10);
  if (!Number.isFinite(parsed)) return false;
  return parsed >= LOCAL_UI_PORT_MIN && parsed <= LOCAL_UI_PORT_MAX;
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
    if (parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname) && isAllowedLocalUiPort(parsed.port)) {
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

/** Production: Load local loading screen, then navigate to local bundled UI. */
async function loadProductionContent(window, basePath, startTime) {
  const loadingPath = path.join(basePath, DIRECTORIES.BUILD, FILES.LOADING_HTML);
  
  // Load local loading screen for instant feedback
  await window.loadFile(loadingPath);
  logger.debug(`⏱️ Loading screen shown in ${Date.now() - startTime}ms`);
  
  // Setup handler for when app content loads
  window.webContents.once('did-finish-load', () => {
    const url = window.webContents.getURL();
    const isLocalUi = url.startsWith('http://127.0.0.1:');
    const isRemoteFallback = ENABLE_REMOTE_UI_FALLBACK && url.startsWith('https://');
    if (isLocalUi || isRemoteFallback) {
      logger.success(`App content loaded in ${Date.now() - startTime}ms`);
      triggerReadyCallback();
    }
  });
  
  window.webContents.once('did-fail-load', async (_, code, desc, url) => {
    if (url?.startsWith('http://127.0.0.1:')) {
      logger.error(`Failed to load local UI URL: ${desc} (code: ${code})`);
      const fallbackLoaded = await tryLoadRemoteFallback(window, `local UI load failure: ${desc} (code: ${code})`);
      if (!fallbackLoaded) {
        await loadLocalUiErrorPage(window, `Could not load local URL (${desc}, code ${code}).`);
      }
      return;
    }

    if (ENABLE_REMOTE_UI_FALLBACK && url?.startsWith('https://')) {
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
    await window.loadURL(localUiUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to start local bundled UI server: ${reason}`);
    const fallbackLoaded = await tryLoadRemoteFallback(window, `local UI startup failure: ${reason}`);
    if (!fallbackLoaded) {
      await loadLocalUiErrorPage(window, reason);
    }
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
