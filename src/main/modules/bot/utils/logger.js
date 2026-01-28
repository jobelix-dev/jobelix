const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
class BotLogger {
  constructor() {
    this.level = "info";
    this.prefix = "[Bot]";
  }
  setLevel(level) {
    this.level = level;
  }
  setPrefix(prefix) {
    this.prefix = prefix;
  }
  shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }
  formatMessage(level, message, context) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const ctx = context ? `[${context}]` : "";
    return `${timestamp} ${this.prefix} ${ctx} ${level.toUpperCase()}: ${message}`;
  }
  debug(message, context) {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, context));
    }
  }
  info(message, context) {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, context));
    }
  }
  warn(message, context) {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }
  error(message, context, error) {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, context));
      if (error?.stack) {
        console.error(error.stack);
      }
    }
  }
}
const logger = new BotLogger();
function createLogger(context) {
  return {
    debug: (msg) => logger.debug(msg, context),
    info: (msg) => logger.info(msg, context),
    warn: (msg) => logger.warn(msg, context),
    error: (msg, err) => logger.error(msg, context, err)
  };
}
export {
  createLogger,
  logger
};
//# sourceMappingURL=logger.js.map
