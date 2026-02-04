/**
 * Browser Manager - Handles Playwright browser installation and status
 * 
 * Manages Chromium browser lifecycle:
 * - Checks if browser is installed
 * - Downloads/installs browser with progress tracking
 * - Provides browser executable path
 * 
 * Works on all platforms: Windows, macOS, Linux
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import logger from '../utils/logger.js';
import { IPC_CHANNELS } from '../config/constants.js';

// Browser installation state
let isInstalling = false;
let installProgress = 0;

/**
 * Get the Playwright browsers directory path
 * @returns {string} Path to playwright-browsers folder in userData
 */
export function getBrowsersPath() {
  return path.join(app.getPath('userData'), 'playwright-browsers');
}

/**
 * Get platform-specific Chromium executable subpaths
 * @returns {string[]} Array of possible subpaths to Chromium executable
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
  // Linux
  return [
    path.join('chrome-linux', 'chrome'),
    path.join('chrome-linux64', 'chrome'),
  ];
}

/**
 * Get the Chromium executable path if installed
 * @returns {string|null} Path to Chromium executable, or null if not installed
 */
export function getChromiumPath() {
  const browsersPath = getBrowsersPath();
  
  if (!fs.existsSync(browsersPath)) {
    return null;
  }

  try {
    const entries = fs.readdirSync(browsersPath, { withFileTypes: true });
    const chromiumDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
      .map((entry) => entry.name)
      .sort()
      .reverse(); // Latest version first

    const subpaths = getChromiumSubpaths();
    
    for (const dir of chromiumDirs) {
      for (const subpath of subpaths) {
        const candidate = path.join(browsersPath, dir, subpath);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to find Chromium:', error);
  }

  return null;
}

/**
 * Check if Playwright browser is installed
 * @returns {{installed: boolean, path: string|null, version: string|null}}
 */
export function checkBrowserInstalled() {
  const chromiumPath = getChromiumPath();
  
  if (!chromiumPath) {
    return { installed: false, path: null, version: null };
  }

  // Extract version from path (e.g., chromium-1140 -> 1140)
  const match = chromiumPath.match(/chromium-(\d+)/);
  const version = match ? match[1] : 'unknown';

  return {
    installed: true,
    path: chromiumPath,
    version,
  };
}

/**
 * Get the path to the Playwright CLI script
 * In packaged app, it's in node_modules within the app.asar
 * In development, it's in the project's node_modules
 * @returns {string} Path to playwright-core cli.js
 */
function getPlaywrightCliPath() {
  if (app.isPackaged) {
    // In packaged app, playwright-core is in the asar archive
    // Use path relative to app root
    return path.join(app.getAppPath(), 'node_modules', 'playwright-core', 'cli.js');
  }
  // In development, use the project's playwright-core
  return path.join(process.cwd(), 'node_modules', 'playwright-core', 'cli.js');
}

/**
 * Install Playwright Chromium browser with progress tracking
 * @param {BrowserWindow} mainWindow - Window to send progress updates to
 * @returns {Promise<{success: boolean, error?: string, path?: string}>}
 */
export async function installBrowser(mainWindow) {
  if (isInstalling) {
    return { success: false, error: 'Installation already in progress' };
  }

  // Check if already installed
  const status = checkBrowserInstalled();
  if (status.installed) {
    logger.info('Browser already installed at:', status.path);
    return { success: true, path: status.path };
  }

  isInstalling = true;
  installProgress = 0;

  const browsersPath = getBrowsersPath();
  
  // Ensure browsers directory exists
  if (!fs.existsSync(browsersPath)) {
    fs.mkdirSync(browsersPath, { recursive: true });
  }

  // Set environment variable for Playwright to use our custom path
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

  logger.info('Starting Playwright Chromium installation...');
  logger.info(`Browsers path: ${browsersPath}`);

  // Send initial progress
  sendProgress(mainWindow, {
    stage: 'downloading',
    progress: 0,
    message: 'Preparing to download browser...',
  });

  return new Promise((resolve) => {
    // Use the bundled playwright-core CLI directly with Electron's Node.js
    // This avoids requiring npx/Node.js to be installed on the user's system
    const playwrightCli = getPlaywrightCliPath();
    const command = process.execPath; // Electron's bundled Node.js executable
    const args = [playwrightCli, 'install', 'chromium'];
    
    logger.info(`Running: ${command} ${args.join(' ')}`);

    // Spawn with lower CPU priority to avoid blocking the UI
    // PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT helps with slow connections
    const child = spawn(command, args, {
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: browsersPath,
        // Give more time for slow connections and reduce CPU pressure
        PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: '300000',
        // Required for Electron to run as Node.js
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Set lower priority on supported platforms (nice value)
      ...(process.platform !== 'win32' && { nice: 10 }),
    });

    let _stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      _stdout += text;
      logger.debug('[playwright stdout]', text.trim());
      
      // Parse progress from Playwright output
      // Playwright outputs lines like "Downloading Chromium 120.0.6099.28 (playwright build v1140)"
      // and progress like "  73% |============================           |"
      const progressMatch = text.match(/(\d+)%/);
      if (progressMatch) {
        const progress = parseInt(progressMatch[1], 10);
        installProgress = progress;
        sendProgress(mainWindow, {
          stage: 'downloading',
          progress,
          message: `Downloading browser... ${progress}%`,
        });
      }
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      logger.debug('[playwright stderr]', text.trim());
      
      // Playwright sometimes outputs progress to stderr too
      const progressMatch = text.match(/(\d+)%/);
      if (progressMatch) {
        const progress = parseInt(progressMatch[1], 10);
        installProgress = progress;
        sendProgress(mainWindow, {
          stage: 'downloading',
          progress,
          message: `Downloading browser... ${progress}%`,
        });
      }
    });

    child.on('error', (error) => {
      logger.error('Failed to spawn Playwright installer:', error);
      isInstalling = false;
      sendProgress(mainWindow, {
        stage: 'failed',
        progress: 0,
        message: `Installation failed: ${error.message}`,
      });
      resolve({ success: false, error: error.message });
    });

    child.on('close', (code) => {
      isInstalling = false;
      
      if (code === 0) {
        logger.success('Playwright Chromium installed successfully');
        
        // Verify installation
        const finalStatus = checkBrowserInstalled();
        if (finalStatus.installed) {
          sendProgress(mainWindow, {
            stage: 'completed',
            progress: 100,
            message: 'Browser installed successfully!',
          });
          resolve({ success: true, path: finalStatus.path });
        } else {
          logger.error('Installation completed but browser not found');
          sendProgress(mainWindow, {
            stage: 'failed',
            progress: 0,
            message: 'Installation completed but browser not found',
          });
          resolve({ success: false, error: 'Browser not found after installation' });
        }
      } else {
        logger.error(`Playwright installation failed with code ${code}`);
        logger.error('stderr:', stderr);
        sendProgress(mainWindow, {
          stage: 'failed',
          progress: 0,
          message: `Installation failed (exit code ${code})`,
        });
        resolve({ success: false, error: `Installation failed with code ${code}: ${stderr}` });
      }
    });
  });
}

/**
 * Send progress update to renderer
 * @param {BrowserWindow} mainWindow 
 * @param {{stage: string, progress: number, message: string}} data 
 */
function sendProgress(mainWindow, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send(IPC_CHANNELS.BROWSER_INSTALL_PROGRESS, data);
    } catch (error) {
      logger.warn('Failed to send browser install progress:', error);
    }
  }
}

/**
 * Get current installation status
 * @returns {{isInstalling: boolean, progress: number}}
 */
export function getInstallStatus() {
  return {
    isInstalling,
    progress: installProgress,
  };
}
