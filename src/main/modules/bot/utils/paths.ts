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
 * 
 * @returns The path to Chromium executable, or undefined if not found
 *          (allows Playwright to download/use system Chromium as fallback)
 */
export function getChromiumPath(): string | undefined {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  
  if (!browsersPath) {
    console.warn('[paths] PLAYWRIGHT_BROWSERS_PATH not set - Playwright will use system browser or download one');
    return undefined;
  }

  if (!fs.existsSync(browsersPath)) {
    console.warn(`[paths] Playwright browsers directory does not exist: ${browsersPath}`);
    return undefined;
  }

  // Find chromium directory (e.g., chromium-1140 or similar)
  let entries: string[];
  try {
    entries = fs.readdirSync(browsersPath);
  } catch (error) {
    console.warn(`[paths] Failed to read browsers directory: ${error}`);
    return undefined;
  }
  
  const chromiumDir = entries.find(e => e.startsWith('chromium-'));
  
  if (!chromiumDir) {
    console.warn(`[paths] No Chromium installation found in: ${browsersPath}`);
    return undefined;
  }

  // Build path to executable based on platform and architecture
  const platform = process.platform;
  const arch = process.arch;
  const chromiumBase = path.join(browsersPath, chromiumDir);
  
  // Define possible paths for each platform (prefer arch-specific, fallback to generic)
  const pathCandidates: string[] = [];
  
  if (platform === 'darwin') {
    if (arch === 'arm64') {
      pathCandidates.push(path.join(chromiumBase, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
    }
    pathCandidates.push(path.join(chromiumBase, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
  } else if (platform === 'win32') {
    if (arch === 'x64') {
      pathCandidates.push(path.join(chromiumBase, 'chrome-win64', 'chrome.exe'));
    }
    pathCandidates.push(path.join(chromiumBase, 'chrome-win', 'chrome.exe'));
  } else {
    // Linux
    if (arch === 'x64') {
      pathCandidates.push(path.join(chromiumBase, 'chrome-linux64', 'chrome'));
    }
    pathCandidates.push(path.join(chromiumBase, 'chrome-linux', 'chrome'));
  }

  // Find the first existing path
  for (const execPath of pathCandidates) {
    if (fs.existsSync(execPath)) {
      return execPath;
    }
  }

  console.warn(`[paths] Chromium executable not found. Checked paths: ${pathCandidates.join(', ')}`);
  return undefined;
}
