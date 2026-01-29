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

import * as fs from 'fs';
import * as path from 'path';
import type { Page } from 'playwright';
import type { SavedAnswer, Job } from '../../types';
import type { StatusReporter } from '../../utils/status-reporter';
import { createLogger } from '../../utils/logger';
import { getDebugHtmlPath } from '../../utils/paths';
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
  alreadyApplied?: boolean;      // True if we detected this job was already applied to
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
   * Save debug HTML snapshot for debugging purposes
   * Matches Python's save_debug_html() method
   */
  private async saveDebugHtml(context: string, jobTitle: string = ''): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const safeTitle = jobTitle.replace(/\s+/g, '_').replace(/[/\\]/g, '_').slice(0, 50);
      const filename = safeTitle 
        ? `${context}_${safeTitle}_${timestamp}.html`
        : `${context}_${timestamp}.html`;
      
      const debugDir = getDebugHtmlPath();
      
      // Ensure debug directory exists
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const filepath = path.join(debugDir, filename);
      const htmlContent = await this.page.content();
      const url = this.page.url();
      
      // Add metadata header
      const fullContent = `<!-- Debug HTML Snapshot -->
<!-- Context: ${context} -->
<!-- Job Title: ${jobTitle || 'N/A'} -->
<!-- URL: ${url} -->
<!-- Timestamp: ${new Date().toISOString()} -->

${htmlContent}`;
      
      fs.writeFileSync(filepath, fullContent, 'utf-8');
      log.info(`📸 Saved debug HTML: ${filepath}`);
      return filepath;
    } catch (error) {
      log.error(`Failed to save debug HTML: ${error}`);
      return null;
    }
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
      // Step 0: Navigate to the job page (CRITICAL - matches Python bot)
      log.debug(`Navigating to job page: ${job.link}`);
      await this.page.goto(job.link, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      // Wait for page to be interactive
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1000 + Math.random() * 500);
      
      log.debug('Job page loaded');
      
      // Save debug HTML after loading job page
      await this.saveDebugHtml('job_page_loaded', job.title);

      // Step 0.5: Extract job description (needed for resume tailoring and GPT context)
      const jobDescription = await this.getJobDescription();
      if (jobDescription) {
        job.description = jobDescription;
        log.debug(`Job description extracted: ${jobDescription.length} chars`);
      }

      // Step 1: Open the Easy Apply modal
      const modalResult = await this.openEasyApplyModal();
      
      if (modalResult === 'already_applied') {
        result.error = 'Already applied to this job';
        result.alreadyApplied = true;
        log.info('⏭️ Skipping - already applied to this job');
        return result;
      }
      
      if (modalResult === 'failed') {
        result.error = 'Could not open Easy Apply modal';
        log.error(result.error);
        await this.cleanupFailure();  // Clean up any open modals or dialogs
        return result;
      }

      // Step 2: Set the job context for GPT (helps with relevant answers)
      await this.setJobContext(job);

      // Step 3: Process all pages until submission (includes form filling + navigation + submit)
      const processResult = await this.processAllPages(result);
      
      if (!processResult.success) {
        result.error = processResult.error;
        await this.cleanupFailure();
        return result;
      }

      // processAllPages handles everything including submission
      // Set success based on process result
      if (!this.config.dryRun) {
        result.success = processResult.success;
      } else {
        log.info('🧪 Dry run mode - application was not actually submitted');
        result.success = true;
        await this.navHandler.closeModal();
      }

      if (result.success) {
        log.info(`✅ Successfully applied to "${job.title}" at ${job.company}`);
      }

    } catch (error) {
      result.error = String(error);
      log.error(`Error during Easy Apply: ${error}`);
      await this.saveDebugHtml('apply_error', result.jobTitle);
      await this.cleanupFailure();
    }

    return result;
  }

  /**
   * Check if the job has already been applied to
   * 
   * Looks for "Applied" or "Application sent" indicators on the page
   */
  private async isAlreadyApplied(): Promise<boolean> {
    try {
      // Check for "Applied" badge/indicator
      const appliedIndicators = [
        '.jobs-details-top-card__apply-status--applied',
        'span:has-text("Applied")',
        'span:has-text("Application sent")',
        'span:has-text("Candidature envoyée")',  // French
        'span:has-text("Candidatura enviada")',  // Spanish
        'span:has-text("Bewerbung gesendet")',   // German
        '.artdeco-inline-feedback--success:has-text("Applied")',
      ];

      for (const selector of appliedIndicators) {
        try {
          const indicator = this.page.locator(selector).first();
          if (await indicator.count() > 0 && await indicator.isVisible()) {
            const text = await indicator.textContent();
            log.info(`Job already applied (found indicator: "${text?.trim()}")`);
            return true;
          }
        } catch {
          // Continue checking
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Open the Easy Apply modal on the current job page
   * 
   * Matches Python's _find_easy_apply_button() with international selectors
   * 
   * @returns 'opened' if modal was opened, 'already_applied' if job was already applied, 'failed' otherwise
   */
  private async openEasyApplyModal(): Promise<'opened' | 'already_applied' | 'failed'> {
    try {
      // First check if already applied
      if (await this.isAlreadyApplied()) {
        log.warn('Job already applied - skipping');
        return 'already_applied';
      }

      // Save initial state for debugging
      await this.saveDebugHtml('before_find_button');

      // Try multiple selector strategies (LinkedIn structure varies by region)
      // Note: Can be <button> or <a> tag depending on locale/version
      // MATCHES PYTHON selectors exactly
      const selectors = [
        '[data-view-name="job-apply-button"]',           // Most reliable - works for both button and link
        'button.jobs-apply-button',                       // English button version
        'a[aria-label*="Easy Apply"]',                   // English link
        'a[aria-label*="Candidature simplifiée"]',       // French "Candidature simplifiée pour ce poste"
        'button[aria-label*="Postuler"]',                // French button "Postuler via Easy Apply"
        'a[aria-label*="Candidatar"]',                   // Spanish
        'button[aria-label*="Bewerben"]',                // German
        'button[data-control-name="jobdetails_topcard_inapply"]',
        '.jobs-s-apply button',
      ];

      let easyApplyButton;
      let buttonLabel = '';

      for (const selector of selectors) {
        try {
          log.debug(`Trying selector: ${selector}`);
          const buttons = this.page.locator(selector);
          
          // Wait briefly for buttons to appear
          await buttons.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
          
          // Get all matching buttons
          const allButtons = await buttons.all();
          
          if (allButtons.length === 0) {
            log.debug(`No buttons found with selector: ${selector}`);
            continue;
          }

          // Find the first one that is visible and enabled
          for (let i = 0; i < allButtons.length; i++) {
            const button = allButtons[i];
            try {
              if (await button.isVisible() && await button.isEnabled()) {
                easyApplyButton = button;
                buttonLabel = (await button.textContent())?.trim() || 
                             await button.getAttribute('aria-label') || '';
                log.info(`✓ Found Easy Apply button #${i} using selector: ${selector}`);
                log.debug(`Button text: ${buttonLabel}`);
                break;
              }
            } catch {
              log.debug(`Button #${i} not clickable`);
              continue;
            }
          }
          
          if (easyApplyButton) break;
        } catch (error) {
          log.debug(`Selector '${selector}' failed: ${error}`);
          continue;
        }
      }

      if (!easyApplyButton) {
        log.warn('Easy Apply button not found with any selector');
        await this.saveDebugHtml('button_not_found');
        return 'failed';
      }

      // Check if it's a link (<a>) with href or a button
      const href = await easyApplyButton.getAttribute('href');
      
      if (href) {
        // It's an <a> tag - navigate to the URL
        log.info(`Navigating to apply URL: ${href}`);
        await this.page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      } else {
        // It's a <button> - click it
        log.info('Clicking Easy Apply button');
        await easyApplyButton.click();
      }

      // CRITICAL: Wait for modal to appear with retry loop (MATCHES PYTHON)
      // Python uses 3 attempts with 3-second sleeps between
      log.info('Waiting for Easy Apply modal to load...');
      
      const maxAttempts = 3;
      let modalFound = false;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        log.debug(`Modal wait attempt ${attempt}/${maxAttempts}`);
        
        // Check if modal exists in DOM (even if not visible yet)
        const modalElements = await this.page.locator('div.jobs-easy-apply-modal').all();
        
        if (modalElements.length > 0) {
          log.debug(`Modal exists in DOM (${modalElements.length} elements), checking visibility...`);
          
          try {
            // Modal exists, wait for it to be visible
            await this.page.waitForSelector('div.jobs-easy-apply-modal', { 
              timeout: 10000, 
              state: 'visible' 
            });
            modalFound = true;
            log.info('✅ Easy Apply modal is now visible');
            break;
          } catch {
            log.debug(`Modal exists but not visible yet on attempt ${attempt}`);
            if (attempt < maxAttempts) {
              await this.page.waitForTimeout(2000);
            }
          }
        } else {
          log.debug(`Modal not in DOM yet on attempt ${attempt}`);
          if (attempt < maxAttempts) {
            await this.page.waitForTimeout(3000);  // Match Python's 3-second wait
          }
        }
      }

      if (!modalFound) {
        log.error('Easy Apply modal did not appear after 3 attempts');
        await this.saveDebugHtml('modal_not_opened');
        return 'failed';
      }

      await this.navHandler.waitForModalReady();
      await this.saveDebugHtml('modal_opened');

      log.debug('Easy Apply modal opened successfully');
      return 'opened';

    } catch (error) {
      log.error(`Failed to open Easy Apply modal: ${error}`);
      await this.saveDebugHtml('modal_open_error');
      return 'failed';
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
   * 
   * MATCHES PYTHON BOT FLOW:
   * 1. Wait for modal to be ready
   * 2. Fill ALL form fields on current page
   * 3. Click the primary button (Next/Review/Submit)
   * 4. Check if modal is still open - if not, application is complete
   * 5. Repeat until done
   */
  private async processAllPages(result: EasyApplyResult): Promise<{ success: boolean; error?: string }> {
    let retries = 0;
    let step = 0;
    
    while (step < this.config.maxPages) {
      step++;
      log.info(`========== EASY-APPLY Step ${step} ==========`);
      
      // Save debug HTML at start of each step
      await this.saveDebugHtml(`step_${step}_start`);
      
      // Check if modal is still open before processing
      const isModalOpen = await this.navHandler.isModalOpen();
      if (!isModalOpen) {
        log.info('Modal closed - application complete');
        return { success: true };
      }
      
      // STEP 1: Fill ALL form fields on this page (MATCHES PYTHON _answer_visible_form)
      log.debug(`Step ${step}.1: Filling form fields`);
      const pageResult = await this.formHandler.fillCurrentPage();
      result.totalFields += pageResult.fieldsProcessed;
      result.failedFields += pageResult.fieldsFailed;
      
      log.info(`Form page complete: ${pageResult.fieldsProcessed - pageResult.fieldsFailed}/${pageResult.fieldsProcessed} fields filled`);
      
      // Save debug HTML after filling form
      await this.saveDebugHtml(`step_${step}_after_fill`);
      
      // STEP 2: Click the primary action button (Next/Review/Submit)
      log.debug(`Step ${step}.2: Clicking primary action button`);
      const navResult = await this.navHandler.clickPrimaryButton();
      
      if (!navResult.success) {
        // Save debug HTML on error
        await this.saveDebugHtml(`step_${step}_nav_error`);
        
        // Navigation failed - might have validation errors
        if (await this.navHandler.hasValidationErrors()) {
          retries++;
          if (retries > this.config.maxRetries) {
            const errors = await this.navHandler.getValidationErrors();
            await this.saveDebugHtml(`step_${step}_validation_failed`);
            return { 
              success: false, 
              error: `Validation errors: ${errors.join(', ')}` 
            };
          }
          log.warn(`Validation errors on step ${step}, retry ${retries}/${this.config.maxRetries}`);
          continue;  // Retry filling and clicking
        }
        
        return { success: false, error: navResult.error || 'Navigation failed' };
      }
      
      // Check if this was the final submission
      if (navResult.submitted) {
        log.info('Application submitted successfully ✔');
        await this.saveDebugHtml('submitted_success');
        result.pagesCompleted = step;
        
        // Post-submit handling (MATCHES PYTHON _handle_post_submit_modal)
        await this.handlePostSubmit();
        
        return { success: true };
      }
      
      // STEP 3: Check if modal is still open (MATCHES PYTHON modal check)
      // Give page time to transition
      await this.page.waitForTimeout(1000);
      
      const stillOpen = await this.navHandler.isModalOpen();
      if (!stillOpen) {
        log.info('Modal closed after navigation - application complete');
        result.pagesCompleted = step;
        return { success: true };
      }
      
      // Successfully completed this step, more to come
      result.pagesCompleted = step;
      retries = 0;
      
      // Wait for next page to stabilize
      await this.navHandler.waitForModalReady();
    }

    return { success: false, error: `Exceeded maximum pages (${this.config.maxPages})` };
  }

  /**
   * Handle the final submission step
   * 
   * Note: With the new flow, clickPrimaryButton() handles submission directly.
   * This method is now only called as a fallback.
   */
  private async handleSubmission(): Promise<{ success: boolean; error?: string }> {
    // Use the new clickPrimaryButton which handles Submit
    const result = await this.navHandler.clickPrimaryButton();
    
    if (result.success && result.submitted) {
      await this.handlePostSubmit();
      return { success: true };
    }

    return { success: result.success, error: result.error };
  }

  /**
   * Handle post-submission modal/page stabilization
   * 
   * MATCHES PYTHON _handle_post_submit_modal:
   * - As of Nov 2025, LinkedIn no longer shows post-submission modals
   * - After submission, it directly shows related jobs
   * - This method waits for page to stabilize
   */
  private async handlePostSubmit(): Promise<void> {
    try {
      log.info('Application submitted - waiting for page to stabilize...');
      
      // Brief wait for any animations/redirects (matches Python's time.sleep(2))
      await this.page.waitForTimeout(2000);
      
      // Check if we're still on the job page by looking for job content
      try {
        await this.page.waitForSelector("span[data-testid='expandable-text-box']", { timeout: 3000 });
        log.info('✓ Application completed successfully');
      } catch {
        log.debug('Job description not found after submission - might have navigated away');
      }
      
    } catch (error) {
      log.warn(`Post-submission check encountered issue: ${error}`);
      // Not critical - application was already submitted
      log.info('Proceeding despite post-submission check failure');
    }
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
   * Extract job description from the job page
   * 
   * Matches Python bot's _get_job_description() with 6+ fallback selectors
   */
  private async getJobDescription(): Promise<string> {
    try {
      // 1) Try to expand "show more" button first
      try {
        const moreBtn = this.page.locator(
          'button.inline-show-more-text__button, button.jobs-description__footer-button'
        ).first();
        if (await moreBtn.isVisible()) {
          await moreBtn.click();
          await this.page.waitForTimeout(350);
        }
      } catch {
        // Button not found - continue
      }

      // 2) Try expandable-text-box (current LinkedIn structure, Nov 2025)
      try {
        const descSpan = this.page.locator('span[data-testid="expandable-text-box"]').first();
        await descSpan.waitFor({ state: 'attached', timeout: 10000 });
        const text = await descSpan.textContent();
        if (text && text.trim()) {
          log.debug(`Found description using data-testid selector (${text.length} chars)`);
          return text.trim();
        }
      } catch {
        log.debug('data-testid="expandable-text-box" selector not found');
      }

      // 3) Try #job-details (older unified pane)
      try {
        const detailsDiv = this.page.locator('#job-details').first();
        if (await detailsDiv.isVisible()) {
          const text = await detailsDiv.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        // Not found
      }

      // 4) Try article-based selector (older unified layout)
      try {
        const container = this.page.locator(
          'article.jobs-description__container .jobs-box__html-content'
        ).first();
        await container.waitFor({ state: 'attached', timeout: 5000 });
        const text = await container.textContent();
        if (text && text.trim()) {
          return text.trim();
        }
      } catch {
        // Not found
      }

      // 5) Fallback to the "stretch" class
      try {
        const stretchDiv = this.page.locator('div.jobs-description-content__text--stretch').first();
        if (await stretchDiv.isVisible()) {
          const text = await stretchDiv.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        // Not found
      }

      // 6) Last resort - try any jobs-description div
      try {
        const descDiv = this.page.locator('div.jobs-description').first();
        if (await descDiv.isVisible()) {
          const text = await descDiv.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        // Not found
      }

      log.warn('Could not find job description using any selector');
      return '';

    } catch (error) {
      log.error(`Error extracting job description: ${error}`);
      return '';
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
