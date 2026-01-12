/**
 * IPC Handlers
 * Registers all IPC communication channels between main and renderer processes
 */

import { ipcMain } from 'electron';
import { readConfig, writeConfig, writeResume } from '../utils/file-system.js';
import { launchBot } from './process-manager.js';
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

  logger.success(`${Object.keys(IPC_CHANNELS).filter(k => k.startsWith('LAUNCH') || k.startsWith('READ') || k.startsWith('WRITE')).length} IPC handlers registered`);
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
  
  logger.success('IPC handlers removed');
}
