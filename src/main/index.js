/**
 * Jobelix - Electron Main Process Entry Point
 * 
 * Startup optimizations:
 * - GPU acceleration disabled (fixes 10-30s delay on some systems)
 * - Auto-updater deferred until after window loads
 * - Local loading screen for instant feedback
 */

// CRITICAL: Must disable GPU before any other Electron imports
import { app } from 'electron';
app.disableHardwareAcceleration();

// Suppress GPU-related errors on Linux when hardware acceleration is disabled
// These SharedImageManager errors are harmless but noisy
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { setupIpcHandlers } from './modules/ipc-handlers.js';
import { createMainWindow, onMainWindowReady } from './modules/window-manager.js';
import { initAutoUpdater } from './modules/update-manager.js';
import { logPlatformInfo, initializeDataDirectories, isMac } from './modules/platform-utils.js';
import { waitForNextJs } from './utils/dev-utils.js';
import logger from './utils/logger.js';

const startTime = Date.now();
const elapsed = () => Date.now() - startTime;

async function initializeApp() {
  try {
    logger.info(`⏱️ [${elapsed()}ms] App ready, starting initialization`);
    
    setupIpcHandlers();
    logger.info(`⏱️ [${elapsed()}ms] IPC handlers registered`);
    
    initializeDataDirectories();
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
    
    // Defer auto-updater until after window content loads
    onMainWindowReady(() => {
      logger.info(`⏱️ [${elapsed()}ms] Content loaded, starting auto-updater`);
      initAutoUpdater();
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
  if (!isMac()) {
    app.quit();
  }
});

// Error handlers
process.on('uncaughtException', (err) => logger.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));

logger.info('Main process loaded');
