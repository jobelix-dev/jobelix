import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
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
    this.logFilePath = null;
    this.logStream = null;
    this.initializeLogFile();
  }
  /**
   * Initialize the log file with proper path and rotation
   */
  initializeLogFile() {
    try {
      const logDir = path.join(app.getPath("userData"), "logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      this.logFilePath = path.join(logDir, `bot-${dateStr}.log`);
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: "a" });
      const initMsg = `
${"=".repeat(80)}
Bot Logger Initialized: ${(/* @__PURE__ */ new Date()).toISOString()}
Log file: ${this.logFilePath}
${"=".repeat(80)}
`;
      this.logStream.write(initMsg);
      console.info(`[BotLogger] Logging to: ${this.logFilePath}`);
    } catch (error) {
      console.error("[BotLogger] Failed to initialize log file:", error);
      this.logFilePath = null;
      this.logStream = null;
    }
  }
  /**
   * Write message to log file
   */
  writeToFile(message) {
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.write(message + "\n");
    }
  }
  /**
   * Close log file stream (call on app shutdown)
   */
  close() {
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.end();
      this.logStream = null;
    }
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
      const formatted = this.formatMessage("debug", message, context);
      console.debug(formatted);
      this.writeToFile(formatted);
    }
  }
  info(message, context) {
    if (this.shouldLog("info")) {
      const formatted = this.formatMessage("info", message, context);
      console.info(formatted);
      this.writeToFile(formatted);
    }
  }
  warn(message, context) {
    if (this.shouldLog("warn")) {
      const formatted = this.formatMessage("warn", message, context);
      console.warn(formatted);
      this.writeToFile(formatted);
    }
  }
  error(message, context, error) {
    if (this.shouldLog("error")) {
      const formatted = this.formatMessage("error", message, context);
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
  getLogFilePath() {
    return this.logFilePath;
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
app.on("will-quit", () => {
  logger.close();
});
export {
  createLogger,
  logger
};
//# sourceMappingURL=logger.js.map
