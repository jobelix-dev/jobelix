/**
 * Auth Cache Module
 *
 * Securely stores and retrieves authentication tokens using Electron's safeStorage.
 * Provides encrypted persistence of login sessions for automatic login functionality.
 */

import { safeStorage, app } from 'electron';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

// Get user data directory for storing cache
const getCacheFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'auth-cache.enc');
};

/**
 * Save authentication tokens to encrypted cache
 * @param {Object} tokens - Authentication tokens from Supabase session
 * @param {string} tokens.access_token - Access token
 * @param {string} tokens.refresh_token - Refresh token
 * @param {number} tokens.expires_at - Token expiration timestamp
 * @param {string} tokens.user_id - User ID
 */
export async function saveAuthCache(tokens) {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn('Safe storage encryption not available, skipping auth cache');
      return { success: false, error: 'Encryption not available' };
    }

    const cacheData = {
      tokens,
      timestamp: Date.now(),
      version: '1.0'
    };

    const jsonData = JSON.stringify(cacheData);
    const encrypted = safeStorage.encryptString(jsonData);

    const cachePath = getCacheFilePath();
    await fs.promises.writeFile(cachePath, encrypted);

    logger.info('Auth cache saved successfully');
    return { success: true };
  } catch (error) {
    logger.error('Failed to save auth cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load authentication tokens from encrypted cache
 * @returns {Object|null} Cached tokens or null if not found/invalid
 */
export async function loadAuthCache() {
  try {
    const cachePath = getCacheFilePath();

    // Check if cache file exists
    if (!fs.existsSync(cachePath)) {
      logger.debug('No auth cache file found');
      return null;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn('Safe storage encryption not available, cannot load auth cache');
      return null;
    }

    const encrypted = await fs.promises.readFile(cachePath);
    const decrypted = safeStorage.decryptString(encrypted);
    const cacheData = JSON.parse(decrypted);

    // Validate cache structure
    if (!cacheData.tokens || !cacheData.timestamp) {
      logger.warn('Invalid auth cache structure');
      return null;
    }

    // Check if cache is too old (30 days)
    const cacheAge = Date.now() - cacheData.timestamp;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (cacheAge > maxAge) {
      logger.info('Auth cache expired, clearing');
      await clearAuthCache();
      return null;
    }

    logger.info('Auth cache loaded successfully');
    return cacheData.tokens;
  } catch (error) {
    logger.error('Failed to load auth cache:', error);
    // If cache is corrupted, clear it
    try {
      await clearAuthCache();
    } catch (clearError) {
      logger.error('Failed to clear corrupted cache:', clearError);
    }
    return null;
  }
}

/**
 * Clear authentication cache
 */
export async function clearAuthCache() {
  try {
    const cachePath = getCacheFilePath();

    if (fs.existsSync(cachePath)) {
      await fs.promises.unlink(cachePath);
      logger.info('Auth cache cleared successfully');
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to clear auth cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if authentication cache exists and is valid
 * @returns {boolean} True if valid cache exists
 */
export async function hasValidAuthCache() {
  const cache = await loadAuthCache();
  return cache !== null;
}