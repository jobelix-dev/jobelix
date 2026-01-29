import * as fs from "fs";
import * as path from "path";
import { createLogger } from "../../utils/logger.js";
import { getDebugHtmlPath } from "../../utils/paths.js";
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
   * Save debug HTML snapshot for debugging purposes
   * Matches Python's save_debug_html() method
   */
  async saveDebugHtml(context, jobTitle = "") {
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const safeTitle = jobTitle.replace(/\s+/g, "_").replace(/[/\\]/g, "_").slice(0, 50);
      const filename = safeTitle ? `${context}_${safeTitle}_${timestamp}.html` : `${context}_${timestamp}.html`;
      const debugDir = getDebugHtmlPath();
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const filepath = path.join(debugDir, filename);
      const htmlContent = await this.page.content();
      const url = this.page.url();
      const fullContent = `<!-- Debug HTML Snapshot -->
<!-- Context: ${context} -->
<!-- Job Title: ${jobTitle || "N/A"} -->
<!-- URL: ${url} -->
<!-- Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()} -->

${htmlContent}`;
      fs.writeFileSync(filepath, fullContent, "utf-8");
      log.info(`\u{1F4F8} Saved debug HTML: ${filepath}`);
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
      await this.saveDebugHtml("job_page_loaded", job.title);
      const jobDescription = await this.getJobDescription();
      if (jobDescription) {
        job.description = jobDescription;
        log.debug(`Job description extracted: ${jobDescription.length} chars`);
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
      await this.saveDebugHtml("apply_error", result.jobTitle);
      await this.cleanupFailure();
    }
    return result;
  }
  /**
   * Check if the job has already been applied to
   * 
   * Looks for "Applied" or "Application sent" indicators on the page
   */
  async isAlreadyApplied() {
    try {
      const appliedIndicators = [
        ".jobs-details-top-card__apply-status--applied",
        'span:has-text("Applied")',
        'span:has-text("Application sent")',
        'span:has-text("Candidature envoy\xE9e")',
        // French
        'span:has-text("Candidatura enviada")',
        // Spanish
        'span:has-text("Bewerbung gesendet")',
        // German
        '.artdeco-inline-feedback--success:has-text("Applied")'
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
  async openEasyApplyModal() {
    try {
      if (await this.isAlreadyApplied()) {
        log.warn("Job already applied - skipping");
        return "already_applied";
      }
      await this.saveDebugHtml("before_find_button");
      const selectors = [
        '[data-view-name="job-apply-button"]',
        // Most reliable - works for both button and link
        "button.jobs-apply-button",
        // English button version
        'a[aria-label*="Easy Apply"]',
        // English link
        'a[aria-label*="Candidature simplifi\xE9e"]',
        // French "Candidature simplifiée pour ce poste"
        'button[aria-label*="Postuler"]',
        // French button "Postuler via Easy Apply"
        'a[aria-label*="Candidatar"]',
        // Spanish
        'button[aria-label*="Bewerben"]',
        // German
        'button[data-control-name="jobdetails_topcard_inapply"]',
        ".jobs-s-apply button"
      ];
      let easyApplyButton;
      let buttonLabel = "";
      for (const selector of selectors) {
        try {
          log.debug(`Trying selector: ${selector}`);
          const buttons = this.page.locator(selector);
          await buttons.first().waitFor({ state: "attached", timeout: 3e3 }).catch(() => {
          });
          const allButtons = await buttons.all();
          if (allButtons.length === 0) {
            log.debug(`No buttons found with selector: ${selector}`);
            continue;
          }
          for (let i = 0; i < allButtons.length; i++) {
            const button = allButtons[i];
            try {
              if (await button.isVisible() && await button.isEnabled()) {
                easyApplyButton = button;
                buttonLabel = (await button.textContent())?.trim() || await button.getAttribute("aria-label") || "";
                log.info(`\u2713 Found Easy Apply button #${i} using selector: ${selector}`);
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
        log.warn("Easy Apply button not found with any selector");
        await this.saveDebugHtml("button_not_found");
        return "failed";
      }
      const href = await easyApplyButton.getAttribute("href");
      if (href) {
        log.info(`Navigating to apply URL: ${href}`);
        await this.page.goto(href, { waitUntil: "domcontentloaded", timeout: 6e4 });
      } else {
        log.info("Clicking Easy Apply button");
        await easyApplyButton.click();
      }
      log.info("Waiting for Easy Apply modal to load...");
      const maxAttempts = 3;
      let modalFound = false;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        log.debug(`Modal wait attempt ${attempt}/${maxAttempts}`);
        const modalElements = await this.page.locator("div.jobs-easy-apply-modal").all();
        if (modalElements.length > 0) {
          log.debug(`Modal exists in DOM (${modalElements.length} elements), checking visibility...`);
          try {
            await this.page.waitForSelector("div.jobs-easy-apply-modal", {
              timeout: 1e4,
              state: "visible"
            });
            modalFound = true;
            log.info("\u2705 Easy Apply modal is now visible");
            break;
          } catch {
            log.debug(`Modal exists but not visible yet on attempt ${attempt}`);
            if (attempt < maxAttempts) {
              await this.page.waitForTimeout(2e3);
            }
          }
        } else {
          log.debug(`Modal not in DOM yet on attempt ${attempt}`);
          if (attempt < maxAttempts) {
            await this.page.waitForTimeout(3e3);
          }
        }
      }
      if (!modalFound) {
        log.error("Easy Apply modal did not appear after 3 attempts");
        await this.saveDebugHtml("modal_not_opened");
        return "failed";
      }
      await this.navHandler.waitForModalReady();
      await this.saveDebugHtml("modal_opened");
      log.debug("Easy Apply modal opened successfully");
      return "opened";
    } catch (error) {
      log.error(`Failed to open Easy Apply modal: ${error}`);
      await this.saveDebugHtml("modal_open_error");
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
      await this.saveDebugHtml(`step_${step}_start`);
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
      await this.saveDebugHtml(`step_${step}_after_fill`);
      log.debug(`Step ${step}.2: Clicking primary action button`);
      const navResult = await this.navHandler.clickPrimaryButton();
      if (!navResult.success) {
        await this.saveDebugHtml(`step_${step}_nav_error`);
        if (await this.navHandler.hasValidationErrors()) {
          retries++;
          if (retries > this.config.maxRetries) {
            const errors = await this.navHandler.getValidationErrors();
            await this.saveDebugHtml(`step_${step}_validation_failed`);
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
        await this.saveDebugHtml("submitted_success");
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
  /**
   * Extract job description from the job page
   * 
   * Matches Python bot's _get_job_description() with 6+ fallback selectors
   */
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
      try {
        const descSpan = this.page.locator('span[data-testid="expandable-text-box"]').first();
        await descSpan.waitFor({ state: "attached", timeout: 1e4 });
        const text = await descSpan.textContent();
        if (text && text.trim()) {
          log.debug(`Found description using data-testid selector (${text.length} chars)`);
          return text.trim();
        }
      } catch {
        log.debug('data-testid="expandable-text-box" selector not found');
      }
      try {
        const detailsDiv = this.page.locator("#job-details").first();
        if (await detailsDiv.isVisible()) {
          const text = await detailsDiv.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
      }
      try {
        const container = this.page.locator(
          "article.jobs-description__container .jobs-box__html-content"
        ).first();
        await container.waitFor({ state: "attached", timeout: 5e3 });
        const text = await container.textContent();
        if (text && text.trim()) {
          return text.trim();
        }
      } catch {
      }
      try {
        const stretchDiv = this.page.locator("div.jobs-description-content__text--stretch").first();
        if (await stretchDiv.isVisible()) {
          const text = await stretchDiv.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
      }
      try {
        const descDiv = this.page.locator("div.jobs-description").first();
        if (await descDiv.isVisible()) {
          const text = await descDiv.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
      }
      log.warn("Could not find job description using any selector");
      return "";
    } catch (error) {
      log.error(`Error extracting job description: ${error}`);
      return "";
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
