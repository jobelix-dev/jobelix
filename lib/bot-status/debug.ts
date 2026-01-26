/**
 * Debug Logging Utility for Bot Status
 * Only logs in development mode
 */

const isDev = process.env.NODE_ENV === 'development';

export const debugLog = {
  botStatus: (...args: any[]) => {
    if (isDev) console.log('[useBotStatus]', ...args);
  },
  botLauncher: (...args: any[]) => {
    if (isDev) console.log('[useBotLauncher]', ...args);
  },
  general: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  }
};
