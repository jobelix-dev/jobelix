/**
 * IPC Handlers
 * Registers all IPC communication channels between main and renderer processes
 */

import { ipcMain, BrowserWindow } from 'electron';
import { readConfig, writeConfig, writeResume } from '../utils/file-system.js';
import { launchBot } from './process-manager.js';
import { saveAuthCache, loadAuthCache, clearAuthCache } from './auth-cache.js';
import { IPC_CHANNELS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Setup all IPC handlers
 * Registers handlers for config management, resume generation, and bot launching
 */
export function setupIpcHandlers() {
  logger.info('Setting up IPC handlers...');

  // Handler: Read config.yaml file
  ipcMain.handle(IPC_CHANNELS.READ_CONFIG, async () => {
    logger.ipc(IPC_CHANNELS.READ_CONFIG, 'Reading config file');
    const result = await readConfig();
    
    if (result.success) {
      logger.ipc(IPC_CHANNELS.READ_CONFIG, 'Config read successfully');
    } else {
      logger.ipc(IPC_CHANNELS.READ_CONFIG, 'Config read failed or file not found');
    }
    
    return result;
  });

  // Handler: Write config.yaml file
  ipcMain.handle(IPC_CHANNELS.WRITE_CONFIG, async (event, content) => {
    logger.ipc(IPC_CHANNELS.WRITE_CONFIG, 'Writing config file');
    const result = await writeConfig(content);
    
    if (result.success) {
      logger.ipc(IPC_CHANNELS.WRITE_CONFIG, 'Config written successfully');
    } else {
      logger.ipc(IPC_CHANNELS.WRITE_CONFIG, `Config write failed: ${result.error}`);
    }
    
    return result;
  });

  // Handler: Write resume.yaml file
  ipcMain.handle(IPC_CHANNELS.WRITE_RESUME, async (event, content) => {
    logger.ipc(IPC_CHANNELS.WRITE_RESUME, 'Writing resume file');
    const result = await writeResume(content);
    
    if (result.success) {
      logger.ipc(IPC_CHANNELS.WRITE_RESUME, `Resume written to: ${result.path}`);
    } else {
      logger.ipc(IPC_CHANNELS.WRITE_RESUME, `Resume write failed: ${result.error}`);
    }
    
    return result;
  });

  // Handler: Launch bot automation
  ipcMain.handle(IPC_CHANNELS.LAUNCH_BOT, async (event, token) => {
    logger.ipc(IPC_CHANNELS.LAUNCH_BOT, 'Launching bot');
    const result = await launchBot(token);
    
    if (result.success) {
      logger.ipc(IPC_CHANNELS.LAUNCH_BOT, `Bot launched with PID: ${result.pid}`);
    } else {
      logger.ipc(IPC_CHANNELS.LAUNCH_BOT, `Bot launch failed: ${result.error}`);
    }
    
    return result;
  });

  // Handler: Minimize window
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      logger.ipc(IPC_CHANNELS.WINDOW_MINIMIZE, 'Minimizing window');
      window.minimize();
    }
  });

  // Handler: Maximize window
  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      logger.ipc(IPC_CHANNELS.WINDOW_MAXIMIZE, 'Maximizing window');
      window.maximize();
    }
  });

  // Handler: Unmaximize window
  ipcMain.handle(IPC_CHANNELS.WINDOW_UNMAXIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      logger.ipc(IPC_CHANNELS.WINDOW_UNMAXIMIZE, 'Restoring window');
      window.unmaximize();
    }
  });

  // Handler: Close window
  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      logger.ipc(IPC_CHANNELS.WINDOW_CLOSE, 'Closing window');
      window.close();
    }
  });

  // Handler: Check if window is maximized
  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMaximized() : false;
  });

  // Handler: Save auth cache
  ipcMain.handle(IPC_CHANNELS.SAVE_AUTH_CACHE, async (event, tokens) => {
    logger.ipc(IPC_CHANNELS.SAVE_AUTH_CACHE, 'Saving auth cache');
    const result = await saveAuthCache(tokens);

    if (result.success) {
      logger.ipc(IPC_CHANNELS.SAVE_AUTH_CACHE, 'Auth cache saved successfully');
    } else {
      logger.ipc(IPC_CHANNELS.SAVE_AUTH_CACHE, `Auth cache save failed: ${result.error}`);
    }

    return result;
  });

  // Handler: Load auth cache
  ipcMain.handle(IPC_CHANNELS.LOAD_AUTH_CACHE, async () => {
    logger.ipc(IPC_CHANNELS.LOAD_AUTH_CACHE, 'Loading auth cache');
    const result = await loadAuthCache();

    if (result) {
      logger.ipc(IPC_CHANNELS.LOAD_AUTH_CACHE, 'Auth cache loaded successfully');
    } else {
      logger.ipc(IPC_CHANNELS.LOAD_AUTH_CACHE, 'No valid auth cache found');
    }

    return result;
  });

  // Handler: Clear auth cache
  ipcMain.handle(IPC_CHANNELS.CLEAR_AUTH_CACHE, async () => {
    logger.ipc(IPC_CHANNELS.CLEAR_AUTH_CACHE, 'Clearing auth cache');
    const result = await clearAuthCache();

    if (result.success) {
      logger.ipc(IPC_CHANNELS.CLEAR_AUTH_CACHE, 'Auth cache cleared successfully');
    } else {
      logger.ipc(IPC_CHANNELS.CLEAR_AUTH_CACHE, `Auth cache clear failed: ${result.error}`);
    }

    return result;
  });

  logger.success(`${Object.keys(IPC_CHANNELS).filter(k => k.startsWith('LAUNCH') || k.startsWith('READ') || k.startsWith('WRITE') || k.startsWith('WINDOW') || k.startsWith('SAVE') || k.startsWith('LOAD') || k.startsWith('CLEAR')).length} IPC handlers registered`);
}

/**
 * Remove all IPC handlers
 * Clean up function for app shutdown
 */
export function removeIpcHandlers() {
  logger.info('Removing IPC handlers...');
  
  ipcMain.removeHandler(IPC_CHANNELS.READ_CONFIG);
  ipcMain.removeHandler(IPC_CHANNELS.WRITE_CONFIG);
  ipcMain.removeHandler(IPC_CHANNELS.WRITE_RESUME);
  ipcMain.removeHandler(IPC_CHANNELS.LAUNCH_BOT);
  ipcMain.removeHandler(IPC_CHANNELS.WINDOW_MINIMIZE);
  ipcMain.removeHandler(IPC_CHANNELS.WINDOW_MAXIMIZE);
  ipcMain.removeHandler(IPC_CHANNELS.WINDOW_UNMAXIMIZE);
  ipcMain.removeHandler(IPC_CHANNELS.WINDOW_CLOSE);
  ipcMain.removeHandler(IPC_CHANNELS.WINDOW_IS_MAXIMIZED);
  ipcMain.removeHandler(IPC_CHANNELS.SAVE_AUTH_CACHE);
  ipcMain.removeHandler(IPC_CHANNELS.LOAD_AUTH_CACHE);
  ipcMain.removeHandler(IPC_CHANNELS.CLEAR_AUTH_CACHE);
  
  logger.success('IPC handlers removed');
}
