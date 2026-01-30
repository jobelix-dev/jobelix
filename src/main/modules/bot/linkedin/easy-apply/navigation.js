import { createLogger } from "../../utils/logger.js";
import { MODAL, ERROR_SELECTORS, TIMEOUTS } from "./selectors.js";
const log = createLogger("Navigation");
const PRIMARY_BUTTON_SELECTORS = [
  "button[data-live-test-easy-apply-next-button]",
  "button[data-live-test-easy-apply-review-button]",
  "button[data-live-test-easy-apply-submit-button]",
  "button[data-easy-apply-next-button]",
  'button[aria-label*="Continue to next step"]',
  'button[aria-label*="Review your application"]',
  'button[aria-label*="Submit application"]',
  "button.artdeco-button--primary"
];
class NavigationHandler {
  constructor(page) {
    this.page = page;
  }
  /**
   * Click the primary action button (Next/Review/Submit)
   */
  async clickPrimaryButton() {
    try {
      const footer = this.page.locator(MODAL.footer).first();
      if (await footer.count() === 0) {
        return this.handleNoFooter();
      }
      const { button, label } = await this.findPrimaryButton(footer);
      if (!button) {
        return this.handleNoButton();
      }
      log.info(`Found button: "${label}"`);
      const isSubmit = label.toLowerCase().includes("submit");
      if (isSubmit) {
        await this.unfollowCompany();
        log.info("\u{1F680} Submitting application...");
      }
      await button.scrollIntoViewIfNeeded();
      await button.click();
      log.info(`Clicked button: "${label}"`);
      await this.page.waitForTimeout(TIMEOUTS.long);
      if (await this.hasValidationErrors()) {
        log.warn("Validation errors after clicking button");
        return { success: false, submitted: false, error: "Validation errors" };
      }
      await this.handleSaveApplicationModal();
      await this.waitForButtonDetach(button);
      await this.page.waitForTimeout(TIMEOUTS.medium);
      if (isSubmit) {
        return this.checkSubmitResult();
      }
      return { success: true, submitted: false };
    } catch (error) {
      log.error(`Error clicking primary button: ${error}`);
      return { success: false, submitted: false, error: String(error) };
    }
  }
  /**
   * Find the primary action button in the footer
   */
  async findPrimaryButton(footer) {
    for (const selector of PRIMARY_BUTTON_SELECTORS) {
      try {
        const btn = footer.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible() && await btn.isEnabled()) {
          const label = (await btn.textContent())?.trim() || await btn.getAttribute("aria-label") || "";
          return { button: btn, label };
        }
      } catch {
        continue;
      }
    }
    return { button: null, label: "" };
  }
  /**
   * Handle case when no footer is found
   */
  async handleNoFooter() {
    if (!await this.isModalOpen()) {
      log.info("Modal closed - application already complete");
      return { success: true, submitted: true };
    }
    return { success: false, submitted: false, error: "No footer found in modal" };
  }
  /**
   * Handle case when no button is found
   */
  async handleNoButton() {
    if (!await this.isModalOpen()) {
      log.info("Modal closed - application complete");
      return { success: true, submitted: true };
    }
    return { success: false, submitted: false, error: "No primary button found" };
  }
  /**
   * Wait for button to detach (page updated)
   */
  async waitForButtonDetach(button) {
    try {
      await button.waitFor({ state: "detached", timeout: 8e3 });
      log.debug("Button became detached - page updated");
    } catch {
      log.debug("Button did not detach within timeout");
    }
  }
  /**
   * Check the result after clicking Submit
   */
  async checkSubmitResult() {
    const stillOpen = await this.isModalOpen();
    if (!stillOpen) {
      log.info("\u2705 Application submitted successfully!");
      return { success: true, submitted: true };
    }
    const state = await this.getModalState();
    if (state === "success") {
      log.info("\u2705 Application submitted successfully!");
      return { success: true, submitted: true };
    }
    return { success: true, submitted: false };
  }
  /**
   * Handle the "Save this application?" modal
   */
  async handleSaveApplicationModal() {
    try {
      const saveModal = this.page.locator("div.artdeco-modal").filter({ hasText: "Save this application" });
      if (await saveModal.count() === 0 || !await saveModal.isVisible()) {
        return false;
      }
      log.info('\u26A0\uFE0F "Save this application?" modal detected');
      const saveButton = await this.findSaveButton(saveModal);
      if (!saveButton) {
        log.warn("Could not find Save button in modal");
        return false;
      }
      log.info('Clicking "Save" button to preserve application');
      await saveButton.click();
      await this.page.waitForTimeout(1500);
      try {
        await saveModal.waitFor({ state: "hidden", timeout: 3e3 });
        log.info("\u2705 Save modal closed");
      } catch {
        log.warn("Save modal didn't close - continuing");
      }
      await this.waitForModalReopen();
      return true;
    } catch (error) {
      log.debug(`Error handling save modal: ${error}`);
      return false;
    }
  }
  /**
   * Find the Save button in the save modal
   */
  async findSaveButton(modal) {
    const selectors = [
      'button[data-control-name*="save"]',
      'button:has-text("Save")',
      ".artdeco-modal__footer button.artdeco-button--primary"
    ];
    for (const selector of selectors) {
      try {
        const btn = modal.locator(selector).first();
        if (await btn.count() > 0) return btn;
      } catch {
        continue;
      }
    }
    return null;
  }
  /**
   * Wait for Easy Apply modal to reopen
   */
  async waitForModalReopen() {
    await this.page.waitForTimeout(TIMEOUTS.long);
    log.info("Waiting for Easy Apply modal to reopen...");
    try {
      const modal = this.page.locator(MODAL.container).first();
      await modal.waitFor({ state: "visible", timeout: 5e3 });
      log.info("\u2705 Easy Apply modal reopened");
    } catch {
      log.warn("Easy Apply modal didn't reopen - may have completed");
    }
  }
  /**
   * Unfollow company checkbox before submitting
   */
  async unfollowCompany() {
    try {
      const label = this.page.locator("footer label[for='follow-company-checkbox']").first();
      if (await label.count() === 0) {
        log.debug("Follow company label not found");
        return;
      }
      await label.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await this.page.waitForTimeout(200);
      const checkbox = this.page.locator("#follow-company-checkbox").first();
      if (await checkbox.count() > 0 && await checkbox.isChecked()) {
        log.debug("Unchecking follow company checkbox");
        await label.evaluate((el) => el.click());
        log.info("\u2705 Unchecked follow company checkbox");
      }
    } catch (error) {
      log.debug(`Follow company uncheck failed: ${error}`);
    }
  }
  /**
   * Check if Easy Apply modal is still open
   */
  async isModalOpen() {
    try {
      const modal = this.page.locator(MODAL.container).first();
      return await modal.count() > 0 && await modal.isVisible();
    } catch {
      return false;
    }
  }
  /**
   * Get the current state of the Easy Apply modal
   */
  async getModalState() {
    try {
      const modal = this.page.locator("[data-test-modal]").first();
      if (await modal.count() === 0) return "closed";
      const text = (await modal.textContent() || "").toLowerCase();
      if (text.includes("application") && (text.includes("sent") || text.includes("submitted"))) {
        return "success";
      }
      const buttonStates = [
        ['button[aria-label*="Submit application"]', "submit"],
        ['button[aria-label*="Review"]', "review"],
        ['button[aria-label*="Continue to next step"]', "form"]
      ];
      for (const [selector, state] of buttonStates) {
        const btn = this.page.locator(selector);
        if (await btn.count() > 0 && await btn.isVisible()) {
          return state;
        }
      }
      if (await this.hasValidationErrors()) return "error";
      return "unknown";
    } catch (error) {
      log.error(`Error getting modal state: ${error}`);
      return "unknown";
    }
  }
  /**
   * Close the Easy Apply modal
   */
  async closeModal() {
    try {
      const closeButton = this.page.locator('button[aria-label*="Dismiss"]').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
        await this.page.waitForTimeout(TIMEOUTS.medium);
        await this.handleDiscardConfirmation();
        return true;
      }
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(TIMEOUTS.medium);
      await this.handleDiscardConfirmation();
      return true;
    } catch (error) {
      log.error(`Error closing modal: ${error}`);
      return false;
    }
  }
  /**
   * Handle the "Discard" confirmation dialog
   */
  async handleDiscardConfirmation() {
    try {
      const discardButton = this.page.locator("button[data-test-dialog-primary-btn]");
      if (await discardButton.count() > 0) {
        const text = await discardButton.textContent();
        if (text?.toLowerCase().includes("discard")) {
          await discardButton.click();
          await this.page.waitForTimeout(TIMEOUTS.medium);
          log.debug("Clicked Discard in confirmation");
        }
      }
    } catch {
    }
  }
  /**
   * Check if there are validation errors on the current page
   */
  async hasValidationErrors() {
    try {
      for (const selector of ERROR_SELECTORS) {
        const errors = await this.page.locator(selector).all();
        for (const error of errors) {
          if (await error.isVisible()) {
            const text = await error.textContent();
            if (text?.trim()) {
              log.warn(`Validation error: "${text}"`);
              return true;
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  /**
   * Get all visible validation error messages
   */
  async getValidationErrors() {
    const errors = [];
    try {
      const errorElements = await this.page.locator(".artdeco-inline-feedback--error").all();
      for (const element of errorElements) {
        if (await element.isVisible()) {
          const text = await element.textContent();
          if (text?.trim()) errors.push(text.trim());
        }
      }
    } catch {
    }
    return errors;
  }
  /**
   * Wait for the modal to finish loading/transitioning
   */
  async waitForModalReady() {
    try {
      const loadingSpinner = this.page.locator(".artdeco-spinner");
      await loadingSpinner.waitFor({ state: "hidden", timeout: 5e3 }).catch(() => {
      });
      await this.page.waitForTimeout(TIMEOUTS.medium);
    } catch {
    }
  }
}
export {
  NavigationHandler
};
//# sourceMappingURL=navigation.js.map
