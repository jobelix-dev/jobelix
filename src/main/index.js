/**
 * Jobelix - Electron Main Process Entry Point
 * 
 * Startup optimizations:
 * - GPU acceleration disabled (fixes 10-30s delay on some systems)
 * - Auto-updater deferred until after window loads
 * - Local loading screen for instant feedback
 * - Memory optimizations to reduce RAM footprint
 */

// CRITICAL: Must configure GPU before any other Electron imports
import { app } from 'electron';

// GPU acceleration: only disable on Linux where driver issues are common
// On Windows/macOS, GPU compositing is essential for smooth scrolling,
// CSS animations, and canvas rendering. Disabling it forces everything
// to CPU, making the app noticeably slower.
// Users can force-disable via env var: JOBELIX_DISABLE_GPU=1
if (process.platform === 'linux' || process.env.JOBELIX_DISABLE_GPU) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
}

// Memory optimization switches
// 512MB heap limit is sufficient for memory control without sacrificing JS execution speed
// Note: --optimize-for-size was removed — it causes 5-15% slower JS execution by
// disabling JIT optimizations, which is not worth the marginal memory savings
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-translate');
app.commandLine.appendSwitch('disable-features', 'TranslateUI,MediaRouter');
app.commandLine.appendSwitch('disk-cache-size', '52428800'); // 50MB disk cache instead of default
app.commandLine.appendSwitch('media-cache-size', '10485760'); // 10MB media cache
app.commandLine.appendSwitch('disable-component-update'); // Disable background component updates
app.commandLine.appendSwitch('disable-domain-reliability'); // Disable domain reliability monitoring

// Single instance lock - prevents crashes from multiple app instances
// This is especially important during install when installer might launch the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running - exit immediately
  // process.exit() is needed because app.quit() is async and the rest of the
  // module would continue executing (imports, event handlers, etc.)
  app.quit();
  process.exit(0);
}

// Only load .env.local in development mode
// In production, CWD is unpredictable on Windows (often C:\Windows\System32)
import * as dotenv from 'dotenv';
if (!app.isPackaged) {
  dotenv.config({ path: '.env.local' });
}

import { setupIpcHandlers } from './modules/ipc-handlers.js';
import { createMainWindow, onMainWindowReady, getMainWindow } from './modules/window-manager.js';
import { stopLocalUiServer } from './modules/local-ui-server.js';
import { initAutoUpdater } from './modules/update-manager.js';
import { logPlatformInfo, initializeDataDirectories, isMac } from './modules/platform-utils.js';
import { waitForNextJs } from './utils/dev-utils.js';
import logger from './utils/logger.js';

// Handle second instance - focus the existing window instead of crashing
app.on('second-instance', () => {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

const startTime = Date.now();
const elapsed = () => Date.now() - startTime;
const AUTO_UPDATER_DELAY_MS = 10000;

async function initializeApp() {
  try {
    logger.info(`⏱️ [${elapsed()}ms] App ready, starting initialization`);
    
    // Clear all caches in dev mode to prevent stale chunk issues
    if (!app.isPackaged) {
      const { session } = await import('electron');
      logger.info('Development mode - clearing caches...');
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ['appcache', 'serviceworkers', 'cachestorage', 'websql', 'indexdb']
      });
      logger.success('Caches cleared');
    }
    
    setupIpcHandlers();
    logger.info(`⏱️ [${elapsed()}ms] IPC handlers registered`);
    
    await initializeDataDirectories();
    logger.info(`⏱️ [${elapsed()}ms] Data directories initialized`);
    
    logPlatformInfo();
    
    // In dev mode, wait for Next.js server
    if (!app.isPackaged) {
      logger.info('Development mode - waiting for Next.js...');
      if (!await waitForNextJs()) {
        logger.error('Next.js not responding. Run: npm run dev');
        app.quit();
        return;
      }
      logger.success('Next.js ready');
    }
    
    // Defer auto-updater until after window content loads and startup settles.
    // This avoids competing for CPU/network during first paint.
    onMainWindowReady(() => {
      logger.info(
        `⏱️ [${elapsed()}ms] Content loaded, scheduling auto-updater in ${AUTO_UPDATER_DELAY_MS}ms`
      );
      setTimeout(() => {
        logger.info(`⏱️ [${elapsed()}ms] Starting auto-updater`);
        initAutoUpdater();
      }, AUTO_UPDATER_DELAY_MS);
    });
    
    await createMainWindow();
    logger.info(`⏱️ [${elapsed()}ms] Main window created`);
    
  } catch (error) {
    logger.error('Fatal error:', error);
    app.quit();
  }
}

// App lifecycle
app.whenReady().then(() => {
  logger.info('='.repeat(50));
  logger.info('Jobelix Starting');
  logger.info('='.repeat(50));
  initializeApp();
});

app.on('window-all-closed', () => {
  stopLocalUiServer();
  if (!isMac()) {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopLocalUiServer();
});

// Error handlers
process.on('uncaughtException', (err) => logger.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));

logger.info('Main process loaded');
