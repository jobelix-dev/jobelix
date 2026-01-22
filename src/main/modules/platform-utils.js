/**
 * Platform detection and path resolution utilities
 * Centralizes platform-specific logic and eliminates code duplication
 */

import { app } from 'electron';
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
      return PLATFORM_FOLDERS.LINUX;
    default:
      const error = `Unsupported operating system: ${platform}`;
      logger.error(error);
      throw new Error(error);
  }
}

/**
 * Get the root resources directory path
 * Returns different paths for packaged vs development mode
 * @returns {string} Absolute path to resources directory
 */
export function getResourceRoot() {
  return app.isPackaged 
    ? process.resourcesPath 
    : path.join(process.cwd(), DIRECTORIES.RESOURCES);
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
 * Build path to platform-specific resource
 * @param {...string} pathSegments - Path segments to join (after platform folder)
 * @returns {string} Absolute path to the resource
 * @example
 * // Returns: /path/to/resources/linux/main/data_folder/config.yaml
 * getPlatformResourcePath('main', 'data_folder', 'config.yaml')
 */
export function getPlatformResourcePath(...pathSegments) {
  const resourceRoot = getResourceRoot();
  const platformFolder = getPlatformFolder();
  return path.join(resourceRoot, platformFolder, ...pathSegments);
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
