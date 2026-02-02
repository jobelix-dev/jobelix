/**
 * Debug HTML Utility - Saves HTML snapshots for debugging
 * 
 * Centralized utility for saving page HTML snapshots during bot execution.
 * Used for debugging failed applications and understanding page states.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Page } from 'playwright-core';
import { getDebugHtmlPath } from './paths';
import { createLogger } from './logger';

const log = createLogger('DebugHtml');

/**
 * Save a debug HTML snapshot of the current page state
 * 
 * @param page - Playwright page instance
 * @param context - Description of what's happening (e.g., 'modal_opened', 'button_not_found')
 * @param jobTitle - Optional job title for the filename
 * @returns Path to saved file, or null if save failed
 */
export async function saveDebugHtml(
  page: Page,
  context: string,
  jobTitle: string = ''
): Promise<string | null> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeTitle = jobTitle
      .replace(/\s+/g, '_')
      .replace(/[/\\]/g, '_')
      .slice(0, 50);
    
    const filename = safeTitle 
      ? `${context}_${safeTitle}_${timestamp}.html`
      : `${context}_${timestamp}.html`;
    
    const debugDir = getDebugHtmlPath();
    
    // Ensure debug directory exists
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const filepath = path.join(debugDir, filename);
    const htmlContent = await page.content();
    const url = page.url();
    
    // Add metadata header for debugging
    const fullContent = `<!-- Debug HTML Snapshot -->
<!-- Context: ${context} -->
<!-- Job Title: ${jobTitle || 'N/A'} -->
<!-- URL: ${url} -->
<!-- Timestamp: ${new Date().toISOString()} -->

${htmlContent}`;
    
    fs.writeFileSync(filepath, fullContent, 'utf-8');
    log.info(`📸 Saved: ${filepath}`);
    return filepath;
  } catch (error) {
    log.error(`Failed to save debug HTML: ${error}`);
    return null;
  }
}

/**
 * Clean up old debug HTML files (older than specified days)
 * 
 * @param maxAgeDays - Maximum age of files to keep (default: 7 days)
 */
export function cleanupOldDebugFiles(maxAgeDays: number = 7): void {
  try {
    const debugDir = getDebugHtmlPath();
    if (!fs.existsSync(debugDir)) return;

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    const files = fs.readdirSync(debugDir);
    let cleaned = 0;
    
    for (const file of files) {
      const filepath = path.join(debugDir, file);
      const stat = fs.statSync(filepath);
      
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filepath);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      log.info(`Cleaned up ${cleaned} old debug HTML files`);
    }
  } catch (error) {
    log.warn(`Failed to cleanup debug files: ${error}`);
  }
}
