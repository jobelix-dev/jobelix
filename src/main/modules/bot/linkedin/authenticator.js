import { createLogger } from "../utils/logger.js";
import { isBrowserClosed } from "../utils/browser-utils.js";
const log = createLogger("Authenticator");
class LinkedInAuthenticator {
  constructor(page, reporter) {
    this.page = page;
    this.reporter = reporter;
  }
  /**
   * Start the authentication process
   */
  async start() {
    log.info("Starting LinkedIn authentication process");
    try {
      await this.page.goto("https://www.linkedin.com", {
        waitUntil: "domcontentloaded",
        timeout: 6e4
      });
      log.debug("Successfully navigated to LinkedIn.com");
    } catch (error) {
      if (isBrowserClosed(error)) {
        log.error("Browser was closed during LinkedIn navigation");
        throw new Error("Browser closed - stopping bot");
      }
      throw error;
    }
    await this.waitForPageLoad();
    if (!await this.isLoggedIn()) {
      log.info("Not logged in, initiating login process...");
      await this.handleLogin();
    } else {
      log.info("Already logged in to LinkedIn");
    }
  }
  /**
   * Handle the complete login flow
   */
  async handleLogin() {
    log.info("Starting login workflow");
    log.info("Please enter your LinkedIn credentials manually in the browser window.");
    log.info("The bot will wait until you reach the feed page before starting job applications.");
    try {
      await this.page.goto("https://www.linkedin.com/login", {
        waitUntil: "domcontentloaded",
        timeout: 6e4
      });
      log.debug("Successfully navigated to login page");
    } catch (error) {
      if (isBrowserClosed(error)) {
        log.error("Browser was closed during login navigation");
        throw new Error("Browser closed - stopping bot");
      }
      throw error;
    }
    log.info("\u23F3 Waiting for you to log in and reach the feed page... (no timeout)");
    let lastUrlCheck = "";
    let lastStatusTime = 0;
    while (true) {
      try {
        const currentUrl = this.page.url();
        if (currentUrl !== lastUrlCheck) {
          log.debug(`Current URL: ${currentUrl}`);
          lastUrlCheck = currentUrl;
        }
        if (this.isLoggedInUrl(currentUrl)) {
          await this.page.waitForTimeout(2e3);
          const confirmedUrl = this.page.url();
          log.debug(`Confirmed URL after 2s: ${confirmedUrl}`);
          if (this.isLoggedInUrl(confirmedUrl)) {
            log.info(`\u2705 Login successful - reached: ${confirmedUrl}`);
            break;
          }
        }
        if (currentUrl.includes("/login") || currentUrl.includes("/uas/login")) {
          const navBarVisible = await this.isNavBarVisible();
          if (navBarVisible) {
            log.info("\u2705 Login detected via navigation bar - redirecting to feed...");
            await this.page.goto("https://www.linkedin.com/feed/", {
              waitUntil: "domcontentloaded",
              timeout: 3e4
            });
            await this.page.waitForTimeout(2e3);
            log.info("\u2705 Successfully navigated to feed page");
            break;
          }
        }
        const now = Date.now();
        if (now - lastStatusTime > 1e4) {
          log.info("Still waiting for login and feed page... (please log in and wait for feed)");
          lastStatusTime = now;
        }
      } catch (error) {
        if (isBrowserClosed(error)) {
          log.error("Browser was closed during login waiting loop");
          throw new Error("Browser closed - stopping bot");
        }
        throw error;
      }
      await this.page.waitForTimeout(1e3);
    }
    log.debug("Checking for security challenges");
    await this.handleSecurityCheck();
    log.info("Login workflow completed successfully");
  }
  /**
   * Handle LinkedIn security challenges
   */
  async handleSecurityCheck(maxWaitMinutes = 5) {
    log.debug("Checking for security challenges...");
    const endTime = Date.now() + maxWaitMinutes * 60 * 1e3;
    while (Date.now() < endTime) {
      const currentUrl = this.page.url();
      if (currentUrl.includes("/feed")) {
        log.info("Security check cleared - landed on the feed page");
        return;
      }
      if (currentUrl.includes("/checkpoint/")) {
        log.warn("Security checkpoint detected. Please solve it in the open browser tab...");
        log.info("Waiting for manual completion...");
      }
      await this.page.waitForTimeout(5e3);
    }
    throw new Error("Login aborted: security checkpoint not passed within time limit");
  }
  /**
   * Check if the user is already logged in
   * Mirrors Python's is_logged_in() method
   */
  async isLoggedIn() {
    try {
      log.debug("Checking if already logged in (no navigation)...");
      const currentUrl = this.page.url();
      if (currentUrl.includes("/feed") || currentUrl.includes("/mynetwork") || currentUrl.includes("/in/")) {
        log.debug("User is on a logged-in page");
        return true;
      }
      if (currentUrl.endsWith("linkedin.com/") || currentUrl === "https://www.linkedin.com") {
        const navBarVisible2 = await this.isNavBarVisible();
        if (navBarVisible2) {
          log.debug("Navigation bar detected on homepage - user appears logged in");
          return true;
        }
      }
      if (currentUrl.includes("/login")) {
        const navBarVisible2 = await this.isNavBarVisible();
        if (navBarVisible2) {
          log.debug("Navigation bar detected - user appears logged in");
          return true;
        }
        return false;
      }
      if (currentUrl.includes("/checkpoint")) {
        return false;
      }
      const navBarVisible = await this.isNavBarVisible();
      if (navBarVisible) {
        log.debug("Navigation bar detected - user appears logged in");
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
  isLoggedInUrl(url) {
    return url.includes("/feed") || url.includes("/mynetwork") || url.includes("/in/") || // User profile pages
    url.endsWith("linkedin.com/");
  }
  /**
   * Check if LinkedIn's navigation bar is visible
   */
  async isNavBarVisible() {
    try {
      const navBar = this.page.locator("nav.global-nav");
      return await navBar.isVisible({ timeout: 1e3 });
    } catch {
      return false;
    }
  }
  /**
   * Wait for page to load
   */
  async waitForPageLoad(timeout = 10) {
    try {
      await this.page.waitForLoadState("domcontentloaded", { timeout: timeout * 1e3 });
      log.debug("Page loaded successfully");
    } catch {
      log.warn("Page load timed out, continuing anyway");
    }
  }
}
export {
  LinkedInAuthenticator
};
//# sourceMappingURL=authenticator.js.map
