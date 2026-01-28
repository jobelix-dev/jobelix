import { createLogger } from "../../utils/logger.js";
import { FormHandler } from "./form-handler.js";
import { NavigationHandler } from "./navigation.js";
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
      const modalOpened = await this.openEasyApplyModal();
      if (!modalOpened) {
        result.error = "Could not open Easy Apply modal";
        log.error(result.error);
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
        const submitResult = await this.handleSubmission();
        result.success = submitResult.success;
        if (!submitResult.success) {
          result.error = submitResult.error;
        }
      } else {
        log.info("\u{1F9EA} Dry run mode - skipping actual submission");
        result.success = true;
        await this.navHandler.closeModal();
      }
      if (result.success) {
        log.info(`\u2705 Successfully applied to "${job.title}" at ${job.company}`);
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
  async openEasyApplyModal() {
    try {
      const easyApplySelectors = [
        "button.jobs-apply-button",
        'button[data-control-name="jobdetails_topcard_inapply"]',
        'button:has-text("Easy Apply")',
        ".jobs-s-apply button"
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
        log.warn("Easy Apply button not found");
        return false;
      }
      await easyApplyButton.click();
      await this.page.waitForSelector("[data-test-modal]", { timeout: 1e4 });
      await this.navHandler.waitForModalReady();
      log.debug("Easy Apply modal opened");
      return true;
    } catch (error) {
      log.error(`Failed to open Easy Apply modal: ${error}`);
      return false;
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
   */
  async processAllPages(result) {
    let retries = 0;
    while (result.pagesCompleted < this.config.maxPages) {
      const state = await this.navHandler.getModalState();
      log.debug(`Page ${result.pagesCompleted + 1}, state: ${state}`);
      if (state === "success") {
        return { success: true };
      }
      if (state === "submit") {
        return { success: true };
      }
      if (state === "closed") {
        return { success: false, error: "Modal was closed unexpectedly" };
      }
      if (state === "unknown") {
        retries++;
        if (retries > this.config.maxRetries) {
          return { success: false, error: "Unable to determine modal state" };
        }
        await this.page.waitForTimeout(1e3);
        continue;
      }
      const pageResult = await this.formHandler.fillCurrentPage();
      result.totalFields += pageResult.fieldsProcessed;
      result.failedFields += pageResult.fieldsFailed;
      let navResult;
      if (state === "review") {
        navResult = await this.navHandler.clickReview();
      } else {
        navResult = await this.navHandler.clickNext();
      }
      if (!navResult.success) {
        if (await this.navHandler.hasValidationErrors()) {
          retries++;
          if (retries > this.config.maxRetries) {
            const errors = await this.navHandler.getValidationErrors();
            return {
              success: false,
              error: `Validation errors: ${errors.join(", ")}`
            };
          }
          log.warn(`Validation errors, retry ${retries}/${this.config.maxRetries}`);
          continue;
        }
        return { success: false, error: navResult.error };
      }
      result.pagesCompleted++;
      retries = 0;
      await this.navHandler.waitForModalReady();
    }
    return { success: false, error: `Exceeded maximum pages (${this.config.maxPages})` };
  }
  /**
   * Handle the final submission step
   */
  async handleSubmission() {
    const state = await this.navHandler.getModalState();
    if (state !== "submit") {
      log.warn(`Expected submit state, got: ${state}`);
    }
    const result = await this.navHandler.clickSubmit();
    if (result.success) {
      await this.page.waitForTimeout(2e3);
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
  async cleanupFailure() {
    try {
      if (await this.navHandler.isModalOpen()) {
        await this.navHandler.closeModal();
      }
    } catch {
    }
  }
  /**
   * Update configuration
   */
  updateConfig(config) {
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
  async hasEasyApply() {
    try {
      const easyApplyButton = this.page.locator('button:has-text("Easy Apply")').first();
      return await easyApplyButton.count() > 0 && await easyApplyButton.isVisible();
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
