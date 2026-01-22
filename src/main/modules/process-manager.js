/**
 * Process Manager
 * Manages external processes (Python engine and bot automation)
 */

import { spawn } from 'child_process';
import { 
  getEnginePath, 
  getBotPath, 
  getBotWorkingDirectory,
  getPlatformName 
} from './platform-utils.js';
import { fileExists } from '../utils/file-system.js';
import { SPAWN_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';

let pythonProcess = null;

/**
 * Start the Python engine process
 * Spawns the platform-specific engine executable
 * @returns {boolean} True if process started successfully
 */
export function startPython() {
  try {
    const scriptPath = getEnginePath();

    logger.info(`Starting Python engine at: ${scriptPath}`);

    // Verify file exists before spawning
    if (!fileExists(scriptPath)) {
      logger.error('CRITICAL ERROR: Engine executable not found at:', scriptPath);
      logger.error(`Please ensure the engine executable exists in the resources/${getPlatformName().toLowerCase()} directory`);
      return false;
    }

    // Spawn the engine process
    logger.info('Launching Python engine...');
    pythonProcess = spawn(scriptPath, [], SPAWN_CONFIG.ENGINE);

    // Log stdout
    pythonProcess.stdout.on('data', (data) => {
      logger.process('Python', data.toString().trim());
    });

    // Log stderr
    pythonProcess.stderr.on('data', (data) => {
      logger.error(`Python Error: ${data.toString().trim()}`);
    });

    // Handle process exit
    pythonProcess.on('exit', (code, signal) => {
      if (code !== null) {
        logger.warn(`Python engine exited with code ${code}`);
      } else if (signal !== null) {
        logger.warn(`Python engine killed with signal ${signal}`);
      }
      pythonProcess = null;
    });

    // Handle spawn errors
    pythonProcess.on('error', (error) => {
      logger.error('Failed to start Python engine:', error);
      pythonProcess = null;
    });

    logger.success('Python engine started successfully');
    return true;
  } catch (error) {
    logger.error('Exception while starting Python engine:', error);
    return false;
  }
}

/**
 * Stop the Python engine process
 * Gracefully terminates the running process
 */
export function stopPython() {
  if (pythonProcess) {
    logger.info('Stopping Python engine...');
    pythonProcess.kill();
    pythonProcess = null;
  }
}

/**
 * Check if Python engine is running
 * @returns {boolean}
 */
export function isPythonRunning() {
  return pythonProcess !== null && !pythonProcess.killed;
}

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

/**
 * Get process manager status
 * @returns {{pythonRunning: boolean}}
 */
export function getProcessStatus() {
  return {
    pythonRunning: isPythonRunning()
  };
}
