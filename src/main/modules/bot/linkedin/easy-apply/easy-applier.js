import { createLogger } from "../../utils/logger.js";
import { saveDebugHtml } from "../../utils/debug-html.js";
import { FormHandler } from "./form-handler.js";
import { NavigationHandler } from "./navigation.js";
import { EASY_APPLY_BUTTON_SELECTORS, ALREADY_APPLIED_SELECTORS, JOB_DESCRIPTION_SELECTORS, MODAL, TIMEOUTS } from "./selectors.js";
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
  constructor(page, gptAnswerer, savedAnswers = [], resumePath, recordCallback, reporter) {
    this.page = page;
    this.gptAnswerer = gptAnswerer;
    this.reporter = reporter;
    this.config = { ...DEFAULT_CONFIG, resumePath };
    this.formHandler = new FormHandler(page, gptAnswerer, savedAnswers, recordCallback, resumePath);
    this.navHandler = new NavigationHandler(page);
  }
  /**
   * Apply to a job using Easy Apply
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
      await this.navigateToJob(job);
      const jobDescription = await this.getJobDescription();
      if (jobDescription) job.description = jobDescription;
      await this.startResumeTailoring(job, jobDescription);
      const modalResult = await this.openEasyApplyModal();
      if (modalResult === "already_applied") {
        result.alreadyApplied = true;
        result.error = "Already applied to this job";
        log.info("\u23ED\uFE0F Skipping - already applied");
        return result;
      }
      if (modalResult === "failed") {
        result.error = "Could not open Easy Apply modal";
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
      result.success = !this.config.dryRun || true;
      if (this.config.dryRun) {
        log.info("\u{1F9EA} Dry run - not actually submitted");
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
  /**
   * Navigate to job page
   */
  async navigateToJob(job) {
    log.debug(`Navigating to job page: ${job.link}`);
    await this.page.goto(job.link, { waitUntil: "domcontentloaded", timeout: 6e4 });
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(TIMEOUTS.long + Math.random() * 500);
    await this.saveHtml("job_page_loaded", job.title);
  }
  /**
   * Start resume tailoring in background
   */
  async startResumeTailoring(job, jobDescription) {
    if (this.config.useConstantResume) {
      log.info("\u{1F4C4} Using constant resume (tailoring disabled)");
      return;
    }
    if (!jobDescription || !this.gptAnswerer) return;
    log.info("\u{1F680} Starting resume tailoring in background...");
    const tailoringPromise = this.generateTailoredResume(job, jobDescription).catch((error) => {
      log.warn(`Background resume tailoring failed: ${error}`);
      return null;
    });
    this.formHandler.setPendingTailoredResume(tailoringPromise);
  }
  /**
   * Open the Easy Apply modal
   */
  async openEasyApplyModal() {
    try {
      if (await this.isAlreadyApplied()) return "already_applied";
      await this.saveHtml("before_find_button");
      const button = await this.findEasyApplyButton();
      if (!button) {
        await this.saveHtml("button_not_found");
        return "failed";
      }
      const href = await button.getAttribute("href");
      if (href) {
        await this.page.goto(href, { waitUntil: "domcontentloaded", timeout: 6e4 });
      } else {
        await button.click();
      }
      if (!await this.waitForModal()) {
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
   * Find the Easy Apply button
   */
  async findEasyApplyButton() {
    for (const selector of EASY_APPLY_BUTTON_SELECTORS) {
      try {
        const buttons = this.page.locator(selector);
        await buttons.first().waitFor({ state: "attached", timeout: 3e3 }).catch(() => {
        });
        for (const button of await buttons.all()) {
          if (await button.isVisible() && await button.isEnabled()) {
            log.info(`\u2713 Found Easy Apply button: ${selector}`);
            return button;
          }
        }
      } catch {
        continue;
      }
    }
    log.warn("Easy Apply button not found");
    return null;
  }
  /**
   * Wait for modal to appear
   */
  async waitForModal() {
    log.info("Waiting for Easy Apply modal...");
    for (let attempt = 1; attempt <= 3; attempt++) {
      const modalElements = await this.page.locator(MODAL.container).all();
      if (modalElements.length > 0) {
        try {
          await this.page.waitForSelector(MODAL.container, { timeout: 1e4, state: "visible" });
          log.info("\u2705 Easy Apply modal visible");
          return true;
        } catch {
          if (attempt < 3) await this.page.waitForTimeout(2e3);
        }
      } else {
        if (attempt < 3) await this.page.waitForTimeout(3e3);
      }
    }
    log.error("Easy Apply modal did not appear");
    return false;
  }
  /**
   * Check if already applied
   */
  async isAlreadyApplied() {
    for (const selector of ALREADY_APPLIED_SELECTORS) {
      try {
        const indicator = this.page.locator(selector).first();
        if (await indicator.count() > 0 && await indicator.isVisible()) {
          log.info("Job already applied");
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
  async setJobContext(job) {
    try {
      const context = `Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description?.substring(0, 500) || "N/A"}`;
      await this.gptAnswerer.setJobContext(context);
    } catch {
    }
  }
  /**
   * Process all pages until submission
   */
  async processAllPages(result) {
    let retries = 0;
    this.formHandler.setRetryMode(false);
    for (let step = 1; step <= this.config.maxPages; step++) {
      log.info(`========== EASY-APPLY Step ${step} ==========`);
      await this.saveHtml(`step_${step}_start`);
      if (!await this.navHandler.isModalOpen()) {
        log.info("Modal closed - application complete");
        return { success: true };
      }
      const pageResult = await this.formHandler.fillCurrentPage();
      result.totalFields += pageResult.fieldsProcessed;
      result.failedFields += pageResult.fieldsFailed;
      log.info(`Form page: ${pageResult.fieldsProcessed - pageResult.fieldsFailed}/${pageResult.fieldsProcessed} fields filled`);
      await this.saveHtml(`step_${step}_after_fill`);
      const navResult = await this.navHandler.clickPrimaryButton();
      if (!navResult.success) {
        await this.saveHtml(`step_${step}_nav_error`);
        if (await this.navHandler.hasValidationErrors()) {
          retries++;
          if (retries > this.config.maxRetries) {
            const errors = await this.navHandler.getValidationErrors();
            return { success: false, error: `Validation errors: ${errors.join(", ")}` };
          }
          log.warn(`Validation errors, retry ${retries}/${this.config.maxRetries}`);
          this.formHandler.setRetryMode(true);
          continue;
        }
        return { success: false, error: navResult.error || "Navigation failed" };
      }
      this.formHandler.setRetryMode(false);
      if (navResult.submitted) {
        log.info("\u2714 Application submitted");
        await this.saveHtml("submitted_success");
        result.pagesCompleted = step;
        await this.handlePostSubmit();
        return { success: true };
      }
      await this.page.waitForTimeout(TIMEOUTS.long);
      if (!await this.navHandler.isModalOpen()) {
        log.info("Modal closed - application complete");
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
  async handlePostSubmit() {
    log.info("Waiting for page to stabilize...");
    await this.page.waitForTimeout(2e3);
    try {
      await this.page.waitForSelector("span[data-testid='expandable-text-box']", { timeout: 3e3 });
      log.info("\u2713 Application completed");
    } catch {
      log.debug("Job description not found after submission");
    }
  }
  /**
   * Extract job description
   */
  async getJobDescription() {
    try {
      try {
        const moreBtn = this.page.locator("button.inline-show-more-text__button, button.jobs-description__footer-button").first();
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
      return "";
    } catch (error) {
      log.error(`Error extracting job description: ${error}`);
      return "";
    }
  }
  /**
   * Generate tailored resume
   */
  async generateTailoredResume(job, jobDescription) {
    try {
      const baseResumePath = getResumePath();
      if (!fs.existsSync(baseResumePath)) {
        log.error(`Resume config not found: ${baseResumePath}`);
        return null;
      }
      log.info(`\u{1F3AF} Tailoring resume for ${job.company} - ${job.title}`);
      const baseResumeYaml = fs.readFileSync(baseResumePath, "utf-8");
      const tailoredConfigYaml = await this.gptAnswerer.tailorResumeToJob(jobDescription, baseResumeYaml);
      if (!tailoredConfigYaml || tailoredConfigYaml.length < 100) {
        log.error("Invalid tailored config");
        return null;
      }
      const result = await generateTailoredResume({
        companyName: job.company,
        jobTitle: job.title,
        tailoredConfigYaml,
        page: this.page
      });
      log.info(`\u2705 Tailored resume: ${result.pdfPath}`);
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
  cleanupOldResumes() {
    try {
      const resumesDir = getTailoredResumesPath();
      const files = fs.readdirSync(resumesDir).filter((f) => f.endsWith(".pdf")).map((f) => ({ name: f, path: `${resumesDir}/${f}`, time: fs.statSync(`${resumesDir}/${f}`).mtime.getTime() })).sort((a, b) => b.time - a.time);
      for (const file of files.slice(20)) {
        fs.unlinkSync(file.path);
        [".yaml", "_scores.json"].forEach((ext) => {
          const p = file.path.replace(".pdf", ext);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        });
        log.debug(`Cleaned up: ${file.name}`);
      }
    } catch {
    }
  }
  async cleanupFailure() {
    try {
      if (await this.navHandler.isModalOpen()) await this.navHandler.closeModal();
    } catch {
    }
  }
  async saveHtml(context, jobTitle = "") {
    return saveDebugHtml(this.page, context, jobTitle);
  }
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    if (config.resumePath) this.formHandler.setResumePath(config.resumePath);
    if (config.coverLetterPath) this.formHandler.setCoverLetterPath(config.coverLetterPath);
  }
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
