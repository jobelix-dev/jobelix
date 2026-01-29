import * as path from "path";
import { createJob, isBlacklisted } from "../models/job.js";
import { createLogger } from "../utils/logger.js";
import { getOutputFolderPath, getOldQuestionsPath } from "../utils/paths.js";
import { saveDebugHtml } from "../utils/debug-html.js";
import { waitRandom, DELAYS } from "../utils/delays.js";
import { buildSearchUrl } from "../core/config-validator.js";
import { LinkedInEasyApplier } from "./easy-apply/easy-applier.js";
import { loadSavedAnswers, saveAnswer, appendJobResult } from "../utils/csv-utils.js";
const log = createLogger("JobManager");
class LinkedInJobManager {
  constructor(page, reporter) {
    this.page = page;
    this.reporter = reporter;
    this.seenJobs = /* @__PURE__ */ new Set();
    this.oldAnswers = [];
    this.baseSearchUrl = "";
    this.companyBlacklist = [];
    this.titleBlacklist = [];
    this.positions = [];
    this.locations = [];
    this.outputDir = "";
    this.easyApplier = null;
    this.gptAnswerer = null;
    this.lastHeartbeat = Date.now();
    this.outputDir = getOutputFolderPath();
    this.loadOldAnswers();
  }
  /**
   * Configure job search parameters
   */
  setParameters(config, resumePath) {
    this.companyBlacklist = config.companyBlacklist;
    this.titleBlacklist = config.titleBlacklist;
    this.positions = config.positions;
    this.locations = config.locations;
    this.baseSearchUrl = buildSearchUrl(config);
    this.resumePath = resumePath;
    log.info(`Parameters set: ${this.positions.length} positions, ${this.locations.length} locations`);
  }
  /**
   * Set the GPT answerer for AI-powered form filling
   */
  setGptAnswerer(gptAnswerer) {
    this.gptAnswerer = gptAnswerer;
  }
  /**
   * Start the job application process
   */
  async startApplying() {
    if (!this.gptAnswerer) {
      throw new Error("GPT Answerer must be set before applying");
    }
    log.info("Initializing Easy Applier");
    this.easyApplier = new LinkedInEasyApplier(
      this.page,
      this.gptAnswerer,
      this.oldAnswers,
      this.resumePath,
      (type, question, answer) => this.recordAnswer(type, question, answer),
      this.reporter
    );
    const searches = this.generateSearchCombinations();
    log.info(`Generated ${searches.length} search combinations`);
    let totalJobsFound = 0;
    for (const { position, location } of searches) {
      log.info(`Starting search for ${position} in ${location}`);
      if (this.reporter) {
        const shouldContinue = this.reporter.sendHeartbeat("searching_jobs", {
          query: position,
          location
        });
        if (!shouldContinue) {
          log.warn("Session stopped by user during job search");
          this.reporter.completeSession(false, "Stopped by user during search");
          return;
        }
      }
      let page = 0;
      let emptyPages = 0;
      const maxEmptyPages = 3;
      try {
        while (emptyPages < maxEmptyPages) {
          log.info(`Going to job page ${page}`);
          await this.navigateToSearchPage(position, location, page);
          await waitRandom(this.page, DELAYS.CLICK);
          log.info("Starting the application process for this page...");
          if (this.reporter && Date.now() - this.lastHeartbeat > 45e3) {
            const shouldContinue = this.reporter.sendHeartbeat("applying_jobs", {
              position,
              location,
              page
            });
            this.lastHeartbeat = Date.now();
            if (!shouldContinue) {
              log.warn("Session stopped by user during job application");
              this.reporter.completeSession(false, "Stopped by user");
              return;
            }
          }
          const jobsFound = await this.applyToJobs();
          totalJobsFound += jobsFound;
          if (jobsFound === 0) {
            emptyPages++;
            log.warn(`No jobs found on page ${page} (${emptyPages}/${maxEmptyPages} empty pages)`);
            if (emptyPages >= maxEmptyPages) {
              log.info(`Stopping search: ${maxEmptyPages} consecutive empty pages reached`);
              break;
            }
          } else {
            emptyPages = 0;
          }
          log.info("Applications on this page completed \u2714");
          page++;
          await waitRandom(this.page, DELAYS.BETWEEN_PAGES);
        }
      } catch (error) {
        if (this.isBrowserClosed(error)) {
          log.error("Browser was closed by user or crashed");
          throw new Error("Browser closed - stopping bot");
        }
        log.error(`Error on page ${page}: ${error}`);
        break;
      }
    }
    if (this.reporter) {
      if (totalJobsFound === 0) {
        log.info("No matching jobs found - completing session");
        this.reporter.completeSession(true, "No matching jobs found");
      } else {
        log.info(`Session complete - processed ${totalJobsFound} jobs`);
        this.reporter.completeSession(true, `Processed ${totalJobsFound} jobs`);
      }
    }
  }
  /**
   * Apply to all jobs on the current page
   */
  async applyToJobs() {
    try {
      const noResultsElement = this.page.locator(".artdeco-empty-state__headline");
      const noResultsElements = await noResultsElement.all();
      for (const el of noResultsElements) {
        const text = await el.textContent();
        if (text?.toLowerCase().includes("no results found")) {
          log.warn('No jobs found - LinkedIn shows "no results found" message');
          return 0;
        }
      }
      log.info("Fetching job results");
      const jobTileSelectors = [
        "li[data-occludable-job-id]",
        ".jobs-search-results__list-item",
        ".job-card-container",
        ".scaffold-layout__list-container li"
      ];
      let tiles = [];
      for (const selector of jobTileSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5e3 });
          tiles = await this.page.locator(selector).all();
          if (tiles.length > 0) {
            log.debug(`Found ${tiles.length} jobs using selector: ${selector}`);
            break;
          }
        } catch {
          log.debug(`No jobs found with selector: ${selector}`);
        }
      }
      if (tiles.length === 0) {
        log.info("\u26A0\uFE0F No job tiles found on this page - likely reached end of results");
        await saveDebugHtml(this.page, "no_jobs_found");
        return 0;
      }
      log.info(`Found ${tiles.length} job tiles`);
      if (this.reporter) {
        this.reporter.incrementJobsFound(tiles.length);
        const shouldContinue = this.reporter.sendHeartbeat("jobs_found", { count: tiles.length });
        if (!shouldContinue) {
          log.warn("Session stopped by user after finding jobs");
          this.reporter.completeSession(false, "Stopped by user");
          return 0;
        }
      }
      for (const tile of tiles) {
        try {
          await tile.scrollIntoViewIfNeeded();
        } catch (error) {
          log.warn(`Failed to scroll tile into view: ${error}`);
        }
      }
      const jobs = [];
      for (const tile of tiles) {
        const job = await this.extractJobFromTile(tile);
        jobs.push(job);
      }
      log.debug(`Extracted ${jobs.length} jobs`);
      for (const job of jobs) {
        if (isBlacklisted(job, this.companyBlacklist, this.titleBlacklist, this.seenJobs)) {
          log.warn(`Blacklisted ${job.title} at ${job.company}, skipping...`);
          this.writeToFile(job, "skipped");
          continue;
        }
        try {
          if (!["Continue", "Applied", "Apply"].includes(job.applyMethod)) {
            const result = await this.easyApplier.apply(job);
            if (result.alreadyApplied) {
              log.info(`Already applied to ${job.title} at ${job.company}, skipping`);
              this.writeToFile(job, "skipped");
              this.seenJobs.add(job.link);
              continue;
            }
            if (!result.success && result.error?.includes("Could not open Easy Apply modal")) {
              log.warn(`No Easy Apply available for ${job.title} at ${job.company}, skipping`);
              this.writeToFile(job, "skipped");
              continue;
            }
            if (!result.success) {
              throw new Error(result.error || "Application failed");
            }
          }
          this.writeToFile(job, "success");
          this.seenJobs.add(job.link);
        } catch (error) {
          await saveDebugHtml(this.page, `job_apply_error_${job.company.replace(/\s+/g, "_")}`);
          this.writeToFile(job, "failed");
          log.error(`apply_jobs failed for ${job.title} at ${job.company}: ${error}`);
          await this.page.waitForTimeout(3e3 + Math.random() * 2e3);
        }
      }
      return jobs.length;
    } catch (error) {
      await saveDebugHtml(this.page, "apply_jobs_exception");
      throw error;
    }
  }
  /**
   * Extract job information from a tile element
   */
  async extractJobFromTile(tile) {
    let title = "";
    let company = "";
    let location = "";
    let link = "";
    let applyMethod = "";
    try {
      const aTag = tile.locator("a.job-card-container__link");
      title = (await aTag.textContent() || "").trim();
      const href = await aTag.getAttribute("href");
      if (href) {
        const cleanHref = href.split("?")[0];
        link = cleanHref.startsWith("/") ? `https://www.linkedin.com${cleanHref}` : cleanHref;
      }
    } catch (error) {
      log.error(`[extract] title/link failed: ${error}`);
    }
    try {
      const companySpan = tile.locator(".artdeco-entity-lockup__subtitle span").first();
      company = (await companySpan.textContent() || "").trim();
    } catch (error) {
      log.error(`[extract] company failed: ${error}`);
    }
    try {
      const locationSpan = tile.locator("ul.job-card-container__metadata-wrapper li span").first();
      location = (await locationSpan.textContent() || "").trim();
    } catch (error) {
      log.error(`[extract] location failed: ${error}`);
    }
    try {
      const footerItems = await tile.locator("ul.job-card-list__footer-wrapper li").all();
      for (const li of footerItems) {
        const text = (await li.textContent() || "").trim();
        if (text && !["ago", "viewed", "promoted"].some((kw) => text.toLowerCase().includes(kw))) {
          applyMethod = text;
          break;
        }
      }
    } catch {
      applyMethod = "Applied";
    }
    return createJob(title, company, location, link, applyMethod);
  }
  /**
   * Navigate to a job search page
   */
  async navigateToSearchPage(position, location, page) {
    const encodedPosition = encodeURIComponent(position);
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.linkedin.com/jobs/search/${this.baseSearchUrl}&keywords=${encodedPosition}&location=${encodedLocation}&start=${page * 25}`;
    log.debug(`Navigating to: ${url}`);
    try {
      await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 6e4 });
      await this.page.waitForLoadState("networkidle", { timeout: 15e3 }).catch(() => {
        log.debug("Network idle timeout - continuing anyway");
      });
      await this.page.waitForTimeout(2e3);
    } catch (error) {
      if (this.isBrowserClosed(error)) {
        log.error("Browser was closed during navigation");
        throw new Error("Browser closed - stopping bot");
      }
      throw error;
    }
  }
  /**
   * Generate all position/location search combinations
   */
  generateSearchCombinations() {
    const combinations = [];
    for (const position of this.positions) {
      for (const location of this.locations) {
        combinations.push({ position, location });
      }
    }
    return combinations.sort(() => Math.random() - 0.5);
  }
  /**
   * Load previously answered questions from CSV
   */
  loadOldAnswers() {
    const filePath = getOldQuestionsPath();
    this.oldAnswers = loadSavedAnswers(filePath);
  }
  /**
   * Record a new GPT answer to CSV
   */
  recordAnswer(questionType, questionText, answer) {
    const filePath = getOldQuestionsPath();
    if (saveAnswer(filePath, this.oldAnswers, questionType, questionText, answer)) {
      this.oldAnswers.push({ questionType, questionText, answer });
    }
  }
  /**
   * Write job result to CSV file
   */
  writeToFile(job, status) {
    const filePath = path.join(this.outputDir, `${status}.csv`);
    appendJobResult(filePath, job.company, job.title, job.link, job.location);
  }
  /**
   * Check if error indicates browser was closed
   */
  isBrowserClosed(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Target page, context or browser has been closed") || message.includes("Target closed") || message.includes("Browser closed");
  }
}
export {
  LinkedInJobManager
};
//# sourceMappingURL=job-manager.js.map
