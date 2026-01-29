/**
 * Easy Applier - LinkedIn Easy Apply automation
 * 
 * Flow: Click Easy Apply → Fill forms → Navigate pages → Submit
 */

import type { Page } from 'playwright';
import type { SavedAnswer, Job } from '../../types';
import type { StatusReporter } from '../../utils/status-reporter';
import { createLogger } from '../../utils/logger';
import { saveDebugHtml } from '../../utils/debug-html';
import { FormHandler, AnswerRecordCallback } from './form-handler';
import { NavigationHandler } from './navigation';
import { 
  EASY_APPLY_BUTTON_SELECTORS, 
  ALREADY_APPLIED_SELECTORS, 
  JOB_DESCRIPTION_SELECTORS,
  MODAL 
} from './selectors';
import { getResumePath, getTailoredResumesPath } from '../../utils/paths';
import { generateTailoredResume } from '../../models/resume-generator';
import * as fs from 'fs';

const log = createLogger('EasyApplier');

/** Result of an Easy Apply attempt */
export interface EasyApplyResult {
  success: boolean;
  jobTitle: string;
  company: string;
  error?: string;
  alreadyApplied?: boolean;
  pagesCompleted: number;
  totalFields: number;
  failedFields: number;
}

/** Configuration for Easy Applier */
export interface EasyApplierConfig {
  maxPages: number;
  maxRetries: number;
  resumePath?: string;
  coverLetterPath?: string;
  skipOnError: boolean;
  dryRun: boolean;
  /** If true, use the same resume for all applications (skip tailoring) */
  useConstantResume?: boolean;
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
   * Save debug HTML snapshot - delegates to shared utility
   */
  private async saveHtml(context: string, jobTitle: string = ''): Promise<string | null> {
    return saveDebugHtml(this.page, context, jobTitle);
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
      await this.saveHtml('job_page_loaded', job.title);

      // Step 0.5: Extract job description (needed for resume tailoring and GPT context)
      const jobDescription = await this.getJobDescription();
      if (jobDescription) {
        job.description = jobDescription;
        log.debug(`Job description extracted: ${jobDescription.length} chars`);
      }

      // Step 0.6: Resume tailoring (MATCHES PYTHON BOT - this is the critical step!)
      if (this.config.useConstantResume) {
        log.info(`📄 Using constant resume (tailoring disabled)`);
      } else if (jobDescription && this.gptAnswerer) {
        try {
          const tailoredResumePath = await this.generateTailoredResume(job, jobDescription);
          if (tailoredResumePath) {
            // Update the form handler with the tailored resume path (critical!)
            this.formHandler.setResumePath(tailoredResumePath);
            log.info(`🎯 Using tailored resume: ${tailoredResumePath}`);
          }
        } catch (error) {
          log.warn(`Failed to tailor resume, using original: ${error}`);
        }
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
      await this.saveHtml('apply_error', result.jobTitle);
      await this.cleanupFailure();
    }

    return result;
  }

  /** Check if job was already applied to */
  private async isAlreadyApplied(): Promise<boolean> {
    try {
      for (const selector of ALREADY_APPLIED_SELECTORS) {
        try {
          const indicator = this.page.locator(selector).first();
          if (await indicator.count() > 0 && await indicator.isVisible()) {
            log.info(`Job already applied (found indicator)`);
            return true;
          }
        } catch { /* continue */ }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Open the Easy Apply modal on the current job page
   * 
  /** Open the Easy Apply modal */
  private async openEasyApplyModal(): Promise<'opened' | 'already_applied' | 'failed'> {
    try {
      if (await this.isAlreadyApplied()) {
        log.warn('Job already applied - skipping');
        return 'already_applied';
      }

      await this.saveHtml('before_find_button');

      // Find Easy Apply button using international selectors
      let easyApplyButton;
      let buttonLabel = '';

      for (const selector of EASY_APPLY_BUTTON_SELECTORS) {
        try {
          const buttons = this.page.locator(selector);
          await buttons.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
          
          for (const button of await buttons.all()) {
            try {
              if (await button.isVisible() && await button.isEnabled()) {
                easyApplyButton = button;
                buttonLabel = (await button.textContent())?.trim() || 
                             await button.getAttribute('aria-label') || '';
                log.info(`✓ Found Easy Apply button: ${selector}`);
                break;
              }
            } catch { continue; }
          }
          if (easyApplyButton) break;
        } catch { continue; }
      }

      if (!easyApplyButton) {
        log.warn('Easy Apply button not found');
        await this.saveHtml('button_not_found');
        return 'failed';
      }

      // Click button or navigate to href
      const href = await easyApplyButton.getAttribute('href');
      if (href) {
        log.info(`Navigating to apply URL`);
        await this.page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      } else {
        log.info('Clicking Easy Apply button');
        await easyApplyButton.click();
      }

      // Wait for modal with retry loop (matches Python)
      log.info('Waiting for Easy Apply modal...');
      const maxAttempts = 3;
      let modalFound = false;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const modalElements = await this.page.locator(MODAL.container).all();
        
        if (modalElements.length > 0) {
          try {
            await this.page.waitForSelector(MODAL.container, { timeout: 10000, state: 'visible' });
            modalFound = true;
            log.info('✅ Easy Apply modal visible');
            break;
          } catch {
            if (attempt < maxAttempts) await this.page.waitForTimeout(2000);
          }
        } else {
          if (attempt < maxAttempts) await this.page.waitForTimeout(3000);
        }
      }

      if (!modalFound) {
        log.error('Easy Apply modal did not appear');
        await this.saveHtml('modal_not_opened');
        return 'failed';
      }

      await this.navHandler.waitForModalReady();
      await this.saveHtml('modal_opened');
      return 'opened';

    } catch (error) {
      log.error(`Failed to open Easy Apply modal: ${error}`);
      await this.saveHtml('modal_open_error');
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
      await this.saveHtml(`step_${step}_start`);
      
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
      await this.saveHtml(`step_${step}_after_fill`);
      
      // STEP 2: Click the primary action button (Next/Review/Submit)
      log.debug(`Step ${step}.2: Clicking primary action button`);
      const navResult = await this.navHandler.clickPrimaryButton();
      
      if (!navResult.success) {
        // Save debug HTML on error
        await this.saveHtml(`step_${step}_nav_error`);
        
        // Navigation failed - might have validation errors
        if (await this.navHandler.hasValidationErrors()) {
          retries++;
          if (retries > this.config.maxRetries) {
            const errors = await this.navHandler.getValidationErrors();
            await this.saveHtml(`step_${step}_validation_failed`);
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
        await this.saveHtml('submitted_success');
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
    } catch { /* ignore */ }
  }

  /** Extract job description using multiple selectors */
  private async getJobDescription(): Promise<string> {
    try {
      // Try to expand "show more" button first
      try {
        const moreBtn = this.page.locator(
          'button.inline-show-more-text__button, button.jobs-description__footer-button'
        ).first();
        if (await moreBtn.isVisible()) {
          await moreBtn.click();
          await this.page.waitForTimeout(350);
        }
      } catch { /* not found */ }

      // Try each selector in priority order
      for (const selector of JOB_DESCRIPTION_SELECTORS) {
        try {
          const element = this.page.locator(selector).first();
          await element.waitFor({ state: 'attached', timeout: 5000 });
          const text = await element.textContent();
          if (text?.trim()) {
            log.debug(`Found description (${text.length} chars)`);
            return text.trim();
          }
        } catch { continue; }
      }

      log.warn('Could not find job description');
      return '';
    } catch (error) {
      log.error(`Error extracting job description: ${error}`);
      return '';
    }
  }

  /**
   * Generate a tailored resume for the specific job application (MATCHES PYTHON)
   * 
   * Uses GPT to customize the resume YAML for this specific job,
   * then generates a PDF from the tailored config.
   * 
   * @param job - Job object containing job details
   * @param jobDescription - Full job description text
   * @returns Path to the generated tailored resume PDF, or null if generation fails
   */
  private async generateTailoredResume(job: Job, jobDescription: string): Promise<string | null> {
    try {
      // Get base resume config path
      const baseResumePath = getResumePath();
      if (!fs.existsSync(baseResumePath)) {
        log.error(`Resume config not found: ${baseResumePath}`);
        log.error('Cannot tailor resume without base resume.yaml file');
        return null;
      }

      log.info(`🎯 Tailoring resume for ${job.company} - ${job.title}`);
      log.debug(`Using base resume config: ${baseResumePath}`);

      // Read the base resume YAML
      const baseResumeYaml = fs.readFileSync(baseResumePath, 'utf-8');

      // Use GPT to tailor the resume configuration (4-stage pipeline)
      const tailoredConfigYaml = await this.gptAnswerer.tailorResumeToJob(
        jobDescription,
        baseResumeYaml
      );

      if (!tailoredConfigYaml || tailoredConfigYaml.length < 100) {
        log.error('Invalid tailored config received from API');
        return null;
      }

      // Generate the tailored PDF
      const result = await generateTailoredResume({
        companyName: job.company,
        jobTitle: job.title,
        tailoredConfigYaml: tailoredConfigYaml,
        page: this.page,  // Pass page for Playwright PDF generation
      });

      log.info(`✅ Tailored resume generated: ${result.pdfPath}`);

      // Clean up old resumes periodically (keep last 20)
      this.cleanupOldResumes();

      return result.pdfPath;

    } catch (error) {
      log.error(`Failed to generate tailored resume: ${error}`);
      return null;
    }
  }

  /**
   * Clean up old tailored resumes to prevent disk space issues
   * Keeps the most recent 20 resumes
   */
  private cleanupOldResumes(): void {
    try {
      const resumesDir = getTailoredResumesPath();
      const files = fs.readdirSync(resumesDir)
        .filter(f => f.endsWith('.pdf'))
        .map(f => ({
          name: f,
          path: `${resumesDir}/${f}`,
          time: fs.statSync(`${resumesDir}/${f}`).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Keep the 20 most recent, delete the rest
      const toDelete = files.slice(20);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        // Also delete associated .yaml and _scores.json files
        const yamlPath = file.path.replace('.pdf', '.yaml');
        const scoresPath = file.path.replace('.pdf', '_scores.json');
        if (fs.existsSync(yamlPath)) fs.unlinkSync(yamlPath);
        if (fs.existsSync(scoresPath)) fs.unlinkSync(scoresPath);
        log.debug(`Cleaned up old resume: ${file.name}`);
      }

      if (toDelete.length > 0) {
        log.info(`🧹 Cleaned up ${toDelete.length} old tailored resumes`);
      }
    } catch (error) {
      log.debug(`Error cleaning up old resumes: ${error}`);
    }
  }

  /** Update configuration */
  updateConfig(config: Partial<EasyApplierConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.resumePath) this.formHandler.setResumePath(config.resumePath);
    if (config.coverLetterPath) this.formHandler.setCoverLetterPath(config.coverLetterPath);
  }

  /** Check if a job has Easy Apply option */
  async hasEasyApply(): Promise<boolean> {
    try {
      const btn = this.page.locator('button:has-text("Easy Apply")').first();
      return await btn.count() > 0 && await btn.isVisible();
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
