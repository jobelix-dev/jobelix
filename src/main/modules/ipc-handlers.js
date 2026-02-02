/**
 * IPC Handlers - Communication between main and renderer processes
 */

import { ipcMain, BrowserWindow, app } from 'electron';
import { readConfig, writeConfig, writeResume } from '../utils/file-system.js';
import { saveAuthCache, loadAuthCache, clearAuthCache } from './auth-cache.js';
import { checkBrowserInstalled, installBrowser } from './browser-manager.js';
import { openExternalUrl } from './update-manager.js';
import { IPC_CHANNELS } from '../config/constants.js';
import logger from '../utils/logger.js';

// Lazy-loaded bot launcher
let botLauncher = null;
async function getBotLauncher() {
  if (!botLauncher) {
    botLauncher = await import('./node-bot-launcher.js');
  }
  return botLauncher;
}

// Helper to get window from event
function getWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

// Helper to create safe status sender
function createStatusSender(event, channel) {
  return (payload) => {
    try {
      if (!event.sender.isDestroyed()) {
        event.sender.send(channel, payload);
      }
    } catch (err) {
      logger.warn(`Failed to send ${channel}:`, err.message);
    }
  };
}

export function setupIpcHandlers() {
  logger.info('Setting up IPC handlers...');
  let handlerCount = 0;

  // ============================================================================
  // App Info
  // ============================================================================
  
  ipcMain.handle('get-app-version', () => app.getVersion());
  handlerCount++;

  // ============================================================================
  // Config & Resume Files
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.READ_CONFIG, async () => {
    const result = await readConfig();
    logger.debug(`Config read: ${result.success ? 'OK' : 'failed'}`);
    return result;
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.WRITE_CONFIG, async (_, content) => {
    const result = await writeConfig(content);
    logger.debug(`Config write: ${result.success ? 'OK' : result.error}`);
    return result;
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.WRITE_RESUME, async (_, content) => {
    const result = await writeResume(content);
    logger.debug(`Resume write: ${result.success ? result.path : result.error}`);
    return result;
  });
  handlerCount++;

  // ============================================================================
  // Bot Control
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.LAUNCH_BOT, async (event, { token, apiUrl }) => {
    logger.info('Launching bot...');
    try {
      const launcher = await getBotLauncher();
      const sendStatus = createStatusSender(event, IPC_CHANNELS.BOT_STATUS);
      const result = await launcher.launchNodeBot(token, sendStatus, apiUrl);
      logger.info(`Bot launch: ${result.success ? 'OK' : result.error}`);
      return result;
    } catch (err) {
      logger.error('Bot launch failed:', err.message);
      return { success: false, error: err.message };
    }
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.STOP_BOT, async () => {
    logger.info('Stopping bot...');
    try {
      const launcher = await getBotLauncher();
      const result = await launcher.stopNodeBot();
      logger.info(`Bot stop: ${result.success ? 'OK' : result.error}`);
      return result;
    } catch (err) {
      logger.error('Bot stop failed:', err.message);
      return { success: false, error: err.message };
    }
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.FORCE_STOP_BOT, async () => {
    logger.info('Force stopping bot...');
    try {
      const launcher = await getBotLauncher();
      const result = await launcher.forceStopBot();
      logger.info(`Bot force stop: ${result.success ? 'OK' : result.error}`);
      return result;
    } catch (err) {
      logger.error('Bot force stop failed:', err.message);
      return { success: false, error: err.message };
    }
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.GET_BOT_STATUS, async () => {
    try {
      const launcher = await getBotLauncher();
      return { success: true, ...launcher.getBotStatus() };
    } catch (err) {
      return { success: false, running: false, pid: null, startedAt: null };
    }
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.GET_BOT_LOG_PATH, async () => {
    try {
      const launcher = await getBotLauncher();
      const path = launcher.getBotLogPath();
      return path ? { success: true, path } : { success: false, error: 'Log not initialized' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  handlerCount++;

  // ============================================================================
  // Browser Management
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.CHECK_BROWSER, () => {
    try {
      return { success: true, ...checkBrowserInstalled() };
    } catch (err) {
      return { success: false, installed: false, error: err.message };
    }
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.INSTALL_BROWSER, async (event) => {
    const window = getWindow(event);
    if (!window) return { success: false, error: 'No window' };
    
    try {
      return await installBrowser(window);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  handlerCount++;

  // ============================================================================
  // Window Controls
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    getWindow(event)?.minimize();
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    getWindow(event)?.maximize();
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.WINDOW_UNMAXIMIZE, (event) => {
    getWindow(event)?.unmaximize();
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    getWindow(event)?.close();
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    return getWindow(event)?.isMaximized() ?? false;
  });
  handlerCount++;

  // ============================================================================
  // Auth Cache
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.SAVE_AUTH_CACHE, async (_, tokens) => {
    return await saveAuthCache(tokens);
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.LOAD_AUTH_CACHE, async () => {
    return await loadAuthCache();
  });
  handlerCount++;

  ipcMain.handle(IPC_CHANNELS.CLEAR_AUTH_CACHE, async () => {
    return await clearAuthCache();
  });
  handlerCount++;

  // ============================================================================
  // Updates
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.OPEN_RELEASES_PAGE, () => {
    openExternalUrl('https://github.com/jobelix-dev/jobelix-releases/releases/latest');
    return { success: true };
  });
  handlerCount++;

  ipcMain.handle('open-external-url', (_, url) => {
    openExternalUrl(url);
    return { success: true };
  });
  handlerCount++;

  logger.success(`${handlerCount} IPC handlers registered`);
}

export function removeIpcHandlers() {
  const channels = [
    'get-app-version',
    'open-external-url',
    ...Object.values(IPC_CHANNELS)
  ];
  
  channels.forEach(channel => {
    try {
      ipcMain.removeHandler(channel);
    } catch {
      // Handler might not exist
    }
  });
  
  logger.info('IPC handlers removed');
}
