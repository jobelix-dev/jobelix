/**
 * File system utilities
 * Handles file operations for config files, version files, and resume generation
 * Uses dynamic platform detection (fixes hardcoded 'linux' paths)
 */

import fs from 'fs';
import path from 'path';
import { FILES, VERSION } from '../config/constants.js';
import { getPlatformResourcePath } from '../modules/platform-utils.js';
import logger from './logger.js';

/**
 * Read a version file and return its content
 * @param {string} filePath - Absolute path to version file
 * @returns {string} Version string (e.g., "1.2.3") or default "0.0.0"
 */
export function readVersionFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const version = fs.readFileSync(filePath, 'utf-8').trim();
      logger.debug(`Version read from ${filePath}: ${version}`);
      return version;
    }
    logger.warn(`Version file not found: ${filePath}`);
    return VERSION.DEFAULT;
  } catch (error) {
    logger.error('Error reading version file:', error);
    return VERSION.DEFAULT;
  }
}

/**
 * Get the path to the version.txt file for the current platform
 * @returns {string} Absolute path to version.txt
 */
export function getVersionFilePath() {
  return getPlatformResourcePath(FILES.VERSION_TXT);
}

/**
 * Get the path to the config.yaml file
 * @returns {string} Absolute path to config.yaml
 */
export function getConfigPath() {
  return getPlatformResourcePath('data', FILES.CONFIG_YAML);
}

/**
 * Get the path to the resume.yaml file
 * @returns {string} Absolute path to resume.yaml
 */
export function getResumePath() {
  return getPlatformResourcePath('data', FILES.RESUME_YAML);
}

/**
 * Ensure a directory exists, creating it recursively if needed
 * @param {string} dirPath - Directory path to create
 */
export function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.debug(`Directory created: ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Failed to create directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Read config.yaml file
 * @returns {Promise<{success: boolean, content: string}>}
 */
export async function readConfig() {
  try {
    const configPath = getConfigPath();
    
    if (!fs.existsSync(configPath)) {
      logger.warn('Config file not found, returning empty content');
      return { success: false, content: '' };
    }
    
    const content = fs.readFileSync(configPath, 'utf-8');
    logger.debug('Config file read successfully');
    return { success: true, content };
  } catch (error) {
    logger.error('Error reading config:', error);
    return { success: false, content: '' };
  }
}

/**
 * Write config.yaml file
 * @param {string} content - YAML content to write
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function writeConfig(content) {
  try {
    const configPath = getConfigPath();
    const dir = path.dirname(configPath);
    
    ensureDirectoryExists(dir);
    
    fs.writeFileSync(configPath, content, 'utf-8');
    logger.success('Config written to:', configPath);
    return { success: true };
  } catch (error) {
    logger.error('Error writing config:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Write resume.yaml file
 * @param {string} content - YAML content to write
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function writeResume(content) {
  try {
    const resumePath = getResumePath();
    const dir = path.dirname(resumePath);
    
    ensureDirectoryExists(dir);
    
    fs.writeFileSync(resumePath, content, 'utf-8');
    logger.success('Resume written to:', resumePath);
    return { success: true, path: resumePath };
  } catch (error) {
    logger.error('Error writing resume:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean}
 */
export function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    logger.error(`Error checking file existence for ${filePath}:`, error);
    return false;
  }
}

/**
 * Read package.json and extract version
 * @param {string} packageJsonPath - Path to package.json
 * @returns {string} Version string or default "0.0.0"
 */
export function readPackageVersion(packageJsonPath) {
  try {
    if (!fs.existsSync(packageJsonPath)) {
      logger.warn(`package.json not found at: ${packageJsonPath}`);
      return VERSION.DEFAULT;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || VERSION.DEFAULT;
  } catch (error) {
    logger.error('Error reading package.json:', error);
    return VERSION.DEFAULT;
  }
}
