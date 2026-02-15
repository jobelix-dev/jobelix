/**
 * Centralized logging utility
 * Provides consistent logging across the Electron main process using electron-log
 */

import logPkg from 'electron-log';
const log = logPkg.default || logPkg;

// Configure electron-log
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Use async file writes to avoid blocking the main process event loop.
// Default is synchronous, which stalls the event loop on every log call.
log.transports.file.sync = false;

/**
 * Logger wrapper providing consistent interface
 */
export const logger = {
  /**
   * Log informational messages
   */
  info: (...args) => {
    log.info(...args);
  },

  /**
   * Log warning messages
   */
  warn: (...args) => {
    log.warn(...args);
  },

  /**
   * Log error messages
   */
  error: (...args) => {
    log.error(...args);
  },

  /**
   * Log debug messages (only in console, not in file)
   */
  debug: (...args) => {
    log.debug(...args);
  },

  /**
   * Log verbose messages for detailed debugging
   */
  verbose: (...args) => {
    log.verbose(...args);
  },

  /**
   * Log successful operations
   */
  success: (...args) => {
    log.info('✓', ...args);
  },

  /**
   * Log process-related messages
   */
  process: (name, message) => {
    log.info(`[${name}]`, message);
  },

  /**
   * Log IPC-related messages
   */
  ipc: (channel, message) => {
    log.debug(`[IPC: ${channel}]`, message);
  },

  /**
   * Get the underlying electron-log instance for advanced usage
   */
  getLogger: () => log,
};

export default logger;
