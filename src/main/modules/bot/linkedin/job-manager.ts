/**
 * LinkedIn Job Manager - Manages job search and application flow
 * 
 * Coordinates the job search process:
 * 1. Navigates to LinkedIn job search pages
 * 2. Extracts job listings from search results
 * 3. Filters jobs based on blacklist criteria
 * 4. Delegates applications to EasyApplier
 * 5. Tracks progress and reports status
 */

import type { Page, Locator } from 'playwright-core';
import * as path from 'path';
import type { Job, JobSearchConfig, SavedAnswer } from '../types';
import { createJob, isBlacklisted } from '../models/job';
import { createLogger } from '../utils/logger';
import { StatusReporter } from '../utils/status-reporter';
import { getOutputFolderPath, getOldQuestionsPath } from '../utils/paths';
import { saveDebugHtml } from '../utils/debug-html';
import { waitRandom, DELAYS } from '../utils/delays';
import { buildSearchUrl } from '../core/config-validator';
import { LinkedInEasyApplier } from './easy-apply/easy-applier';
import { loadSavedAnswers, saveAnswer, appendJobResult } from '../utils/csv-utils';
import type { GPTAnswerer } from '../ai/gpt-answerer';

const log = createLogger('JobManager');

export class LinkedInJobManager {
  private seenJobs = new Set<string>();
  private oldAnswers: SavedAnswer[] = [];
  private baseSearchUrl = '';
  private companyBlacklist: string[] = [];
  private titleBlacklist: string[] = [];
  private positions: string[] = [];
  private locations: string[] = [];
  private outputDir = '';
  private easyApplier: LinkedInEasyApplier | null = null;
  private gptAnswerer: GPTAnswerer | null = null;
  private lastHeartbeat = Date.now();
  private resumePath?: string;

  constructor(
    private page: Page,
    private reporter?: StatusReporter
  ) {
    this.outputDir = getOutputFolderPath();
    this.loadOldAnswers();
  }

  /**
   * Configure job search parameters
   */
  setParameters(config: JobSearchConfig, resumePath?: string): void {
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
  setGptAnswerer(gptAnswerer: GPTAnswerer): void {
    this.gptAnswerer = gptAnswerer;
  }

  /**
   * Start the job application process
   */
  async startApplying(): Promise<void> {
    if (!this.gptAnswerer) {
      throw new Error('GPT Answerer must be set before applying');
    }

    // Initialize Easy Applier
    log.info('Initializing Easy Applier');
    this.easyApplier = new LinkedInEasyApplier(
      this.page,
      this.gptAnswerer,
      this.oldAnswers,
      this.resumePath,
      (type, question, answer) => this.recordAnswer(type, question, answer),
      this.reporter
    );

    // Generate search combinations
    const searches = this.generateSearchCombinations();
    log.info(`Generated ${searches.length} search combinations`);

    let totalJobsFound = 0;

    for (const { position, location } of searches) {
      log.info(`Starting search for ${position} in ${location}`);

      // Send heartbeat for searching
      if (this.reporter) {
        const shouldContinue = this.reporter.sendHeartbeat('searching_jobs', {
          query: position,
          location,
        });
        if (!shouldContinue) {
          log.warn('Session stopped by user during job search');
          this.reporter.completeSession(false, 'Stopped by user during search');
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

          log.info('Starting the application process for this page...');

          // Check if user stopped the bot (every 45 seconds)
          if (this.reporter && Date.now() - this.lastHeartbeat > 45000) {
            const shouldContinue = this.reporter.sendHeartbeat('applying_jobs', {
              position,
              location,
              page,
            });
            this.lastHeartbeat = Date.now();

            if (!shouldContinue) {
              log.warn('Session stopped by user during job application');
              this.reporter.completeSession(false, 'Stopped by user');
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

          log.info('Applications on this page completed ✔');
          page++;

          // Human-like delay between pages
          await waitRandom(this.page, DELAYS.BETWEEN_PAGES);
        }
      } catch (error) {
        if (this.isBrowserClosed(error)) {
          log.error('Browser was closed by user or crashed');
          throw new Error('Browser closed - stopping bot');
        }
        log.error(`Error on page ${page}: ${error}`);
        break;
      }
    }

    // Complete session based on results
    if (this.reporter) {
      if (totalJobsFound === 0) {
        log.info('No matching jobs found - completing session');
        this.reporter.completeSession(true, 'No matching jobs found');
      } else {
        log.info(`Session complete - processed ${totalJobsFound} jobs`);
        this.reporter.completeSession(true, `Processed ${totalJobsFound} jobs`);
      }
    }
  }

  /**
   * Apply to all jobs on the current page
   */
  private async applyToJobs(): Promise<number> {
    try {
      // Check for "no results found" message
      const noResultsElement = this.page.locator('.artdeco-empty-state__headline');
      const noResultsElements = await noResultsElement.all();
      
      for (const el of noResultsElements) {
        const text = await el.textContent();
        if (text?.toLowerCase().includes('no results found')) {
          log.warn('No jobs found - LinkedIn shows "no results found" message');
          return 0;
        }
      }

      log.info('Fetching job results');

      // Wait for job tiles to load with multiple selector strategies
      // LinkedIn uses different selectors depending on the page state
      const jobTileSelectors = [
        'li[data-occludable-job-id]',
        '.jobs-search-results__list-item',
        '.job-card-container',
        '.scaffold-layout__list-container li',
      ];

      let tiles: Locator[] = [];
      
      for (const selector of jobTileSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
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
        log.info('⚠️ No job tiles found on this page - likely reached end of results');
        
        // Save debug HTML to understand the page structure
        await saveDebugHtml(this.page, 'no_jobs_found');
        return 0;
      }

      log.info(`Found ${tiles.length} job tiles`);

      // Report jobs found
      if (this.reporter) {
        this.reporter.incrementJobsFound(tiles.length);
        const shouldContinue = this.reporter.sendHeartbeat('jobs_found', { count: tiles.length });
        if (!shouldContinue) {
          log.warn('Session stopped by user after finding jobs');
          this.reporter.completeSession(false, 'Stopped by user');
          return 0;
        }
      }

      // Scroll each tile into view
      for (const tile of tiles) {
        try {
          await tile.scrollIntoViewIfNeeded();
        } catch (error) {
          log.warn(`Failed to scroll tile into view: ${error}`);
        }
      }

      // Extract job information
      const jobs: Job[] = [];
      for (const tile of tiles) {
        const job = await this.extractJobFromTile(tile);
        jobs.push(job);
      }

      log.debug(`Extracted ${jobs.length} jobs`);

      // Process each job
      for (const job of jobs) {
        if (isBlacklisted(job, this.companyBlacklist, this.titleBlacklist, this.seenJobs)) {
          log.warn(`Blacklisted ${job.title} at ${job.company}, skipping...`);
          this.writeToFile(job, 'skipped');
          continue;
        }

        try {
          if (!['Continue', 'Applied', 'Apply'].includes(job.applyMethod)) {
            const result = await this.easyApplier!.apply(job);
            
            // If already applied, skip gracefully
            if (result.alreadyApplied) {
              log.info(`Already applied to ${job.title} at ${job.company}, skipping`);
              this.writeToFile(job, 'skipped');
              this.seenJobs.add(job.link);
              continue;
            }
            
            // If modal didn't open (no Easy Apply button), skip and don't count as failure
            if (!result.success && result.error?.includes('Could not open Easy Apply modal')) {
              log.warn(`No Easy Apply available for ${job.title} at ${job.company}, skipping`);
              this.writeToFile(job, 'skipped');
              continue;
            }
            
            // If application failed for other reasons
            if (!result.success) {
              throw new Error(result.error || 'Application failed');
            }
          }
          this.writeToFile(job, 'success');
          this.seenJobs.add(job.link);
        } catch (error) {
          await saveDebugHtml(this.page, `job_apply_error_${job.company.replace(/\s+/g, '_')}`);
          this.writeToFile(job, 'failed');
          log.error(`apply_jobs failed for ${job.title} at ${job.company}: ${error}`);
          
          // Wait before continuing to next job (like Python: random.uniform(3, 5))
          await this.page.waitForTimeout(3000 + Math.random() * 2000);
        }
      }

      return jobs.length;

    } catch (error) {
      await saveDebugHtml(this.page, 'apply_jobs_exception');
      throw error;
    }
  }

  /**
   * Extract job information from a tile element
   */
  private async extractJobFromTile(tile: Locator): Promise<Job> {
    let title = '';
    let company = '';
    let location = '';
    let link = '';
    let applyMethod = '';

    // Helper to deduplicate text (handles "ML Engineer (F/H)ML Engineer (F/H)" -> "ML Engineer (F/H)")
    // LinkedIn includes visually-hidden duplicate text for accessibility
    const deduplicateText = (text: string): string => {
      const trimmed = text.trim();
      if (trimmed.length < 4) return trimmed;
      
      // Check if the text is exactly doubled (with possible whitespace variation)
      const half = Math.floor(trimmed.length / 2);
      const firstHalf = trimmed.substring(0, half).trim();
      const secondHalf = trimmed.substring(half).trim();
      if (firstHalf === secondHalf) {
        return firstHalf;
      }
      return trimmed;
    };

    // Helper to get visible text only (excludes .visually-hidden elements)
    const getVisibleText = async (locator: Locator): Promise<string> => {
      try {
        const text = await locator.evaluate((el: Element): string => {
          const clone = el.cloneNode(true) as Element;
          // Remove screen-reader-only elements
          clone.querySelectorAll('.visually-hidden, .sr-only').forEach(e => e.remove());
          return clone.textContent || '';
        });
        return deduplicateText(text);
      } catch {
        // Fallback to regular textContent with deduplication
        const text = await locator.textContent();
        return deduplicateText(text || '');
      }
    };

    // 1) Title & link
    try {
      const aTag = tile.locator('a.job-card-container__link');
      title = await getVisibleText(aTag);
      const href = await aTag.getAttribute('href');
      if (href) {
        const cleanHref = href.split('?')[0];
        link = cleanHref.startsWith('/') 
          ? `https://www.linkedin.com${cleanHref}` 
          : cleanHref;
      }
    } catch (error) {
      log.error(`[extract] title/link failed: ${error}`);
    }

    // 2) Company
    try {
      const companySpan = tile.locator('.artdeco-entity-lockup__subtitle span').first();
      company = await getVisibleText(companySpan);
    } catch (error) {
      log.error(`[extract] company failed: ${error}`);
    }

    // 3) Location
    try {
      const locationSpan = tile.locator('ul.job-card-container__metadata-wrapper li span').first();
      location = await getVisibleText(locationSpan);
    } catch (error) {
      log.error(`[extract] location failed: ${error}`);
    }

    // 4) Apply method
    try {
      const footerItems = await tile.locator('ul.job-card-list__footer-wrapper li').all();
      for (const li of footerItems) {
        const text = (await li.textContent() || '').trim();
        if (text && !['ago', 'viewed', 'promoted'].some(kw => text.toLowerCase().includes(kw))) {
          applyMethod = text;
          break;
        }
      }
    } catch {
      applyMethod = 'Applied';
    }

    return createJob(title, company, location, link, applyMethod);
  }

  /**
   * Navigate to a job search page
   */
  private async navigateToSearchPage(position: string, location: string, page: number): Promise<void> {
    const encodedPosition = encodeURIComponent(position);
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.linkedin.com/jobs/search/${this.baseSearchUrl}&keywords=${encodedPosition}&location=${encodedLocation}&start=${page * 25}`;
    
    log.debug(`Navigating to: ${url}`);
    
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Wait for page to fully render - LinkedIn uses lazy loading
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        log.debug('Network idle timeout - continuing anyway');
      });
      
      // Extra wait for JavaScript to render job tiles
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      if (this.isBrowserClosed(error)) {
        log.error('Browser was closed during navigation');
        throw new Error('Browser closed - stopping bot');
      }
      throw error;
    }
  }

  /**
   * Generate all position/location search combinations
   */
  private generateSearchCombinations(): Array<{ position: string; location: string }> {
    const combinations: Array<{ position: string; location: string }> = [];
    for (const position of this.positions) {
      for (const location of this.locations) {
        combinations.push({ position, location });
      }
    }
    // Shuffle for variety
    return combinations.sort(() => Math.random() - 0.5);
  }

  /**
   * Load previously answered questions from CSV
   */
  private loadOldAnswers(): void {
    const filePath = getOldQuestionsPath();
    this.oldAnswers = loadSavedAnswers(filePath);
  }

  /**
   * Record a new GPT answer to CSV
   */
  private recordAnswer(questionType: string, questionText: string, answer: string): void {
    const filePath = getOldQuestionsPath();
    
    if (saveAnswer(filePath, this.oldAnswers, questionType, questionText, answer)) {
      this.oldAnswers.push({ questionType, questionText, answer });
    }
  }

  /**
   * Write job result to CSV file
   */
  private writeToFile(job: Job, status: string): void {
    const filePath = path.join(this.outputDir, `${status}.csv`);
    appendJobResult(filePath, job.company, job.title, job.link, job.location);
  }


  /**
   * Check if error indicates browser was closed
   */
  private isBrowserClosed(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('Target page, context or browser has been closed') ||
           message.includes('Target closed') ||
           message.includes('Browser closed');
  }
}
