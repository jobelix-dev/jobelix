import { chromium } from "playwright-core";
import * as path from "path";
import * as os from "os";
import { loadAndValidateConfig } from "./core/config-validator.js";
import { loadResume } from "./models/resume.js";
import { LinkedInAuthenticator } from "./linkedin/authenticator.js";
import { LinkedInJobManager } from "./linkedin/job-manager.js";
import { GPTAnswerer } from "./ai/gpt-answerer.js";
import { statusReporter } from "./utils/status-reporter.js";
import { createLogger, logger } from "./utils/logger.js";
import { getDataFolderPath, getChromiumPath } from "./utils/paths.js";
const log = createLogger("LinkedInBot");
const BOT_VERSION = "2.0.0";
class LinkedInBot {
  constructor() {
    // Component instances
    this.browser = null;
    this.context = null;
    this.page = null;
    this.authenticator = null;
    this.jobManager = null;
    this.gptAnswerer = null;
    // Configuration
    this.config = null;
    this.resume = null;
    this.options = null;
    // State tracking
    this.isRunning = false;
    this.shouldStop = false;
    this.browserPid = null;
    this.startedAt = null;
  }
  /**
   * Initialize the bot with configuration
   * 
   * @param options - Bot configuration options
   */
  async initialize(options) {
    log.info("Initializing LinkedIn Bot...");
    this.options = options;
    if (!this.validateToken(options.token)) {
      throw new Error("Invalid token format. Expected 64 hexadecimal characters.");
    }
    if (options.verbose) {
      logger.setLevel("debug");
      log.info("Verbose logging enabled");
    }
    const dataFolder = getDataFolderPath();
    const configPath = options.configPath || path.join(dataFolder, "config.yaml");
    const resumePath = options.resumePath || path.join(dataFolder, "resume.yaml");
    log.info(`Loading config from: ${configPath}`);
    this.config = loadAndValidateConfig(configPath);
    log.info(`Loading resume from: ${resumePath}`);
    this.resume = loadResume(resumePath);
    log.info("Initializing GPT Answerer...");
    this.gptAnswerer = new GPTAnswerer(
      options.token,
      options.apiUrl,
      statusReporter
    );
    this.gptAnswerer.setResume(this.resume);
    log.info("\u2705 Bot initialized successfully");
  }
  /**
   * Start the bot with the given browser window
   * 
   * @param mainWindow - Electron BrowserWindow for status updates
   */
  async start(mainWindow) {
    if (!this.options || !this.config || !this.resume || !this.gptAnswerer) {
      throw new Error("Bot not initialized. Call initialize() first.");
    }
    if (this.isRunning) {
      throw new Error("Bot is already running");
    }
    this.isRunning = true;
    this.shouldStop = false;
    statusReporter.setMainWindow(mainWindow);
    statusReporter.startSession(BOT_VERSION, os.platform());
    try {
      log.info("Launching browser...");
      await this.launchBrowser();
      if (!this.page) {
        throw new Error("Failed to create browser page");
      }
      this.authenticator = new LinkedInAuthenticator(this.page, statusReporter);
      this.jobManager = new LinkedInJobManager(this.page, statusReporter);
      this.jobManager.setGptAnswerer(this.gptAnswerer);
      this.jobManager.setParameters(this.config);
      log.info("Starting LinkedIn authentication...");
      statusReporter.sendHeartbeat("linkedin_login");
      await this.authenticator.start();
      statusReporter.sendHeartbeat("linkedin_login_done");
      if (this.shouldStop) {
        log.info("Bot stopped during login");
        return;
      }
      log.info("Starting job application process...");
      await this.jobManager.startApplying();
      statusReporter.sendHeartbeat("finalizing");
      statusReporter.completeSession(true);
      log.info("\u2705 Bot completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error("Bot error: " + errorMessage);
      statusReporter.completeSession(false, errorMessage);
      throw error;
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
  }
  /**
   * Stop the bot gracefully
   */
  async stop() {
    log.info("Stopping bot...");
    this.shouldStop = true;
    statusReporter.markStopped();
    await this.cleanup();
  }
  /**
   * Check if the bot is currently running
   */
  get running() {
    return this.isRunning;
  }
  /**
   * Get the browser process ID (for force kill)
   */
  getBrowserPid() {
    return this.browserPid;
  }
  /**
   * Get bot status information
   */
  getStatus() {
    return {
      running: this.isRunning,
      pid: this.browserPid,
      startedAt: this.startedAt
    };
  }
  /**
   * Get current session stats from StatusReporter
   * Used by getBotStatus() to restore stats on page reload
   */
  getStats() {
    const stats = statusReporter.getStats();
    return {
      jobs_found: stats.jobsFound,
      jobs_applied: stats.jobsApplied,
      jobs_failed: stats.jobsFailed,
      credits_used: stats.creditsUsed
    };
  }
  /**
   * Launch Playwright browser with persistent profile
   */
  async launchBrowser() {
    const chromiumPath = this.options?.chromiumPath || getChromiumPath();
    const userDataDir = this.options?.userDataDir || path.join(getDataFolderPath(), "..", "chrome_profile");
    log.info(`Chromium path: ${chromiumPath}`);
    log.info(`User data dir: ${userDataDir}`);
    this.context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: chromiumPath,
      headless: false,
      // Must be visible for manual login
      viewport: { width: 1280, height: 800 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--no-sandbox"
      ]
    });
    try {
      const browserServer = this.context._browser;
      const browserProcess = browserServer?._browserProcess;
      if (browserProcess?.pid) {
        this.browserPid = browserProcess.pid;
        this.startedAt = Date.now();
        log.info(`Browser PID: ${this.browserPid}`);
      } else {
        log.warn("Could not extract browser PID from Playwright context");
      }
    } catch (e) {
      log.warn(`Failed to get browser PID: ${e}`);
    }
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    log.info("\u2705 Browser launched");
  }
  /**
   * Clean up browser resources
   */
  async cleanup() {
    log.info("Cleaning up...");
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.page = null;
      this.browserPid = null;
      this.startedAt = null;
    } catch (error) {
      log.error("Cleanup error", error);
    }
  }
  /**
   * Validate token format (64 hex characters)
   */
  validateToken(token) {
    if (token.length !== 64) return false;
    return /^[0-9a-fA-F]+$/.test(token);
  }
}
const linkedInBot = new LinkedInBot();
export * from "./types/index.js";
import { loadAndValidateConfig as loadAndValidateConfig2, ConfigError } from "./core/config-validator.js";
import { loadResume as loadResume2, parseResumeYaml } from "./models/resume.js";
import { LinkedInAuthenticator as LinkedInAuthenticator2 } from "./linkedin/authenticator.js";
import { LinkedInJobManager as LinkedInJobManager2 } from "./linkedin/job-manager.js";
import { GPTAnswerer as GPTAnswerer2 } from "./ai/gpt-answerer.js";
import { StatusReporter, statusReporter as statusReporter2 } from "./utils/status-reporter.js";
import { createLogger as createLogger2, logger as logger2 } from "./utils/logger.js";
export {
  ConfigError,
  GPTAnswerer2 as GPTAnswerer,
  LinkedInAuthenticator2 as LinkedInAuthenticator,
  LinkedInBot,
  LinkedInJobManager2 as LinkedInJobManager,
  StatusReporter,
  createLogger2 as createLogger,
  linkedInBot,
  loadAndValidateConfig2 as loadAndValidateConfig,
  loadResume2 as loadResume,
  logger2 as logger,
  parseResumeYaml,
  statusReporter2 as statusReporter
};
//# sourceMappingURL=index.js.map
