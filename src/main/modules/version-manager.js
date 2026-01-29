/**
 * Version Manager
 * Handles version checking, comparison, and compatibility validation
 */

import https from 'https';
import http from 'http';
import path from 'path';
import { app } from 'electron';
import { URLS, FILES, VERSION } from '../config/constants.js';
import { readPackageVersion, readVersionFile, getVersionFilePath } from '../utils/file-system.js';
import logger from '../utils/logger.js';

/**
 * Compare two semantic version strings (e.g., "1.2.3")
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  
  return 0;
}

/**
 * Get current app version from package.json
 * @returns {string} Version string (e.g., "1.2.3")
 */
export function getCurrentAppVersion() {
  // In packaged mode, use app.getAppPath() to get the correct location
  // In development mode, use process.cwd()
  const appPath = app.isPackaged ? app.getAppPath() : process.cwd();
  const packageJsonPath = path.join(appPath, FILES.PACKAGE_JSON);
  return readPackageVersion(packageJsonPath);
}

/**
 * Get current engine version
 * Now uses app version since bot is integrated (no separate Python engine)
 * @returns {string} Version string (e.g., "1.2.3")
 */
export function getCurrentEngineVersion() {
  // Bot is now integrated into Electron - use app version
  return getCurrentAppVersion();
}

/**
 * Fetch required versions from server endpoint
 * @returns {Promise<Object>} Required versions object
 */
export async function fetchRequiredVersions() {
  return new Promise((resolve, reject) => {
    const baseUrl = app.isPackaged ? URLS.PRODUCTION : URLS.DEVELOPMENT;
    const url = baseUrl + URLS.API.REQUIRED_VERSIONS;

    logger.debug(`Fetching required versions from: ${url}`);

    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success && parsed.required) {
            logger.debug('Required versions fetched successfully');
            resolve(parsed.required);
          } else {
            reject(new Error('Invalid response format'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if app and engine versions meet minimum requirements
 * @returns {Promise<Object>} Compatibility check result
 * @property {boolean} isCompatible - Whether all components are compatible
 * @property {string} currentAppVersion - Current app version
 * @property {string} currentEngineVersion - Current engine version
 * @property {string} requiredAppVersion - Required app version
 * @property {string} requiredEngineVersion - Required engine version
 * @property {string} downloadUrl - URL to download updates
 * @property {boolean} appNeedsUpdate - Whether app needs update
 * @property {boolean} engineNeedsUpdate - Whether engine needs update
 * @property {string} message - User-facing message
 */
export async function checkForUpdates() {
  try {
    logger.info('Checking for required updates...');
    
    // Get current versions
    const currentAppVersion = getCurrentAppVersion();
    const currentEngineVersion = getCurrentEngineVersion();
    
    logger.info(`Current App Version: ${currentAppVersion}`);
    logger.info(`Current Engine Version: ${currentEngineVersion}`);
    
    // Fetch required versions from server
    const required = await fetchRequiredVersions();
    
    logger.info(`Required App Version: ${required.app.version}`);
    logger.info(`Required Engine Version: ${required.engine.version}`);
    
    // Compare versions
    const appComparison = compareVersions(currentAppVersion, required.app.version);
    const engineComparison = compareVersions(currentEngineVersion, required.engine.version);
    
    const isAppCompatible = appComparison >= 0;
    const isEngineCompatible = engineComparison >= 0;
    const isCompatible = isAppCompatible && isEngineCompatible;
    
    const details = {
      isCompatible,
      currentAppVersion,
      currentEngineVersion,
      requiredAppVersion: required.app.version,
      requiredEngineVersion: required.engine.version,
      downloadUrl: required.downloadUrl,
      appNeedsUpdate: !isAppCompatible,
      engineNeedsUpdate: !isEngineCompatible,
      message: !isCompatible 
        ? (!isAppCompatible && !isEngineCompatible 
            ? 'Both app and engine need to be updated' 
            : !isAppCompatible 
              ? required.app.message 
              : required.engine.message)
        : 'All components are up to date'
    };
    
    if (isCompatible) {
      logger.success('App is compatible with server requirements');
    } else {
      logger.warn('Update required!');
      logger.warn(`  App compatible: ${isAppCompatible}`);
      logger.warn(`  Engine compatible: ${isEngineCompatible}`);
    }
    
    return details;
  } catch (error) {
    logger.error('Failed to check for updates:', error.message);
    // In case of error, allow the app to proceed (fail gracefully)
    return {
      isCompatible: true,
      error: error.message,
      message: 'Update check failed, proceeding with current version'
    };
  }
}
