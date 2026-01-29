/**
 * Platform detection and path resolution utilities
 * Centralizes platform-specific logic and eliminates code duplication
 */

import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { PLATFORM_FOLDERS, EXECUTABLES, DIRECTORIES } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Get the platform folder name based on the current OS
 * @returns {string} Platform folder name ('win', 'mac', or 'linux')
 * @throws {Error} If the platform is not supported
 */
export function getPlatformFolder() {
  const platform = process.platform;
  
  switch (platform) {
    case 'win32':
      return PLATFORM_FOLDERS.WINDOWS;
    case 'darwin':
      return PLATFORM_FOLDERS.MAC;
    case 'linux':
      return isArchLinux() ? PLATFORM_FOLDERS.LINUX_ARCH : PLATFORM_FOLDERS.LINUX;
    default:
      const error = `Unsupported operating system: ${platform}`;
      logger.error(error);
      throw new Error(error);
  }
}

/**
 * Detect Arch-based Linux distributions via /etc/os-release
 * @returns {boolean}
 */
export function isArchLinux() {
  try {
    if (!fs.existsSync('/etc/os-release')) return false;
    const content = fs.readFileSync('/etc/os-release', 'utf-8');
    const idMatch = content.match(/^ID=(.+)$/m);
    const likeMatch = content.match(/^ID_LIKE=(.+)$/m);
    const id = idMatch ? idMatch[1].replace(/\"/g, '').toLowerCase() : '';
    const like = likeMatch ? likeMatch[1].replace(/\"/g, '').toLowerCase() : '';
    return id === 'arch' || like.includes('arch');
  } catch (error) {
    logger.warn('Failed to detect Linux distribution via /etc/os-release:', error);
    return false;
  }
}

/**
 * Get the root data directory path
 * Uses Electron's userData folder for persistent storage
 * @returns {string} Absolute path to userData directory
 */
export function getResourceRoot() {
  return app.getPath('userData');
}

/**
 * Get platform-specific executable name for the bot
 * @returns {string} Executable filename (e.g., 'main.exe' on Windows, 'main' on Unix)
 */
export function getBotExecutableName() {
  return process.platform === 'win32' 
    ? EXECUTABLES.BOT.WINDOWS 
    : EXECUTABLES.BOT.BASE;
}

/**
 * Build path to resource in userData
 * @param {...string} pathSegments - Path segments to join
 * @returns {string} Absolute path to the resource
 * @example
 * // Returns: ~/.config/jobelix/data/config.yaml
 * getPlatformResourcePath('data', 'config.yaml')
 */
export function getPlatformResourcePath(...pathSegments) {
  const resourceRoot = getResourceRoot();
  return path.join(resourceRoot, ...pathSegments);
}

/**
 * Get the full path to the bot executable
 * @returns {string} Absolute path to bot executable
 */
export function getBotPath() {
  const execName = getBotExecutableName();
  return getPlatformResourcePath(DIRECTORIES.MAIN, execName);
}

/**
 * Get the working directory for the bot
 * @returns {string} Absolute path to bot working directory
 */
export function getBotWorkingDirectory() {
  return getPlatformResourcePath(DIRECTORIES.MAIN);
}

/**
 * Check if the current platform is Windows
 * @returns {boolean}
 */
export function isWindows() {
  return process.platform === 'win32';
}

/**
 * Check if the current platform is macOS
 * @returns {boolean}
 */
export function isMac() {
  return process.platform === 'darwin';
}

/**
 * Check if the current platform is Linux
 * @returns {boolean}
 */
export function isLinux() {
  return process.platform === 'linux';
}

/**
 * Get human-readable platform name
 * @returns {string} Platform name (e.g., 'Windows', 'macOS', 'Linux')
 */
export function getPlatformName() {
  if (isWindows()) return 'Windows';
  if (isMac()) return 'macOS';
  if (isLinux()) return 'Linux';
  return 'Unknown';
}

/**
 * Log platform information for debugging
 */
export function logPlatformInfo() {
  logger.info('Platform Information:');
  logger.info(`  OS: ${getPlatformName()} (${process.platform})`);
  logger.info(`  Packaged: ${app.isPackaged}`);
  logger.info(`  Resource Root: ${getResourceRoot()}`);
  logger.info(`  Platform Folder: ${getPlatformFolder()}`);
}

/**
 * Initialize all data directories for the application
 * Creates: data/, output/, tailored_resumes/, chrome_profile/, debug_html/
 * This should be called on app startup to ensure directories exist
 */
export function initializeDataDirectories() {
  const userData = getResourceRoot();
  
  const directories = [
    path.join(userData, 'data'),
    path.join(userData, 'output'),
    path.join(userData, 'tailored_resumes'),
    path.join(userData, 'chrome_profile'),
    path.join(userData, 'debug_html'),
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.debug(`Created directory: ${dir}`);
    }
  }
  
  logger.info(`Data directories initialized at: ${userData}`);
}
