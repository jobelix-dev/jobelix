/**
 * Easy Applier - Main coordinator for LinkedIn Easy Apply applications
 * 
 * This is the top-level class that:
 * 1. Opens the Easy Apply modal
 * 2. Navigates through all pages of the application
 * 3. Fills forms using FormHandler
 * 4. Handles navigation using NavigationHandler
 * 5. Submits the application
 * 6. Reports status and errors
 * 
 * The application process flow:
 * 1. Click Easy Apply button on job posting
 * 2. Modal opens with multi-page form
 * 3. Fill each page → Click Next
 * 4. Review page → Click Review
 * 5. Final page → Click Submit
 * 6. Success confirmation
 */

import type { Page } from 'playwright';
import type { SavedAnswer, Job } from '../../types';
import type { StatusReporter } from '../../utils/status-reporter';
import { createLogger } from '../../utils/logger';
import { FormHandler, AnswerRecordCallback } from './form-handler';
import { NavigationHandler, ModalState } from './navigation';

const log = createLogger('EasyApplier');

/**
 * Result of an Easy Apply attempt
 */
export interface EasyApplyResult {
  success: boolean;
  jobTitle: string;
  company: string;
  error?: string;
  pagesCompleted: number;
  totalFields: number;
  failedFields: number;
}

/**
 * Configuration for Easy Applier
 */
export interface EasyApplierConfig {
  maxPages: number;              // Maximum pages before giving up (safety limit)
  maxRetries: number;            // Retries per page on error
  resumePath?: string;           // Path to resume PDF
  coverLetterPath?: string;      // Path to cover letter PDF
  skipOnError: boolean;          // Skip application if errors can't be resolved
  dryRun: boolean;               // If true, don't actually submit (stop at review)
}

const DEFAULT_CONFIG: EasyApplierConfig = {
  maxPages: 15,
  maxRetries: 3,
  skipOnError: true,
  dryRun: false,
};

export class EasyApplier {
  private page: Page;
  private gptAnswerer: any;
  private formHandler: FormHandler;
  private navHandler: NavigationHandler;
  private config: EasyApplierConfig;
  private savedAnswers: SavedAnswer[];
  private recordCallback?: AnswerRecordCallback;
  private reporter?: StatusReporter;

  /**
   * Create a new Easy Applier instance
   * 
   * Constructor signature matches LinkedInJobManager expectations:
   * - page: Playwright page
   * - gptAnswerer: AI for form responses
   * - savedAnswers: Previously saved Q&A
   * - resumePath: Path to resume file
   * - recordCallback: Callback for persisting answers
   * - reporter: Status reporter for IPC
   * 
   * @param page - Playwright page with job posting open
   * @param gptAnswerer - GPT answerer for generating form responses
   * @param savedAnswers - Previously saved Q&A pairs
   * @param resumePath - Path to resume PDF file
   * @param recordCallback - Callback to persist new answers
   * @param reporter - Status reporter for UI updates
   */
  constructor(
    page: Page,
    gptAnswerer: any,
    savedAnswers: SavedAnswer[] = [],
    resumePath?: string,
    recordCallback?: AnswerRecordCallback,
    reporter?: StatusReporter
  ) {
    this.page = page;
    this.gptAnswerer = gptAnswerer;
    this.savedAnswers = savedAnswers;
    this.recordCallback = recordCallback;
    this.reporter = reporter;
    this.config = { 
      ...DEFAULT_CONFIG, 
      resumePath 
    };
    
    // Initialize handlers
    this.formHandler = new FormHandler(
      page,
      gptAnswerer,
      savedAnswers,
      recordCallback,
      this.config.resumePath,
      this.config.coverLetterPath
    );
    
    this.navHandler = new NavigationHandler(page);
  }

  /**
   * Apply to a job using Easy Apply
   * 
   * This is the main entry point. It:
   * 1. Opens the Easy Apply modal
   * 2. Loops through all form pages
   * 3. Submits the application
   * 
   * @param job - Job to apply to
   * @returns Result of the application attempt
   */
  async apply(job: Job): Promise<EasyApplyResult> {
    const result: EasyApplyResult = {
      success: false,
      jobTitle: job.title,
      company: job.company,
      pagesCompleted: 0,
      totalFields: 0,
      failedFields: 0,
    };

    log.info(`🎯 Starting Easy Apply: "${job.title}" at ${job.company}`);

    try {
      // Step 1: Open the Easy Apply modal
      const modalOpened = await this.openEasyApplyModal();
      if (!modalOpened) {
        result.error = 'Could not open Easy Apply modal';
        log.error(result.error);
        return result;
      }

      // Step 2: Set the job context for GPT (helps with relevant answers)
      await this.setJobContext(job);

      // Step 3: Process all pages until submission
      const processResult = await this.processAllPages(result);
      
      if (!processResult.success) {
        result.error = processResult.error;
        await this.cleanupFailure();
        return result;
      }

      // Step 4: Handle final submission
      if (!this.config.dryRun) {
        const submitResult = await this.handleSubmission();
        result.success = submitResult.success;
        if (!submitResult.success) {
          result.error = submitResult.error;
        }
      } else {
        log.info('🧪 Dry run mode - skipping actual submission');
        result.success = true;
        await this.navHandler.closeModal();
      }

      if (result.success) {
        log.info(`✅ Successfully applied to "${job.title}" at ${job.company}`);
      }

    } catch (error) {
      result.error = String(error);
      log.error(`Error during Easy Apply: ${error}`);
      await this.cleanupFailure();
    }

    return result;
  }

  /**
   * Open the Easy Apply modal on the current job page
   */
  private async openEasyApplyModal(): Promise<boolean> {
    try {
      // Find Easy Apply button
      const easyApplySelectors = [
        'button.jobs-apply-button',
        'button[data-control-name="jobdetails_topcard_inapply"]',
        'button:has-text("Easy Apply")',
        '.jobs-s-apply button',
      ];

      let easyApplyButton;
      for (const selector of easyApplySelectors) {
        const btn = this.page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          easyApplyButton = btn;
          break;
        }
      }

      if (!easyApplyButton) {
        log.warn('Easy Apply button not found');
        return false;
      }

      // Click to open modal
      await easyApplyButton.click();
      
      // Wait for modal to appear
      await this.page.waitForSelector('[data-test-modal]', { timeout: 10000 });
      await this.navHandler.waitForModalReady();

      log.debug('Easy Apply modal opened');
      return true;

    } catch (error) {
      log.error(`Failed to open Easy Apply modal: ${error}`);
      return false;
    }
  }

  /**
   * Set job context for GPT to provide better answers
   */
  private async setJobContext(job: Job): Promise<void> {
    try {
      const context = `
Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description?.substring(0, 500) || 'N/A'}
      `.trim();

      await this.gptAnswerer.setJobContext(context);
      log.debug('Job context set for GPT');
    } catch {
      // Ignore - GPT answerer might not support this
    }
  }

  /**
   * Process all pages of the Easy Apply form
   */
  private async processAllPages(result: EasyApplyResult): Promise<{ success: boolean; error?: string }> {
    let retries = 0;
    
    while (result.pagesCompleted < this.config.maxPages) {
      // Get current modal state
      const state = await this.navHandler.getModalState();
      log.debug(`Page ${result.pagesCompleted + 1}, state: ${state}`);

      // Check for terminal states
      if (state === 'success') {
        return { success: true };
      }

      if (state === 'submit') {
        // Ready to submit
        return { success: true };
      }

      if (state === 'closed') {
        return { success: false, error: 'Modal was closed unexpectedly' };
      }

      if (state === 'unknown') {
        retries++;
        if (retries > this.config.maxRetries) {
          return { success: false, error: 'Unable to determine modal state' };
        }
        await this.page.waitForTimeout(1000);
        continue;
      }

      // Fill the current page
      const pageResult = await this.formHandler.fillCurrentPage();
      result.totalFields += pageResult.fieldsProcessed;
      result.failedFields += pageResult.fieldsFailed;

      // Navigate to next page
      let navResult;
      if (state === 'review') {
        navResult = await this.navHandler.clickReview();
      } else {
        navResult = await this.navHandler.clickNext();
      }

      if (!navResult.success) {
        // Navigation failed - might have validation errors
        if (await this.navHandler.hasValidationErrors()) {
          retries++;
          if (retries > this.config.maxRetries) {
            const errors = await this.navHandler.getValidationErrors();
            return { 
              success: false, 
              error: `Validation errors: ${errors.join(', ')}` 
            };
          }
          log.warn(`Validation errors, retry ${retries}/${this.config.maxRetries}`);
          continue;
        }
        
        return { success: false, error: navResult.error };
      }

      // Successfully moved to next page
      result.pagesCompleted++;
      retries = 0;
      
      // Wait for page transition
      await this.navHandler.waitForModalReady();
    }

    return { success: false, error: `Exceeded maximum pages (${this.config.maxPages})` };
  }

  /**
   * Handle the final submission step
   */
  private async handleSubmission(): Promise<{ success: boolean; error?: string }> {
    const state = await this.navHandler.getModalState();
    
    if (state !== 'submit') {
      log.warn(`Expected submit state, got: ${state}`);
      // Try to continue anyway
    }

    const result = await this.navHandler.clickSubmit();
    
    if (result.success) {
      // Wait for confirmation
      await this.page.waitForTimeout(2000);
      
      // Close success dialog if present
      const closeButton = this.page.locator('button[aria-label*="Dismiss"]').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
    }

    return { success: result.success, error: result.error };
  }

  /**
   * Clean up after a failed application
   */
  private async cleanupFailure(): Promise<void> {
    try {
      if (await this.navHandler.isModalOpen()) {
        await this.navHandler.closeModal();
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EasyApplierConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.resumePath) {
      this.formHandler.setResumePath(config.resumePath);
    }
    if (config.coverLetterPath) {
      this.formHandler.setCoverLetterPath(config.coverLetterPath);
    }
  }

  /**
   * Check if a job has Easy Apply option
   */
  async hasEasyApply(): Promise<boolean> {
    try {
      const easyApplyButton = this.page.locator('button:has-text("Easy Apply")').first();
      return await easyApplyButton.count() > 0 && await easyApplyButton.isVisible();
    } catch {
      return false;
    }
  }
}

/**
 * Alias for compatibility with JobManager
 * JobManager imports this name specifically
 */
export { EasyApplier as LinkedInEasyApplier };
