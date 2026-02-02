/**
 * Bot Logger - Consistent logging for the LinkedIn Auto Apply Bot
 * 
 * Logs to both console and a persistent file for debugging and troubleshooting.
 * Log file location:
 * - Windows: %APPDATA%/jobelix/logs/bot.log
 * - macOS: ~/Library/Logs/jobelix/bot.log
 * - Linux: ~/.config/jobelix/logs/bot.log
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class BotLogger {
  private level: LogLevel = 'info';
  private prefix = '[Bot]';
  private logFilePath: string | null = null;
  private logStream: fs.WriteStream | null = null;

  constructor() {
    this.initializeLogFile();
  }

  /**
   * Initialize the log file with proper path and rotation
   */
  private initializeLogFile(): void {
    try {
      // Get app data directory (works in both dev and production)
      const logDir = path.join(app.getPath('userData'), 'logs');
      
      // Ensure logs directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Create log file path with date suffix for daily rotation
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      this.logFilePath = path.join(logDir, `bot-${dateStr}.log`);

      // Create write stream in append mode
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });

      // Log initialization
      const initMsg = `\n${'='.repeat(80)}\nBot Logger Initialized: ${new Date().toISOString()}\nLog file: ${this.logFilePath}\n${'='.repeat(80)}\n`;
      this.logStream.write(initMsg);

      console.info(`[BotLogger] Logging to: ${this.logFilePath}`);
    } catch (error) {
      console.error('[BotLogger] Failed to initialize log file:', error);
      this.logFilePath = null;
      this.logStream = null;
    }
  }

  /**
   * Write message to log file
   */
  private writeToFile(message: string): void {
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.write(message + '\n');
    }
  }

  /**
   * Close log file stream (call on app shutdown)
   */
  close(): void {
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.end();
      this.logStream = null;
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}]` : '';
    return `${timestamp} ${this.prefix} ${ctx} ${level.toUpperCase()}: ${message}`;
  }

  debug(message: string, context?: string): void {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, context);
      console.debug(formatted);
      this.writeToFile(formatted);
    }
  }

  info(message: string, context?: string): void {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, context);
      console.info(formatted);
      this.writeToFile(formatted);
    }
  }

  warn(message: string, context?: string): void {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, context);
      console.warn(formatted);
      this.writeToFile(formatted);
    }
  }

  error(message: string, context?: string, error?: Error): void {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, context);
      console.error(formatted);
      this.writeToFile(formatted);
      if (error?.stack) {
        console.error(error.stack);
        this.writeToFile(`Stack trace: ${error.stack}`);
      }
    }
  }

  /**
   * Get the current log file path
   */
  getLogFilePath(): string | null {
    return this.logFilePath;
  }
}

// Singleton instance
export const logger = new BotLogger();

// Convenience function for module-specific loggers
export function createLogger(context: string) {
  return {
    debug: (msg: string) => logger.debug(msg, context),
    info: (msg: string) => logger.info(msg, context),
    warn: (msg: string) => logger.warn(msg, context),
    error: (msg: string, err?: Error) => logger.error(msg, context, err),
  };
}

// Cleanup on app quit
app.on('will-quit', () => {
  logger.close();
});
