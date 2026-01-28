/**
 * Path utilities for the LinkedIn Auto Apply Bot
 * 
 * Provides centralized path management for data files, output, etc.
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { app } from 'electron';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the base resources path based on environment
 */
export function getResourcesPath(): string {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  // Development mode - navigate from bot/utils to project root/resources
  // __dirname is: src/main/modules/bot/utils
  // We need:      resources
  return path.join(__dirname, '..', '..', '..', '..', '..', 'resources');
}

/**
 * Get the platform-specific bot resources directory
 */
export function getBotResourcesPath(): string {
  const platform = process.platform === 'darwin' ? 'mac' 
    : process.platform === 'win32' ? 'win' 
    : 'linux';
  return path.join(getResourcesPath(), platform);
}

/**
 * Get the data folder path (contains config.yaml, resume.yaml)
 */
export function getDataFolderPath(): string {
  return path.join(getBotResourcesPath(), 'main', 'data_folder');
}

/**
 * Get the output folder path (for CSVs, generated resumes)
 */
export function getOutputFolderPath(): string {
  const outputPath = path.join(getDataFolderPath(), 'output');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  return outputPath;
}

/**
 * Get the tailored resumes folder path
 */
export function getTailoredResumesPath(): string {
  const resumesPath = path.join(getBotResourcesPath(), 'main', 'tailored_resumes');
  if (!fs.existsSync(resumesPath)) {
    fs.mkdirSync(resumesPath, { recursive: true });
  }
  return resumesPath;
}

/**
 * Get the debug HTML folder path
 */
export function getDebugHtmlPath(): string {
  const debugPath = path.join(getBotResourcesPath(), 'main', 'debug_html');
  if (!fs.existsSync(debugPath)) {
    fs.mkdirSync(debugPath, { recursive: true });
  }
  return debugPath;
}

/**
 * Get the Chrome profile path for persistent sessions
 */
export function getChromeProfilePath(): string {
  return path.join(getBotResourcesPath(), 'main', 'chrome_profile');
}

/**
 * Get the config.yaml file path
 */
export function getConfigPath(): string {
  return path.join(getDataFolderPath(), 'config.yaml');
}

/**
 * Get the resume.yaml file path
 */
export function getResumePath(): string {
  return path.join(getDataFolderPath(), 'resume.yaml');
}

/**
 * Get the old questions CSV path (for answer caching)
 */
export function getOldQuestionsPath(): string {
  return path.join(getOutputFolderPath(), 'old_Questions.csv');
}

/**
 * Ensure all required directories exist
 */
export function ensureDirectories(): void {
  getOutputFolderPath();
  getTailoredResumesPath();
  getDebugHtmlPath();
}

/**
 * Get the Chromium executable path from Playwright browsers
 * 
 * Electron provides the Playwright browsers path via PLAYWRIGHT_BROWSERS_PATH env var.
 * This function finds the Chromium executable within that directory.
 */
export function getChromiumPath(): string {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  
  if (!browsersPath) {
    throw new Error('PLAYWRIGHT_BROWSERS_PATH is not set. The Electron app must provide the Playwright browsers path.');
  }

  // Find chromium directory (e.g., chromium-1140 or similar)
  const entries = fs.readdirSync(browsersPath);
  const chromiumDir = entries.find(e => e.startsWith('chromium-'));
  
  if (!chromiumDir) {
    throw new Error(`No Chromium installation found in: ${browsersPath}`);
  }

  // Build path to executable based on platform
  const platform = process.platform;
  let execPath: string;
  
  if (platform === 'darwin') {
    execPath = path.join(browsersPath, chromiumDir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
  } else if (platform === 'win32') {
    execPath = path.join(browsersPath, chromiumDir, 'chrome-win', 'chrome.exe');
  } else {
    execPath = path.join(browsersPath, chromiumDir, 'chrome-linux', 'chrome');
  }

  if (!fs.existsSync(execPath)) {
    throw new Error(`Chromium executable not found at: ${execPath}`);
  }

  return execPath;
}
