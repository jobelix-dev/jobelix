/**
 * Path utilities for the LinkedIn Auto Apply Bot
 * 
 * All user data is stored in Electron's userData folder:
 * - Windows: %APPDATA%/jobelix
 * - macOS: ~/Library/Application Support/jobelix
 * - Linux: ~/.config/jobelix
 * 
 * This keeps user data persistent across app updates and follows OS conventions.
 */

import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

/**
 * Get the user data folder path (Electron's userData)
 * This is where all persistent user data is stored.
 */
export function getUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * Get the data folder path (contains config.yaml, resume.yaml)
 */
export function getDataFolderPath(): string {
  const dataPath = path.join(getUserDataPath(), 'data');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
}

/**
 * Get the output folder path (for CSVs, logs)
 */
export function getOutputFolderPath(): string {
  const outputPath = path.join(getUserDataPath(), 'output');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  return outputPath;
}

/**
 * Get the tailored resumes folder path
 */
export function getTailoredResumesPath(): string {
  const resumesPath = path.join(getUserDataPath(), 'tailored_resumes');
  if (!fs.existsSync(resumesPath)) {
    fs.mkdirSync(resumesPath, { recursive: true });
  }
  return resumesPath;
}

/**
 * Get the debug HTML folder path
 */
export function getDebugHtmlPath(): string {
  const debugPath = path.join(getUserDataPath(), 'debug_html');
  if (!fs.existsSync(debugPath)) {
    fs.mkdirSync(debugPath, { recursive: true });
  }
  return debugPath;
}

/**
 * Get the Chrome profile path for persistent sessions
 */
export function getChromeProfilePath(): string {
  const chromePath = path.join(getUserDataPath(), 'chrome_profile');
  if (!fs.existsSync(chromePath)) {
    fs.mkdirSync(chromePath, { recursive: true });
  }
  return chromePath;
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
  getDataFolderPath();
  getOutputFolderPath();
  getTailoredResumesPath();
  getDebugHtmlPath();
  getChromeProfilePath();
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
