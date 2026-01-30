/**
 * Node.js Bot Launcher
 * 
 * Replaces the Python subprocess approach with direct TypeScript execution.
 * The bot runs in the same Electron process, eliminating:
 * - PyInstaller bundling issues
 * - Native library loading problems
 * - Cross-process communication complexity
 * 
 * This module provides the same interface as process-manager.js
 * but uses the native TypeScript bot instead.
 * 
 * NOTE: This is a JavaScript file that imports TypeScript modules.
 * The TypeScript modules are compiled at build time or run via tsx.
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger.js';
import { getConfigPath, getResumePath } from '../utils/file-system.js';
import { getPlatformResourcePath } from './platform-utils.js';
import { DIRECTORIES } from '../config/constants.js';

// Bot instance and state
let botInstance = null;
let statusCallback = null;
let isRunning = false;

/**
 * Get the data folder path (same as Electron file-system uses)
 * Uses platform-specific resources path
 */
function getDataFolderPath() {
  return getPlatformResourcePath(DIRECTORIES.MAIN, DIRECTORIES.DATA_FOLDER);
}

/**
 * Get Chromium executable path for Playwright
 * Searches in Playwright browsers directory
 */
function getChromiumPath() {
  const playwrightPath = path.join(app.getPath('userData'), 'playwright-browsers');
  
  if (!fs.existsSync(playwrightPath)) {
    return undefined;
  }

  try {
    const entries = fs.readdirSync(playwrightPath, { withFileTypes: true });
    const chromiumDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
      .map((entry) => entry.name);

    const subpaths = getChromiumSubpaths();
    
    for (const dir of chromiumDirs) {
      for (const subpath of subpaths) {
        const candidate = path.join(playwrightPath, dir, subpath);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to find Chromium:', error);
  }

  return undefined;
}

/**
 * Get platform-specific Chromium executable subpaths
 */
function getChromiumSubpaths() {
  if (process.platform === 'win32') {
    return [
      path.join('chrome-win', 'chrome.exe'),
      path.join('chrome-win64', 'chrome.exe'),
    ];
  }
  if (process.platform === 'darwin') {
    return [
      path.join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      path.join('chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    ];
  }
  return [
    path.join('chrome-linux', 'chrome'),
    path.join('chrome-linux64', 'chrome'),
  ];
}

/**
 * Get the backend API URL
 */
function getApiUrl() {
  // Try environment variables first (check multiple possible names), then default
  return process.env.BACKEND_API_URL 
    || process.env.NEXT_PUBLIC_BACKEND_URL 
    || 'https://api.jobelix.com';
}

/**
 * Emit status update to renderer
 */
function emitStatus(payload) {
  if (statusCallback) {
    try {
      statusCallback(payload);
    } catch (error) {
      logger.warn('Failed to emit status:', error);
    }
  }
}

/**
 * Dynamically import the bot module
 * Uses compiled JavaScript from the bot directory
 */
async function importBotModule() {
  // Import the compiled bot module
  // During development, this will be the compiled JS from TypeScript
  // In production, it will be bundled with the app
  const botModule = await import('./bot/index.js');
  return botModule;
}

/**
 * Launch the Node.js bot
 * 
 * @param {string} token - 64-character hex authentication token
 * @param {Function} sendBotStatus - Callback to send status updates to renderer
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function launchNodeBot(token, sendBotStatus) {
  logger.info('🚀 Launching Node.js bot...');

  // Check if already running
  if (isRunning || (botInstance && botInstance.running)) {
    logger.warn('Bot is already running');
    return { success: false, error: 'Bot is already running' };
  }

  // Store callback
  statusCallback = sendBotStatus;

  // Validate token
  if (!token || token.length !== 64 || !/^[0-9a-fA-F]+$/.test(token)) {
    logger.error('Invalid token format');
    emitStatus({
      stage: 'failed',
      message: 'Invalid authentication token',
    });
    return { success: false, error: 'Invalid token format' };
  }

  try {
    // Import bot module dynamically
    logger.info('Loading bot module...');
    const { LinkedInBot } = await importBotModule();
    
    // Create bot instance
    botInstance = new LinkedInBot();
    isRunning = true;

    // Get paths using the same functions as Electron file-system
    const configPath = getConfigPath();
    const resumePath = getResumePath();
    const chromiumPath = getChromiumPath();

    // Verify files exist
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    if (!fs.existsSync(resumePath)) {
      throw new Error(`Resume file not found: ${resumePath}`);
    }

    logger.info(`Config path: ${configPath}`);
    logger.info(`Resume path: ${resumePath}`);
    logger.info(`Chromium path: ${chromiumPath || 'system default'}`);

    // Initialize bot
    const options = {
      token,
      apiUrl: getApiUrl(),
      configPath,
      resumePath,
      chromiumPath,
      verbose: !app.isPackaged, // Verbose in dev mode
    };

    await botInstance.initialize(options);

    // Get the focused window for status updates
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
      throw new Error('No main window available');
    }

    // Start bot in background (don't await)
    // This allows the IPC handler to return immediately
    botInstance.start(mainWindow).then(() => {
      logger.info('Bot completed');
      isRunning = false;
    }).catch((error) => {
      logger.error('Bot error:', error);
      isRunning = false;
      emitStatus({
        stage: 'failed',
        message: error.message || 'Bot failed',
      });
    });

    // Return success - bot is starting
    return { success: true };

  } catch (error) {
    isRunning = false;
    botInstance = null;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to launch bot:', errorMessage);
    
    emitStatus({
      stage: 'failed',
      message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Stop the running bot gracefully
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function stopNodeBot() {
  logger.info('🛑 Stopping Node.js bot...');

  if (!botInstance || !isRunning) {
    logger.warn('No bot running to stop');
    return { success: true }; // Not an error - bot was already stopped
  }

  try {
    await botInstance.stop();
    botInstance = null;
    isRunning = false;
    statusCallback = null;

    logger.info('✅ Bot stopped successfully');
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to stop bot:', errorMessage);
    
    // Force cleanup
    botInstance = null;
    isRunning = false;
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Force stop the bot by killing the browser process tree
 * Uses tree-kill for cross-platform process termination (Windows/macOS/Linux)
 * @returns {Promise<{success: boolean, error?: string, killed?: boolean}>}
 */
export async function forceStopBot() {
  logger.info('🔪 Force stopping bot (killing browser process)...');

  const pid = botInstance?.getBrowserPid?.();
  
  if (!pid) {
    logger.warn('No browser PID available, attempting graceful stop');
    return stopNodeBot();
  }

  logger.info(`Killing process tree for PID: ${pid}`);

  return new Promise((resolve) => {
    // Dynamic import tree-kill (it's already in dependencies)
    import('tree-kill').then(({ default: treeKill }) => {
      // Use SIGKILL on Unix, taskkill /F on Windows
      const signal = process.platform === 'win32' ? undefined : 'SIGKILL';
      
      treeKill(pid, signal, (err) => {
        if (err) {
          logger.warn(`tree-kill warning: ${err.message}`);
          // Process might already be dead, that's okay
        }
        
        // Cleanup state regardless of kill result
        botInstance = null;
        isRunning = false;
        statusCallback = null;
        
        // Emit stopped status
        emitStatus({ stage: 'stopped', message: 'Bot force stopped' });
        
        logger.info('✅ Bot force stopped');
        resolve({ success: true, killed: true });
      });
    }).catch((importErr) => {
      logger.error('Failed to import tree-kill:', importErr);
      // Fallback to graceful stop
      stopNodeBot().then(resolve);
    });
  });
}

/**
 * Check if bot is currently running
 * @returns {boolean}
 */
export function isBotRunning() {
  return isRunning || (botInstance?.running ?? false);
}

/**
 * Get detailed bot status including PID
 * @returns {{running: boolean, pid: number|null, startedAt: number|null}}
 */
export function getBotStatus() {
  if (!botInstance) {
    return { running: false, pid: null, startedAt: null };
  }
  
  if (typeof botInstance.getStatus === 'function') {
    return botInstance.getStatus();
  }
  
  // Fallback for older bot versions
  return {
    running: isRunning || (botInstance?.running ?? false),
    pid: botInstance?.getBrowserPid?.() ?? null,
    startedAt: null,
  };
}

/**
 * Get bot instance (for advanced use cases)
 * @returns {Object|null}
 */
export function getBotInstance() {
  return botInstance;
}
