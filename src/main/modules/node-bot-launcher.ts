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
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { LinkedInBot, BotOptions } from './bot/index';
import logger from '../utils/logger.js';

// Status payload type for bot updates
interface BotStatusPayload {
  stage: string;
  message?: string;
  activity?: string;
  details?: Record<string, unknown>;
  stats?: {
    jobs_found: number;
    jobs_applied: number;
    jobs_failed: number;
    credits_used: number;
  };
}

// Single bot instance
let botInstance: LinkedInBot | null = null;
let statusCallback: ((payload: BotStatusPayload) => void) | null = null;
let isRunning = false;

/**
 * Get the data folder path (same as Python bot used)
 */
function getDataFolderPath(): string {
  const userData = app.getPath('userData');
  return path.join(userData, 'data_folder');
}

/**
 * Get Chromium executable path for Playwright
 * Searches in Playwright browsers directory
 */
function getChromiumPath(): string | undefined {
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
function getChromiumSubpaths(): string[] {
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
function getApiUrl(): string {
  // Use NEXT_PUBLIC_APP_URL (the Next.js backend base URL) and append the API endpoint
  // Priority: 1. Environment variable, 2. Localhost default
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // Match Python bot: backend_api_url = public_app_url.rstrip('/') + '/api/autoapply/gpt4'
  return baseUrl.replace(/\/$/, '') + '/api/autoapply/gpt4';
}

/**
 * Emit status update to renderer
 */
function emitStatus(payload: BotStatusPayload): void {
  if (statusCallback) {
    try {
      statusCallback(payload);
    } catch (error) {
      logger.warn('Failed to emit status:', error);
    }
  }
}

/**
 * Launch the Node.js bot
 * 
 * @param token - 64-character hex authentication token
 * @param sendBotStatus - Callback to send status updates to renderer
 * @returns Launch result
 */
export async function launchNodeBot(
  token: string,
  sendBotStatus: (payload: BotStatusPayload) => void
): Promise<{ success: boolean; error?: string }> {
  logger.info('🚀 Launching Node.js bot...');

  // Check if already running
  if (isRunning || botInstance?.running) {
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
    // Create bot instance
    botInstance = new LinkedInBot();
    isRunning = true;

    // Get paths
    const dataFolder = getDataFolderPath();
    const configPath = path.join(dataFolder, 'config.yaml');
    const resumePath = path.join(dataFolder, 'resume.yaml');
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
    const options: BotOptions = {
      token,
      apiUrl: getApiUrl(),
      configPath,
      resumePath,
      chromiumPath,
      verbose: !app.isPackaged, // Verbose in dev mode
    };

    await botInstance.initialize(options);

    // Get the focused window for status updates
    const mainWindow = BrowserWindow.getFocusedWindow();
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
 * Stop the running bot
 */
export async function stopNodeBot(): Promise<{ success: boolean; error?: string }> {
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
 * Check if bot is currently running
 */
export function isBotRunning(): boolean {
  return isRunning || (botInstance?.running ?? false);
}

/**
 * Get bot instance (for advanced use cases)
 */
export function getBotInstance(): LinkedInBot | null {
  return botInstance;
}
