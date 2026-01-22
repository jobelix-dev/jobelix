/**
 * Process Manager
 * Manages external bot automation process
 */

import { spawn } from 'child_process';
import { 
  getBotPath, 
  getBotWorkingDirectory,
  getPlatformName 
} from './platform-utils.js';
import { fileExists } from '../utils/file-system.js';
import { SPAWN_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Launch the bot automation process
 * Spawns bot in detached mode with the provided token
 * @param {string} token - Authentication token for the bot
 * @returns {Promise<{success: boolean, message?: string, pid?: number, platform?: string, error?: string}>}
 */
export async function launchBot(token) {
  try {
    if (!token) {
      logger.error('Bot launch failed: Token is required');
      return { success: false, error: 'Token is required' };
    }

    const botPath = getBotPath();
    const botCwd = getBotWorkingDirectory();

    logger.info('Bot Configuration:');
    logger.info(`  Path: ${botPath}`);
    logger.info(`  Working Directory: ${botCwd}`);
    logger.info(`  Platform: ${getPlatformName()}`);

    // Verify bot executable exists
    if (!fileExists(botPath)) {
      logger.error('Bot executable not found at:', botPath);
      return { 
        success: false, 
        error: `Bot executable not found at: ${botPath}` 
      };
    }

    // Get backend API URL from environment or use default
    const public_app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://www.jobelix.fr/';
    
    // Debug: Log the backend API URL being used
    logger.info(`public app url from env: "${process.env.NEXT_PUBLIC_APP_URL}"`);

    // Spawn the bot process with --playwright flag, token, and backend API URL
    const botProcess = spawn(botPath, ['--playwright', token, '--public_app_url', public_app_url], {
      ...SPAWN_CONFIG.BOT,
      cwd: botCwd
    });

    // Detach the process so it continues running independently
    botProcess.unref();

    logger.success('Bot process launched successfully');
    logger.info(`  PID: ${botProcess.pid}`);
    logger.debug(`  Command: ${botPath} --playwright [TOKEN_HIDDEN]`);

    return {
      success: true,
      message: 'Bot launched successfully',
      pid: botProcess.pid,
      platform: process.platform
    };
  } catch (error) {
    logger.error('Error launching bot:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error launching bot' 
    };
  }
}
