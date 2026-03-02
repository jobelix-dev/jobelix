/**
 * Secure Session Storage Module
 * 
 * Manages user session data using OS-level encryption (Electron safeStorage).
 * This is the secure replacement for the legacy auth-cache system.
 * 
 * Platform-specific storage:
 * - macOS: Keychain
 * - Windows: Credential Vault  
 * - Linux: Secret Service API / gnome-keyring
 */

import { app, safeStorage } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

const SESSION_FILE_NAME = 'session.enc';

/**
 * Get the path to the encrypted session file
 */
function getSessionPath() {
  return path.join(app.getPath('userData'), SESSION_FILE_NAME);
}

/**
 * Save session data to OS keychain
 * 
 * @param {Object} session - Session data containing access_token, refresh_token, etc.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveSession(session) {
  try {
    if (!session?.access_token || !session?.refresh_token) {
      logger.warn('[SessionStorage] Invalid session data - missing required tokens');
      return { success: false, error: 'Invalid session data' };
    }

    // Check if safeStorage is available
    if (!safeStorage.isEncryptionAvailable()) {
      logger.error('[SessionStorage] OS encryption not available');
      return { success: false, error: 'Encryption not available on this system' };
    }

    // Prepare session data
    const sessionData = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user,
      saved_at: Date.now(),
    };

    // Encrypt and save to disk
    const plaintext = JSON.stringify(sessionData);
    const encrypted = safeStorage.encryptString(plaintext);
    
    const sessionPath = getSessionPath();
    await fs.writeFile(sessionPath, encrypted);
    
    logger.info('[SessionStorage] Session saved successfully');
    return { success: true };
  } catch (error) {
    logger.error('[SessionStorage] Error saving session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load session data from OS keychain
 * 
 * @returns {Promise<Object|null>} Session data or null if not found/invalid
 */
export async function loadSession() {
  try {
    const sessionPath = getSessionPath();
    
    // Check if session file exists
    try {
      await fs.access(sessionPath);
    } catch {
      logger.info('[SessionStorage] No saved session found');
      return null;
    }

    // Check if safeStorage is available
    if (!safeStorage.isEncryptionAvailable()) {
      logger.error('[SessionStorage] OS encryption not available');
      return null;
    }

    // Read and decrypt
    const encrypted = await fs.readFile(sessionPath);
    const plaintext = safeStorage.decryptString(encrypted);
    const sessionData = JSON.parse(plaintext);

    // Validate session structure
    if (!sessionData?.access_token || !sessionData?.refresh_token) {
      logger.warn('[SessionStorage] Invalid session structure');
      await clearSession(); // Clean up invalid session
      return null;
    }

    logger.info('[SessionStorage] Session loaded successfully');
    return sessionData;
  } catch (error) {
    logger.error('[SessionStorage] Error loading session:', error);
    // Clear corrupted session
    await clearSession();
    return null;
  }
}

/**
 * Clear session data from OS keychain
 * 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function clearSession() {
  try {
    const sessionPath = getSessionPath();
    
    try {
      await fs.unlink(sessionPath);
      logger.info('[SessionStorage] Session cleared successfully');
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('[SessionStorage] No session to clear');
      } else {
        throw error;
      }
    }
    
    return { success: true };
  } catch (error) {
    logger.error('[SessionStorage] Error clearing session:', error);
    return { success: false, error: error.message };
  }
}
