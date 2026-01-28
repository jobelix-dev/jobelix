/**
 * LinkedIn Auto Apply Bot - Main Entry Point
 * 
 * This is the Node.js rewrite of the Python bot, running directly in Electron.
 * No subprocess spawning, no PyInstaller bundling - just TypeScript code.
 * 
 * ARCHITECTURE OVERVIEW:
 * =====================
 * 
 * 1. BotFacade (this file) - Orchestrates all components
 * 2. LinkedInAuthenticator - Handles manual login flow
 * 3. LinkedInJobManager - Searches jobs and coordinates applications
 * 4. LinkedInEasyApplier - Fills out Easy Apply forms
 * 5. GPTAnswerer - AI-powered form response generation
 * 6. StatusReporter - Real-time status updates to Electron UI
 * 
 * USAGE:
 * ======
 * 
 * ```typescript
 * import { LinkedInBot } from './bot';
 * 
 * const bot = new LinkedInBot();
 * await bot.initialize({ token, apiUrl, configPath, resumePath });
 * await bot.start(browserWindow);
 * ```
 */

import { BrowserWindow } from 'electron';
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import * as path from 'path';
import * as os from 'os';

import type { JobSearchConfig, Resume } from './types';
import { loadAndValidateConfig } from './core/config-validator';
import { loadResume } from './models/resume';
import { LinkedInAuthenticator } from './linkedin/authenticator';
import { LinkedInJobManager } from './linkedin/job-manager';
import { GPTAnswerer } from './ai/gpt-answerer';
import { StatusReporter, statusReporter } from './utils/status-reporter';
import { createLogger, logger } from './utils/logger';
import { getDataFolderPath, getChromiumPath } from './utils/paths';

const log = createLogger('LinkedInBot');

// Bot version - should match package.json
const BOT_VERSION = '2.0.0';

/**
 * Bot initialization options
 */
export interface BotOptions {
  /** Backend API token (64-char hex) */
  token: string;
  /** Backend API URL */
  apiUrl: string;
  /** Path to config.yaml */
  configPath?: string;
  /** Path to resume.yaml */
  resumePath?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Chromium executable path (provided by Electron) */
  chromiumPath?: string;
  /** User data directory for browser profile */
  userDataDir?: string;
}

/**
 * LinkedInBot - Main bot facade class
 * 
 * Orchestrates all bot components and provides a clean interface
 * for starting and stopping the job application process.
 * 
 * This is a "Facade Pattern" - it simplifies complex subsystem interactions
 * into a single, easy-to-use interface.
 */
export class LinkedInBot {
  // Component instances
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private authenticator: LinkedInAuthenticator | null = null;
  private jobManager: LinkedInJobManager | null = null;
  private gptAnswerer: GPTAnswerer | null = null;
  
  // Configuration
  private config: JobSearchConfig | null = null;
  private resume: Resume | null = null;
  private options: BotOptions | null = null;
  
  // State tracking
  private isRunning = false;
  private shouldStop = false;

  /**
   * Initialize the bot with configuration
   * 
   * @param options - Bot configuration options
   */
  async initialize(options: BotOptions): Promise<void> {
    log.info('Initializing LinkedIn Bot...');
    this.options = options;

    // Validate token format (64 hex characters)
    if (!this.validateToken(options.token)) {
      throw new Error('Invalid token format. Expected 64 hexadecimal characters.');
    }

    // Configure logging level
    if (options.verbose) {
      logger.setLevel('debug');
      log.info('Verbose logging enabled');
    }

    // Load configuration
    const dataFolder = getDataFolderPath();
    const configPath = options.configPath || path.join(dataFolder, 'config.yaml');
    const resumePath = options.resumePath || path.join(dataFolder, 'resume.yaml');

    log.info(`Loading config from: ${configPath}`);
    this.config = loadAndValidateConfig(configPath);

    log.info(`Loading resume from: ${resumePath}`);
    this.resume = loadResume(resumePath);

    // Initialize GPT Answerer
    log.info('Initializing GPT Answerer...');
    this.gptAnswerer = new GPTAnswerer(
      options.token,
      options.apiUrl,
      statusReporter
    );
    this.gptAnswerer.setResume(this.resume);

    log.info('✅ Bot initialized successfully');
  }

  /**
   * Start the bot with the given browser window
   * 
   * @param mainWindow - Electron BrowserWindow for status updates
   */
  async start(mainWindow: BrowserWindow): Promise<void> {
    if (!this.options || !this.config || !this.resume || !this.gptAnswerer) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }

    if (this.isRunning) {
      throw new Error('Bot is already running');
    }

    this.isRunning = true;
    this.shouldStop = false;

    // Set up status reporter
    statusReporter.setMainWindow(mainWindow);
    statusReporter.startSession(BOT_VERSION, os.platform());

    try {
      // Launch browser
      log.info('Launching browser...');
      await this.launchBrowser();

      if (!this.page) {
        throw new Error('Failed to create browser page');
      }

      // Initialize components
      this.authenticator = new LinkedInAuthenticator(this.page, statusReporter);
      this.jobManager = new LinkedInJobManager(this.page, statusReporter);
      this.jobManager.setGptAnswerer(this.gptAnswerer);
      this.jobManager.setParameters(this.config);

      // Start login
      log.info('Starting LinkedIn authentication...');
      statusReporter.sendHeartbeat('linkedin_login');
      await this.authenticator.start();
      statusReporter.sendHeartbeat('linkedin_login_done');

      // Check if stopped during login
      if (this.shouldStop) {
        log.info('Bot stopped during login');
        return;
      }

      // Start job applications
      log.info('Starting job application process...');
      await this.jobManager.startApplying();

      // Report success
      statusReporter.sendHeartbeat('finalizing');
      statusReporter.completeSession(true);
      log.info('✅ Bot completed successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Bot error: ' + errorMessage);
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
  async stop(): Promise<void> {
    log.info('Stopping bot...');
    this.shouldStop = true;
    statusReporter.markStopped();
    await this.cleanup();
  }

  /**
   * Check if the bot is currently running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Launch Playwright browser with persistent profile
   */
  private async launchBrowser(): Promise<void> {
    const chromiumPath = this.options?.chromiumPath || getChromiumPath();
    const userDataDir = this.options?.userDataDir || path.join(getDataFolderPath(), '..', 'chrome_profile');

    log.info(`Chromium path: ${chromiumPath}`);
    log.info(`User data dir: ${userDataDir}`);

    // Launch persistent context (keeps login session)
    this.context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: chromiumPath,
      headless: false, // Must be visible for manual login
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-sandbox',
      ],
    });

    // Get the first page or create one
    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

    log.info('✅ Browser launched');
  }

  /**
   * Clean up browser resources
   */
  private async cleanup(): Promise<void> {
    log.info('Cleaning up...');

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
    } catch (error) {
      log.error('Cleanup error', error as Error);
    }
  }

  /**
   * Validate token format (64 hex characters)
   */
  private validateToken(token: string): boolean {
    if (token.length !== 64) return false;
    return /^[0-9a-fA-F]+$/.test(token);
  }
}

// Export singleton for convenience
export const linkedInBot = new LinkedInBot();

// Re-export all types and utilities for external use
export * from './types';
export { loadAndValidateConfig, ConfigError } from './core/config-validator';
export { loadResume, parseResumeYaml } from './models/resume';
export { LinkedInAuthenticator } from './linkedin/authenticator';
export { LinkedInJobManager } from './linkedin/job-manager';
export { GPTAnswerer } from './ai/gpt-answerer';
export { StatusReporter, statusReporter } from './utils/status-reporter';
export { createLogger, logger } from './utils/logger';
