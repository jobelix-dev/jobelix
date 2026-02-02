/**
 * Delay Utility - Human-like delays for bot actions
 * 
 * Provides consistent delay patterns for:
 * - Form interactions
 * - Page navigation
 * - Human-like timing
 * 
 * Using randomized delays helps avoid bot detection.
 */

import type { Page } from 'playwright-core';

/**
 * Predefined delay ranges (min, max) in milliseconds
 */
export const DELAYS = {
  /** Very short delay for immediate responses (200-400ms) */
  INSTANT: { min: 200, max: 400 },
  
  /** Short delay for form field changes (300-600ms) */
  FIELD: { min: 300, max: 600 },
  
  /** Medium delay for button clicks (500-1000ms) */
  CLICK: { min: 500, max: 1000 },
  
  /** Delay for page transitions (1000-2000ms) */
  PAGE_TRANSITION: { min: 1000, max: 2000 },
  
  /** Delay between job applications (3000-6000ms) */
  BETWEEN_JOBS: { min: 3000, max: 6000 },
  
  /** Long delay for page loads (2000-4000ms) */
  PAGE_LOAD: { min: 2000, max: 4000 },
  
  /** Very long delay between search pages (9000-12000ms) */
  BETWEEN_PAGES: { min: 9000, max: 12000 },
} as const;

/**
 * Generate a random delay within a range
 * 
 * @param min - Minimum delay in ms
 * @param max - Maximum delay in ms
 * @returns Random delay value
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Wait for a random delay within a range
 * 
 * @param page - Playwright page instance
 * @param range - Delay range object with min/max
 */
export async function waitRandom(
  page: Page, 
  range: { min: number; max: number }
): Promise<void> {
  const delay = randomDelay(range.min, range.max);
  await page.waitForTimeout(delay);
}

/**
 * Wait for a specific delay
 * 
 * @param page - Playwright page instance  
 * @param ms - Delay in milliseconds
 */
export async function wait(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Short delay for form field interactions
 */
export async function waitField(page: Page): Promise<void> {
  await waitRandom(page, DELAYS.FIELD);
}

/**
 * Medium delay for button clicks
 */
export async function waitClick(page: Page): Promise<void> {
  await waitRandom(page, DELAYS.CLICK);
}

/**
 * Delay for page transitions
 */
export async function waitPageTransition(page: Page): Promise<void> {
  await waitRandom(page, DELAYS.PAGE_TRANSITION);
}

/**
 * Long delay between job applications
 */
export async function waitBetweenJobs(page: Page): Promise<void> {
  await waitRandom(page, DELAYS.BETWEEN_JOBS);
}

/**
 * Very long delay between search result pages
 */
export async function waitBetweenPages(page: Page): Promise<void> {
  await waitRandom(page, DELAYS.BETWEEN_PAGES);
}
