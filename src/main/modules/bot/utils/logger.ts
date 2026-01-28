/**
 * Bot Logger - Consistent logging for the LinkedIn Auto Apply Bot
 */

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
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: string): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: string, error?: Error): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
      if (error?.stack) {
        console.error(error.stack);
      }
    }
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
