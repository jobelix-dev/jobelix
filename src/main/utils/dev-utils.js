/**
 * Development utilities
 * Helper functions for development mode
 */

import { URLS, TIMING } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Wait for Next.js development server to be ready
 * Polls the server until it responds or max attempts reached
 * @param {string} url - URL to check
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise<boolean>} True if server is ready, false otherwise
 */
export async function waitForNextJs(
  url = URLS.DEVELOPMENT,
  maxAttempts = TIMING.NEXT_JS_WAIT.MAX_ATTEMPTS,
  delayMs = TIMING.NEXT_JS_WAIT.DELAY_MS
) {
  logger.info(`Waiting for Next.js server at ${url}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        logger.success(`Next.js is ready after ${i * delayMs}ms`);
        return true;
      }
    } catch (err) {
      logger.debug(`Waiting for Next.js... (attempt ${i + 1}/${maxAttempts})`);
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  logger.error('Next.js failed to start in time');
  return false;
}
