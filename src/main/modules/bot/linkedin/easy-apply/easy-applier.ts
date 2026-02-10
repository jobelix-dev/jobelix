/**
 * Easy Applier - LinkedIn Easy Apply automation
 * 
 * Orchestrates: Click Easy Apply → Fill forms → Navigate pages → Submit
 */

import type { Page } from 'playwright-core';
import type { SavedAnswer, Job } from '../../types';
import type { StatusReporter } from '../../utils/status-reporter';
import { createLogger } from '../../utils/logger';
import { saveDebugHtml } from '../../utils/debug-html';
import { detectLanguage, isLanguageAccepted, getLanguageName } from '../../utils/language-detector';
import { FormHandler, AnswerRecordCallback, GPTAnswererLike } from './form-handler';
import { NavigationHandler } from './navigation';
import { EASY_APPLY_BUTTON_SELECTORS, ALREADY_APPLIED_SELECTORS, JOB_DESCRIPTION_SELECTORS, MODAL, TIMEOUTS } from './selectors';
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
  languageSkipped?: boolean;
  detectedLanguage?: string;
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
  useConstantResume?: boolean;
  jobLanguages?: string[];  // ISO 639-1 codes for acceptable job description languages
}

const DEFAULT_CONFIG: EasyApplierConfig = {
  maxPages: 15,
  maxRetries: 3,
  skipOnError: true,
  dryRun: false,
};

export class EasyApplier {
  private formHandler: FormHandler;
  private navHandler: NavigationHandler;
  private config: EasyApplierConfig;

  constructor(
    private page: Page,
    private gptAnswerer: GPTAnswererLike,
    savedAnswers: SavedAnswer[] = [],
    resumePath?: string,
    recordCallback?: AnswerRecordCallback,
    private reporter?: StatusReporter
  ) {
    this.config = { ...DEFAULT_CONFIG, resumePath };
    this.formHandler = new FormHandler(page, gptAnswerer, savedAnswers, recordCallback, resumePath);
    this.navHandler = new NavigationHandler(page);
  }

  /**
   * Apply to a job using Easy Apply
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
    const jobContext = { company: job.company, job_title: job.title };

    try {
      // Navigate to job page
      this.reporter?.sendHeartbeat('navigating_to_job', jobContext);
      await this.navigateToJob(job);

      // Extract job description for tailoring
      this.reporter?.sendHeartbeat('extracting_description', jobContext);
      const jobDescription = await this.getJobDescription();
      if (jobDescription) job.description = jobDescription;

      // Detect and store job language
      if (jobDescription) {
        this.reporter?.sendHeartbeat('detecting_language', jobContext);
        log.debug(`🔍 Running language detection on ${jobDescription.length} chars...`);
        const langResult = detectLanguage(jobDescription);
        log.debug(`🔍 Language detection result: code=${langResult.code}, rawCode=${langResult.rawCode}, confidence=${langResult.confidence.toFixed(2)}, reason=${langResult.reason || 'none'}`);
        if (langResult.code) {
          // Always store detected language on job object for form answers and resume generation
          job.detectedLanguage = langResult.code;
          result.detectedLanguage = langResult.code;
          const langName = getLanguageName(langResult.code);
          log.info(`🌐 Detected job language: ${langName} (${langResult.code}, confidence: ${langResult.confidence.toFixed(2)})`);
          
          // Notify UI of detected language
          this.reporter?.sendHeartbeat('detecting_language', { 
            ...jobContext, 
            language: langResult.code, 
            language_name: langName 
          });

          // Check if language is accepted (if language filter is configured)
          if (this.config.jobLanguages && this.config.jobLanguages.length > 0) {
            if (!isLanguageAccepted(langResult.code, this.config.jobLanguages)) {
              log.info(`⏭️ Skipping - job is in ${langName}, not in accepted languages`);
              this.reporter?.sendHeartbeat('skipping_job', { 
                ...jobContext, 
                reason: `Job in ${langName}, not in accepted languages` 
              });
              result.languageSkipped = true;
              result.error = `Job description in ${langName}, not in accepted languages`;
              return result;
            }
          }
        }
      }

      // Start resume tailoring in background (if enabled)
      this.reporter?.sendHeartbeat('tailoring_resume', jobContext);
      await this.startResumeTailoring(job, jobDescription);

      // Open the Easy Apply modal
      this.reporter?.sendHeartbeat('opening_application', jobContext);
      const modalResult = await this.openEasyApplyModal();
      if (modalResult === 'already_applied') {
        result.alreadyApplied = true;
        result.error = 'Already applied to this job';
        log.info('⏭️ Skipping - already applied');
        this.reporter?.sendHeartbeat('skipping_job', { ...jobContext, reason: 'Already applied' });
        return result;
      }
      if (modalResult === 'failed') {
        result.error = 'Could not open Easy Apply modal';
        await this.cleanupFailure();
        // Update stats: application failed (modal issue)
        this.reporter?.sendHeartbeat('application_failed', { ...jobContext, reason: 'Could not open application form' });
        this.reporter?.incrementJobsFailed();
        return result;
      }

      // Set job context for GPT
      await this.setJobContext(job);

      // Process all pages until submission
      this.reporter?.sendHeartbeat('filling_form', { ...jobContext, step: 1 });
      const processResult = await this.processAllPages(result, jobContext);
      if (!processResult.success) {
        result.error = processResult.error;
        await this.cleanupFailure();
        // Update stats: application failed during form processing
        this.reporter?.sendHeartbeat('application_failed', { ...jobContext, reason: processResult.error });
        this.reporter?.incrementJobsFailed();
        return result;
      }

      result.success = !this.config.dryRun || true;
      if (this.config.dryRun) {
        log.info('🧪 Dry run - not actually submitted');
        await this.navHandler.closeModal();
      }

      if (result.success) {
        log.info(`✅ Successfully applied to "${job.title}" at ${job.company}`);
        // Update stats: application succeeded
        this.reporter?.sendHeartbeat('application_submitted', jobContext);
        this.reporter?.incrementJobsApplied();
      }

    } catch (error) {
      result.error = String(error);
      log.error(`Error during Easy Apply: ${error}`);
      await this.saveHtml('apply_error', result.jobTitle);
      await this.cleanupFailure();
      // Update stats: application failed due to exception
      this.reporter?.sendHeartbeat('application_failed', { ...jobContext, reason: String(error) });
      this.reporter?.incrementJobsFailed();
    }

    return result;
  }

  /**
   * Navigate to job page
   */
  private async navigateToJob(job: Job): Promise<void> {
    log.debug(`Navigating to job page: ${job.link}`);
    await this.page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(TIMEOUTS.long + Math.random() * 500);
    await this.saveHtml('job_page_loaded', job.title);
  }

  /**
   * Start resume tailoring in background
   */
  private async startResumeTailoring(job: Job, jobDescription: string): Promise<void> {
    if (this.config.useConstantResume) {
      log.info('📄 Using constant resume (tailoring disabled)');
      return;
    }

    if (!jobDescription || !this.gptAnswerer) return;

    log.info('🚀 Starting resume tailoring in background...');
    const tailoringPromise = this.generateTailoredResume(job, jobDescription)
      .catch(error => {
        log.warn(`Background resume tailoring failed: ${error}`);
        return null;
      });

    this.formHandler.setPendingTailoredResume(tailoringPromise);
  }

  /**
   * Open the Easy Apply modal
   */
  private async openEasyApplyModal(): Promise<'opened' | 'already_applied' | 'failed'> {
    try {
      if (await this.isAlreadyApplied()) return 'already_applied';

      await this.saveHtml('before_find_button');
      const button = await this.findEasyApplyButton();
      if (!button) {
        await this.saveHtml('button_not_found');
        return 'failed';
      }

      // Click or navigate
      const href = await button.getAttribute('href');
      if (href) {
        await this.page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      } else {
        await button.click();
      }

      // Wait for modal
      if (!await this.waitForModal()) {
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
   * Find the Easy Apply button
   */
  private async findEasyApplyButton() {
    for (const selector of EASY_APPLY_BUTTON_SELECTORS) {
      try {
        const buttons = this.page.locator(selector);
        await buttons.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});

        for (const button of await buttons.all()) {
          if (await button.isVisible() && await button.isEnabled()) {
            log.info(`✓ Found Easy Apply button: ${selector}`);
            return button;
          }
        }
      } catch {
        continue;
      }
    }
    log.warn('Easy Apply button not found');
    return null;
  }

  /**
   * Wait for modal to appear
   */
  private async waitForModal(): Promise<boolean> {
    log.info('Waiting for Easy Apply modal...');
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      const modalElements = await this.page.locator(MODAL.container).all();
      if (modalElements.length > 0) {
        try {
          await this.page.waitForSelector(MODAL.container, { timeout: 10000, state: 'visible' });
          log.info('✅ Easy Apply modal visible');
          return true;
        } catch {
          if (attempt < 3) await this.page.waitForTimeout(2000);
        }
      } else {
        if (attempt < 3) await this.page.waitForTimeout(3000);
      }
    }

    log.error('Easy Apply modal did not appear');
    return false;
  }

  /**
   * Check if already applied
   */
  private async isAlreadyApplied(): Promise<boolean> {
    for (const selector of ALREADY_APPLIED_SELECTORS) {
      try {
        const indicator = this.page.locator(selector).first();
        if (await indicator.count() > 0 && await indicator.isVisible()) {
          log.info('Job already applied');
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  /**
   * Set job context for GPT
   */
  private async setJobContext(job: Job): Promise<void> {
    try {
      // GPTAnswerer uses setJob(job) method
      if ('setJob' in this.gptAnswerer && typeof this.gptAnswerer.setJob === 'function') {
        this.gptAnswerer.setJob(job);
      }
    } catch {
      // GPT answerer might not support this
    }
  }

  /**
   * Process all pages until submission
   */
  private async processAllPages(
    result: EasyApplyResult, 
    jobContext: { company: string; job_title: string }
  ): Promise<{ success: boolean; error?: string }> {
    let retries = 0;
    this.formHandler.setRetryMode(false);

    for (let step = 1; step <= this.config.maxPages; step++) {
      log.info(`========== EASY-APPLY Step ${step} ==========`);
      await this.saveHtml(`step_${step}_start`);

      // Send step update to UI
      this.reporter?.sendHeartbeat('filling_form', { ...jobContext, step, total_steps: this.config.maxPages });

      if (!await this.navHandler.isModalOpen()) {
        log.info('Modal closed - application complete');
        return { success: true };
      }

      // Fill form fields
      const pageResult = await this.formHandler.fillCurrentPage();
      result.totalFields += pageResult.fieldsProcessed;
      result.failedFields += pageResult.fieldsFailed;
      log.info(`Form page: ${pageResult.fieldsProcessed - pageResult.fieldsFailed}/${pageResult.fieldsProcessed} fields filled`);
      await this.saveHtml(`step_${step}_after_fill`);

      // Click primary button
      this.reporter?.sendHeartbeat('submitting_application', jobContext);
      const navResult = await this.navHandler.clickPrimaryButton();
      
      if (!navResult.success) {
        await this.saveHtml(`step_${step}_nav_error`);

        if (await this.navHandler.hasValidationErrors()) {
          retries++;
          if (retries > this.config.maxRetries) {
            const errors = await this.navHandler.getValidationErrors();
            return { success: false, error: `Validation errors: ${errors.join(', ')}` };
          }
          log.warn(`Validation errors, retry ${retries}/${this.config.maxRetries}`);
          this.formHandler.setRetryMode(true);
          continue;
        }

        return { success: false, error: navResult.error || 'Navigation failed' };
      }

      this.formHandler.setRetryMode(false);

      if (navResult.submitted) {
        log.info('✔ Application submitted');
        await this.saveHtml('submitted_success');
        result.pagesCompleted = step;
        await this.handlePostSubmit();
        return { success: true };
      }

      await this.page.waitForTimeout(TIMEOUTS.long);
      if (!await this.navHandler.isModalOpen()) {
        log.info('Modal closed - application complete');
        result.pagesCompleted = step;
        return { success: true };
      }

      result.pagesCompleted = step;
      retries = 0;
      await this.navHandler.waitForModalReady();
    }

    return { success: false, error: `Exceeded max pages (${this.config.maxPages})` };
  }

  /**
   * Handle post-submission stabilization
   */
  private async handlePostSubmit(): Promise<void> {
    log.info('Waiting for page to stabilize...');
    await this.page.waitForTimeout(2000);
    try {
      await this.page.waitForSelector("span[data-testid='expandable-text-box']", { timeout: 3000 });
      log.info('✓ Application completed');
    } catch {
      log.debug('Job description not found after submission');
    }
  }

  /**
   * Extract job description
   */
  private async getJobDescription(): Promise<string> {
    try {
      // Try to expand "show more"
      try {
        const moreBtn = this.page.locator('button.inline-show-more-text__button, button.jobs-description__footer-button').first();
        if (await moreBtn.isVisible()) {
          await moreBtn.click();
          await this.page.waitForTimeout(350);
        }
      } catch {}

      for (const selector of JOB_DESCRIPTION_SELECTORS) {
        try {
          const element = this.page.locator(selector).first();
          await element.waitFor({ state: 'attached', timeout: 5000 });
          const text = await element.textContent();
          if (text?.trim()) {
            log.debug(`Found description (${text.length} chars)`);
            return text.trim();
          }
        } catch {
          continue;
        }
      }
      return '';
    } catch (error) {
      log.error(`Error extracting job description: ${error}`);
      return '';
    }
  }

  /**
   * Generate tailored resume
   */
  private async generateTailoredResume(job: Job, jobDescription: string): Promise<string | null> {
    try {
      const baseResumePath = getResumePath();
      if (!fs.existsSync(baseResumePath)) {
        log.error(`Resume config not found: ${baseResumePath}`);
        return null;
      }

      log.info(`🎯 Tailoring resume for ${job.company} - ${job.title}`);
      const baseResumeYaml = fs.readFileSync(baseResumePath, 'utf-8');

      if (!this.gptAnswerer.tailorResumeToJob) {
        log.warn('GPT answerer does not support resume tailoring');
        return null;
      }

      const tailoredConfigYaml = await this.gptAnswerer.tailorResumeToJob(jobDescription, baseResumeYaml);
      if (!tailoredConfigYaml || tailoredConfigYaml.length < 100) {
        log.error('Invalid tailored config');
        return null;
      }

      const result = await generateTailoredResume({
        companyName: job.company,
        jobTitle: job.title,
        tailoredConfigYaml,
        page: this.page,
        language: job.detectedLanguage,
      });

      log.info(`✅ Tailored resume: ${result.pdfPath}`);
      this.cleanupOldResumes();
      return result.pdfPath;

    } catch (error) {
      log.error(`Failed to generate tailored resume: ${error}`);
      return null;
    }
  }

  /**
   * Clean up old tailored resumes (keep last 20)
   */
  private cleanupOldResumes(): void {
    try {
      const resumesDir = getTailoredResumesPath();
      const files = fs.readdirSync(resumesDir)
        .filter(f => f.endsWith('.pdf'))
        .map(f => ({ name: f, path: `${resumesDir}/${f}`, time: fs.statSync(`${resumesDir}/${f}`).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      for (const file of files.slice(20)) {
        fs.unlinkSync(file.path);
        ['.yaml', '_scores.json'].forEach(ext => {
          const p = file.path.replace('.pdf', ext);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        });
        log.debug(`Cleaned up: ${file.name}`);
      }
    } catch {}
  }

  private async cleanupFailure(): Promise<void> {
    try {
      if (await this.navHandler.isModalOpen()) await this.navHandler.closeModal();
    } catch {}
  }

  private async saveHtml(context: string, jobTitle = ''): Promise<string | null> {
    return saveDebugHtml(this.page, context, jobTitle);
  }

  updateConfig(config: Partial<EasyApplierConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.resumePath) this.formHandler.setResumePath(config.resumePath);
    if (config.coverLetterPath) this.formHandler.setCoverLetterPath(config.coverLetterPath);
  }

  async hasEasyApply(): Promise<boolean> {
    try {
      const btn = this.page.locator('button:has-text("Easy Apply")').first();
      return await btn.count() > 0 && await btn.isVisible();
    } catch {
      return false;
    }
  }
}

export { EasyApplier as LinkedInEasyApplier };
