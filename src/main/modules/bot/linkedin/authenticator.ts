/**
 * LinkedIn Authenticator - Handles manual login flow
 * 
 * Waits for user to manually log in through the browser.
 * Mirrors the Python LinkedInAuthenticator class.
 */

import type { Page } from 'playwright-core';
import { createLogger } from '../utils/logger';
import { StatusReporter } from '../utils/status-reporter';
import { isBrowserClosed } from '../utils/browser-utils';

const log = createLogger('Authenticator');

export class LinkedInAuthenticator {
  constructor(
    private page: Page,
    private reporter?: StatusReporter
  ) {}

  /**
   * Start the authentication process
   */
  async start(): Promise<void> {
    log.info('Starting LinkedIn authentication process');
    
    try {
      await this.page.goto('https://www.linkedin.com', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      log.debug('Successfully navigated to LinkedIn.com');
    } catch (error) {
      if (isBrowserClosed(error)) {
        log.error('Browser was closed during LinkedIn navigation');
        throw new Error('Browser closed - stopping bot');
      }
      throw error;
    }

    await this.waitForPageLoad();

    if (!await this.isLoggedIn()) {
      log.info('Not logged in, initiating login process...');
      await this.handleLogin();
    } else {
      log.info('Already logged in to LinkedIn');
    }
  }

  /**
   * Handle the complete login flow
   */
  private async handleLogin(): Promise<void> {
    log.info('Starting login workflow');
    log.info('Please enter your LinkedIn credentials manually in the browser window.');
    log.info('The bot will wait until you reach the feed page before starting job applications.');

    try {
      await this.page.goto('https://www.linkedin.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      log.debug('Successfully navigated to login page');
    } catch (error) {
      if (isBrowserClosed(error)) {
        log.error('Browser was closed during login navigation');
        throw new Error('Browser closed - stopping bot');
      }
      throw error;
    }

    // Wait indefinitely for user to log in
    log.info('⏳ Waiting for you to log in and reach the feed page... (no timeout)');
    let lastUrlCheck = '';
    let lastStatusTime = 0;

    while (true) {
      try {
        const currentUrl = this.page.url();

        // Log URL changes only when it actually changes
        if (currentUrl !== lastUrlCheck) {
          log.debug(`Current URL: ${currentUrl}`);
          lastUrlCheck = currentUrl;
        }

        // Check if user has reached the feed page or any logged-in page
        if (this.isLoggedInUrl(currentUrl)) {
          // Double-check by waiting a moment
          await this.page.waitForTimeout(2000);
          const confirmedUrl = this.page.url();
          log.debug(`Confirmed URL after 2s: ${confirmedUrl}`);

          if (this.isLoggedInUrl(confirmedUrl)) {
            log.info(`✅ Login successful - reached: ${confirmedUrl}`);
            break;
          }
        }

        // Check if we're still on login page but nav bar appeared
        if (currentUrl.includes('/login') || currentUrl.includes('/uas/login')) {
          const navBarVisible = await this.isNavBarVisible();
          if (navBarVisible) {
            log.info('✅ Login detected via navigation bar - redirecting to feed...');
            await this.page.goto('https://www.linkedin.com/feed/', {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            });
            await this.page.waitForTimeout(2000);
            log.info('✅ Successfully navigated to feed page');
            break;
          }
        }

        // Print a waiting message every 10 seconds
        const now = Date.now();
        if (now - lastStatusTime > 10000) {
          log.info('Still waiting for login and feed page... (please log in and wait for feed)');
          lastStatusTime = now;
        }

      } catch (error) {
        if (isBrowserClosed(error)) {
          log.error('Browser was closed during login waiting loop');
          throw new Error('Browser closed - stopping bot');
        }
        throw error;
      }

      await this.page.waitForTimeout(1000);
    }

    // Handle any security challenges
    log.debug('Checking for security challenges');
    await this.handleSecurityCheck();
    log.info('Login workflow completed successfully');
  }

  /**
   * Handle LinkedIn security challenges
   */
  private async handleSecurityCheck(maxWaitMinutes = 5): Promise<void> {
    log.debug('Checking for security challenges...');
    const endTime = Date.now() + maxWaitMinutes * 60 * 1000;

    while (Date.now() < endTime) {
      const currentUrl = this.page.url();

      // Check if we've successfully reached the feed page
      if (currentUrl.includes('/feed')) {
        log.info('Security check cleared - landed on the feed page');
        return;
      }

      // Check if we're on a checkpoint page
      if (currentUrl.includes('/checkpoint/')) {
        log.warn('Security checkpoint detected. Please solve it in the open browser tab...');
        log.info('Waiting for manual completion...');
      }

      await this.page.waitForTimeout(5000);
    }

    throw new Error('Login aborted: security checkpoint not passed within time limit');
  }

  /**
   * Check if the user is already logged in
   * Mirrors Python's is_logged_in() method
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      log.debug('Checking if already logged in (no navigation)...');
      const currentUrl = this.page.url();

      // If we're on a logged-in page (feed, mynetwork, profile)
      if (currentUrl.includes('/feed') || currentUrl.includes('/mynetwork') || currentUrl.includes('/in/')) {
        log.debug('User is on a logged-in page');
        return true;
      }
      
      // If we're on the homepage, check for nav bar
      if (currentUrl.endsWith('linkedin.com/') || currentUrl === 'https://www.linkedin.com') {
        const navBarVisible = await this.isNavBarVisible();
        if (navBarVisible) {
          log.debug('Navigation bar detected on homepage - user appears logged in');
          return true;
        }
      }

      // If on login page, check if nav bar appeared (form submitted)
      if (currentUrl.includes('/login')) {
        const navBarVisible = await this.isNavBarVisible();
        if (navBarVisible) {
          log.debug('Navigation bar detected - user appears logged in');
          return true;
        }
        return false;
      }

      // On checkpoint page, not logged in yet
      if (currentUrl.includes('/checkpoint')) {
        return false;
      }

      // Try to detect nav bar as fallback for any other page
      const navBarVisible = await this.isNavBarVisible();
      if (navBarVisible) {
        log.debug('Navigation bar detected - user appears logged in');
        return true;
      }

    } catch (error) {
      log.debug(`Login verification failed: ${error}`);
    }

    return false;
  }

  /**
   * Check if current URL indicates logged-in state
   * Note: Only /feed, /mynetwork, and linkedin.com homepage indicate logged-in
   * DO NOT include /jobs as that's a public page
   */
  private isLoggedInUrl(url: string): boolean {
    return url.includes('/feed') || 
           url.includes('/mynetwork') || 
           url.includes('/in/') ||  // User profile pages
           url.endsWith('linkedin.com/');
  }

  /**
   * Check if LinkedIn's navigation bar is visible
   */
  private async isNavBarVisible(): Promise<boolean> {
    try {
      const navBar = this.page.locator('nav.global-nav');
      return await navBar.isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }

  /**
   * Wait for page to load
   */
  private async waitForPageLoad(timeout = 10): Promise<void> {
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: timeout * 1000 });
      log.debug('Page loaded successfully');
    } catch {
      log.warn('Page load timed out, continuing anyway');
    }
  }
}
