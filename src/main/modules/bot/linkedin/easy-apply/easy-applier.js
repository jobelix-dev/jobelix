import { createLogger } from "../../utils/logger.js";
import { saveDebugHtml } from "../../utils/debug-html.js";
import { FormHandler } from "./form-handler.js";
import { NavigationHandler } from "./navigation.js";
import {
  EASY_APPLY_BUTTON_SELECTORS,
  ALREADY_APPLIED_SELECTORS,
  JOB_DESCRIPTION_SELECTORS,
  MODAL
} from "./selectors.js";
import { getResumePath, getTailoredResumesPath } from "../../utils/paths.js";
import { generateTailoredResume } from "../../models/resume-generator.js";
import * as fs from "fs";
const log = createLogger("EasyApplier");
const DEFAULT_CONFIG = {
  maxPages: 15,
  maxRetries: 3,
  skipOnError: true,
  dryRun: false
};
class EasyApplier {
  /**
   * Create a new Easy Applier instance 
   * @param page - Playwright page with job posting open
   * @param gptAnswerer - GPT answerer for generating form responses
   * @param savedAnswers - Previously saved Q&A pairs
   * @param resumePath - Path to resume PDF file
   * @param recordCallback - Callback to persist new answers
   * @param reporter - Status reporter for UI updates
   */
  constructor(page, gptAnswerer, savedAnswers = [], resumePath, recordCallback, reporter) {
    this.page = page;
    this.gptAnswerer = gptAnswerer;
    this.savedAnswers = savedAnswers;
    this.recordCallback = recordCallback;
    this.reporter = reporter;
    this.config = {
      ...DEFAULT_CONFIG,
      resumePath
    };
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
  async saveHtml(context, jobTitle = "") {
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
  async apply(job) {
    const result = {
      success: false,
      jobTitle: job.title,
      company: job.company,
      pagesCompleted: 0,
      totalFields: 0,
      failedFields: 0
    };
    log.info(`\u{1F3AF} Starting Easy Apply: "${job.title}" at ${job.company}`);
    try {
      log.debug(`Navigating to job page: ${job.link}`);
      await this.page.goto(job.link, {
        waitUntil: "domcontentloaded",
        timeout: 6e4
      });
      await this.page.waitForLoadState("domcontentloaded");
      await this.page.waitForTimeout(1e3 + Math.random() * 500);
      log.debug("Job page loaded");
      await this.saveHtml("job_page_loaded", job.title);
      const jobDescription = await this.getJobDescription();
      if (jobDescription) {
        job.description = jobDescription;
        log.debug(`Job description extracted: ${jobDescription.length} chars`);
      }
      let tailoringPromise = null;
      if (this.config.useConstantResume) {
        log.info(`\u{1F4C4} Using constant resume (tailoring disabled)`);
      } else if (jobDescription && this.gptAnswerer) {
        log.info("\u{1F680} Starting resume tailoring in background...");
        tailoringPromise = this.generateTailoredResume(job, jobDescription).catch((error) => {
          log.warn(`Background resume tailoring failed: ${error}`);
          return null;
        });
        this.formHandler.setPendingTailoredResume(tailoringPromise);
      }
      const modalResult = await this.openEasyApplyModal();
      if (modalResult === "already_applied") {
        result.error = "Already applied to this job";
        result.alreadyApplied = true;
        log.info("\u23ED\uFE0F Skipping - already applied to this job");
        return result;
      }
      if (modalResult === "failed") {
        result.error = "Could not open Easy Apply modal";
        log.error(result.error);
        await this.cleanupFailure();
        return result;
      }
      await this.setJobContext(job);
      const processResult = await this.processAllPages(result);
      if (!processResult.success) {
        result.error = processResult.error;
        await this.cleanupFailure();
        return result;
      }
      if (!this.config.dryRun) {
        result.success = processResult.success;
      } else {
        log.info("\u{1F9EA} Dry run mode - application was not actually submitted");
        result.success = true;
        await this.navHandler.closeModal();
      }
      if (result.success) {
        log.info(`\u2705 Successfully applied to "${job.title}" at ${job.company}`);
      }
    } catch (error) {
      result.error = String(error);
      log.error(`Error during Easy Apply: ${error}`);
      await this.saveHtml("apply_error", result.jobTitle);
      await this.cleanupFailure();
    }
    return result;
  }
  /** Check if job was already applied to */
  async isAlreadyApplied() {
    try {
      for (const selector of ALREADY_APPLIED_SELECTORS) {
        try {
          const indicator = this.page.locator(selector).first();
          if (await indicator.count() > 0 && await indicator.isVisible()) {
            log.info(`Job already applied (found indicator)`);
            return true;
          }
        } catch {
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
  /** Open the Easy Apply modal */
  async openEasyApplyModal() {
    try {
      if (await this.isAlreadyApplied()) {
        log.warn("Job already applied - skipping");
        return "already_applied";
      }
      await this.saveHtml("before_find_button");
      let easyApplyButton;
      let buttonLabel = "";
      for (const selector of EASY_APPLY_BUTTON_SELECTORS) {
        try {
          const buttons = this.page.locator(selector);
          await buttons.first().waitFor({ state: "attached", timeout: 3e3 }).catch(() => {
          });
          for (const button of await buttons.all()) {
            try {
              if (await button.isVisible() && await button.isEnabled()) {
                easyApplyButton = button;
                buttonLabel = (await button.textContent())?.trim() || await button.getAttribute("aria-label") || "";
                log.info(`\u2713 Found Easy Apply button: ${selector}`);
                break;
              }
            } catch {
              continue;
            }
          }
          if (easyApplyButton) break;
        } catch {
          continue;
        }
      }
      if (!easyApplyButton) {
        log.warn("Easy Apply button not found");
        await this.saveHtml("button_not_found");
        return "failed";
      }
      const href = await easyApplyButton.getAttribute("href");
      if (href) {
        log.info(`Navigating to apply URL`);
        await this.page.goto(href, { waitUntil: "domcontentloaded", timeout: 6e4 });
      } else {
        log.info("Clicking Easy Apply button");
        await easyApplyButton.click();
      }
      log.info("Waiting for Easy Apply modal...");
      const maxAttempts = 3;
      let modalFound = false;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const modalElements = await this.page.locator(MODAL.container).all();
        if (modalElements.length > 0) {
          try {
            await this.page.waitForSelector(MODAL.container, { timeout: 1e4, state: "visible" });
            modalFound = true;
            log.info("\u2705 Easy Apply modal visible");
            break;
          } catch {
            if (attempt < maxAttempts) await this.page.waitForTimeout(2e3);
          }
        } else {
          if (attempt < maxAttempts) await this.page.waitForTimeout(3e3);
        }
      }
      if (!modalFound) {
        log.error("Easy Apply modal did not appear");
        await this.saveHtml("modal_not_opened");
        return "failed";
      }
      await this.navHandler.waitForModalReady();
      await this.saveHtml("modal_opened");
      return "opened";
    } catch (error) {
      log.error(`Failed to open Easy Apply modal: ${error}`);
      await this.saveHtml("modal_open_error");
      return "failed";
    }
  }
  /**
   * Set job context for GPT to provide better answers
   */
  async setJobContext(job) {
    try {
      const context = `
Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description?.substring(0, 500) || "N/A"}
      `.trim();
      await this.gptAnswerer.setJobContext(context);
      log.debug("Job context set for GPT");
    } catch {
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
  async processAllPages(result) {
    let retries = 0;
    let step = 0;
    while (step < this.config.maxPages) {
      step++;
      log.info(`========== EASY-APPLY Step ${step} ==========`);
      await this.saveHtml(`step_${step}_start`);
      const isModalOpen = await this.navHandler.isModalOpen();
      if (!isModalOpen) {
        log.info("Modal closed - application complete");
        return { success: true };
      }
      log.debug(`Step ${step}.1: Filling form fields`);
      const pageResult = await this.formHandler.fillCurrentPage();
      result.totalFields += pageResult.fieldsProcessed;
      result.failedFields += pageResult.fieldsFailed;
      log.info(`Form page complete: ${pageResult.fieldsProcessed - pageResult.fieldsFailed}/${pageResult.fieldsProcessed} fields filled`);
      await this.saveHtml(`step_${step}_after_fill`);
      log.debug(`Step ${step}.2: Clicking primary action button`);
      const navResult = await this.navHandler.clickPrimaryButton();
      if (!navResult.success) {
        await this.saveHtml(`step_${step}_nav_error`);
        if (await this.navHandler.hasValidationErrors()) {
          retries++;
          if (retries > this.config.maxRetries) {
            const errors = await this.navHandler.getValidationErrors();
            await this.saveHtml(`step_${step}_validation_failed`);
            return {
              success: false,
              error: `Validation errors: ${errors.join(", ")}`
            };
          }
          log.warn(`Validation errors on step ${step}, retry ${retries}/${this.config.maxRetries}`);
          continue;
        }
        return { success: false, error: navResult.error || "Navigation failed" };
      }
      if (navResult.submitted) {
        log.info("Application submitted successfully \u2714");
        await this.saveHtml("submitted_success");
        result.pagesCompleted = step;
        await this.handlePostSubmit();
        return { success: true };
      }
      await this.page.waitForTimeout(1e3);
      const stillOpen = await this.navHandler.isModalOpen();
      if (!stillOpen) {
        log.info("Modal closed after navigation - application complete");
        result.pagesCompleted = step;
        return { success: true };
      }
      result.pagesCompleted = step;
      retries = 0;
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
  async handleSubmission() {
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
  async handlePostSubmit() {
    try {
      log.info("Application submitted - waiting for page to stabilize...");
      await this.page.waitForTimeout(2e3);
      try {
        await this.page.waitForSelector("span[data-testid='expandable-text-box']", { timeout: 3e3 });
        log.info("\u2713 Application completed successfully");
      } catch {
        log.debug("Job description not found after submission - might have navigated away");
      }
    } catch (error) {
      log.warn(`Post-submission check encountered issue: ${error}`);
      log.info("Proceeding despite post-submission check failure");
    }
  }
  /**
   * Clean up after a failed application
   */
  async cleanupFailure() {
    try {
      if (await this.navHandler.isModalOpen()) {
        await this.navHandler.closeModal();
      }
    } catch {
    }
  }
  /** Extract job description using multiple selectors */
  async getJobDescription() {
    try {
      try {
        const moreBtn = this.page.locator(
          "button.inline-show-more-text__button, button.jobs-description__footer-button"
        ).first();
        if (await moreBtn.isVisible()) {
          await moreBtn.click();
          await this.page.waitForTimeout(350);
        }
      } catch {
      }
      for (const selector of JOB_DESCRIPTION_SELECTORS) {
        try {
          const element = this.page.locator(selector).first();
          await element.waitFor({ state: "attached", timeout: 5e3 });
          const text = await element.textContent();
          if (text?.trim()) {
            log.debug(`Found description (${text.length} chars)`);
            return text.trim();
          }
        } catch {
          continue;
        }
      }
      log.warn("Could not find job description");
      return "";
    } catch (error) {
      log.error(`Error extracting job description: ${error}`);
      return "";
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
  async generateTailoredResume(job, jobDescription) {
    try {
      const baseResumePath = getResumePath();
      if (!fs.existsSync(baseResumePath)) {
        log.error(`Resume config not found: ${baseResumePath}`);
        log.error("Cannot tailor resume without base resume.yaml file");
        return null;
      }
      log.info(`\u{1F3AF} Tailoring resume for ${job.company} - ${job.title}`);
      log.debug(`Using base resume config: ${baseResumePath}`);
      const baseResumeYaml = fs.readFileSync(baseResumePath, "utf-8");
      const tailoredConfigYaml = await this.gptAnswerer.tailorResumeToJob(
        jobDescription,
        baseResumeYaml
      );
      if (!tailoredConfigYaml || tailoredConfigYaml.length < 100) {
        log.error("Invalid tailored config received from API");
        return null;
      }
      const result = await generateTailoredResume({
        companyName: job.company,
        jobTitle: job.title,
        tailoredConfigYaml,
        page: this.page
        // Pass page for Playwright PDF generation
      });
      log.info(`\u2705 Tailored resume generated: ${result.pdfPath}`);
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
  cleanupOldResumes() {
    try {
      const resumesDir = getTailoredResumesPath();
      const files = fs.readdirSync(resumesDir).filter((f) => f.endsWith(".pdf")).map((f) => ({
        name: f,
        path: `${resumesDir}/${f}`,
        time: fs.statSync(`${resumesDir}/${f}`).mtime.getTime()
      })).sort((a, b) => b.time - a.time);
      const toDelete = files.slice(20);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        const yamlPath = file.path.replace(".pdf", ".yaml");
        const scoresPath = file.path.replace(".pdf", "_scores.json");
        if (fs.existsSync(yamlPath)) fs.unlinkSync(yamlPath);
        if (fs.existsSync(scoresPath)) fs.unlinkSync(scoresPath);
        log.debug(`Cleaned up old resume: ${file.name}`);
      }
      if (toDelete.length > 0) {
        log.info(`\u{1F9F9} Cleaned up ${toDelete.length} old tailored resumes`);
      }
    } catch (error) {
      log.debug(`Error cleaning up old resumes: ${error}`);
    }
  }
  /** Update configuration */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    if (config.resumePath) this.formHandler.setResumePath(config.resumePath);
    if (config.coverLetterPath) this.formHandler.setCoverLetterPath(config.coverLetterPath);
  }
  /** Check if a job has Easy Apply option */
  async hasEasyApply() {
    try {
      const btn = this.page.locator('button:has-text("Easy Apply")').first();
      return await btn.count() > 0 && await btn.isVisible();
    } catch {
      return false;
    }
  }
}
export {
  EasyApplier,
  EasyApplier as LinkedInEasyApplier
};
//# sourceMappingURL=easy-applier.js.map
