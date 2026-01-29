import { createLogger } from "../../utils/logger.js";
const log = createLogger("Navigation");
class NavigationHandler {
  constructor(page) {
    this.page = page;
  }
  /**
   * Click the primary action button (Next/Review/Submit) - MATCHES PYTHON next_or_submit()
   * 
   * This method finds and clicks whatever primary button is available:
   * - Next: Advances to next form page
   * - Review: Goes to review page
   * - Submit: Submits the application
   * 
   * @returns Result indicating success and whether application was submitted
   */
  async clickPrimaryButton() {
    try {
      const footer = this.page.locator("div.jobs-easy-apply-modal footer, footer.jobs-easy-apply-modal__footer").first();
      if (await footer.count() === 0) {
        const isOpen = await this.isModalOpen();
        if (!isOpen) {
          log.info("Modal closed - application already complete");
          return { success: true, submitted: true };
        }
        return { success: false, submitted: false, error: "No footer found in modal" };
      }
      const selectors = [
        // Explicit hooks
        "button[data-live-test-easy-apply-next-button]",
        "button[data-live-test-easy-apply-review-button]",
        "button[data-live-test-easy-apply-submit-button]",
        "button[data-easy-apply-next-button]",
        // Aria labels  
        'button[aria-label*="Continue to next step"]',
        'button[aria-label*="Review your application"]',
        'button[aria-label*="Submit application"]',
        // Last-resort primary CTA
        "button.artdeco-button--primary"
      ];
      let primaryBtn = null;
      let buttonLabel = "";
      for (const selector of selectors) {
        try {
          const btn = footer.locator(selector).first();
          if (await btn.count() > 0 && await btn.isVisible() && await btn.isEnabled()) {
            primaryBtn = btn;
            buttonLabel = (await btn.textContent())?.trim() || await btn.getAttribute("aria-label") || "";
            break;
          }
        } catch {
          continue;
        }
      }
      if (!primaryBtn) {
        const isOpen = await this.isModalOpen();
        if (!isOpen) {
          log.info("Modal closed - application complete");
          return { success: true, submitted: true };
        }
        return { success: false, submitted: false, error: "No primary button found" };
      }
      log.info(`Found button: "${buttonLabel}"`);
      const isSubmit = buttonLabel.toLowerCase().includes("submit");
      if (isSubmit) {
        await this.unfollowCompany();
        log.info("\u{1F680} Submitting application...");
      }
      await primaryBtn.scrollIntoViewIfNeeded();
      await primaryBtn.click();
      log.info(`Clicked button: "${buttonLabel}"`);
      await this.page.waitForTimeout(1e3);
      if (await this.hasValidationErrors()) {
        log.warn("Validation errors after clicking button");
        return { success: false, submitted: false, error: "Validation errors" };
      }
      if (await this.handleSaveApplicationModal()) {
        log.info('Handled "Save this application?" modal - continuing');
      }
      try {
        await primaryBtn.waitFor({ state: "detached", timeout: 8e3 });
        log.debug("Button became detached - page updated");
      } catch {
        log.debug("Button did not detach within timeout - continuing");
      }
      await this.page.waitForTimeout(500);
      if (isSubmit) {
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
      }
      return { success: true, submitted: false };
    } catch (error) {
      log.error(`Error clicking primary button: ${error}`);
      return { success: false, submitted: false, error: String(error) };
    }
  }
  /**
   * Handle the "Save this application?" modal that appears when LinkedIn
   * thinks we're trying to exit the application.
   * 
   * MATCHES PYTHON: handle_save_application_modal()
   * 
   * This modal has two buttons:
   * - "Discard" - discards the application
   * - "Save" - saves the draft and exits
   * 
   * We click "Save" to preserve progress, then wait for modal to reopen.
   */
  async handleSaveApplicationModal() {
    try {
      const saveModal = this.page.locator("div.artdeco-modal").filter({ hasText: "Save this application" });
      if (await saveModal.count() > 0 && await saveModal.isVisible()) {
        log.info('\u26A0\uFE0F "Save this application?" modal detected');
        const saveSelectors = [
          'button[data-control-name*="save"]',
          'button:has-text("Save")',
          ".artdeco-modal__footer button.artdeco-button--primary"
        ];
        let saveButton = null;
        for (const selector of saveSelectors) {
          try {
            const btn = saveModal.locator(selector).first();
            if (await btn.count() > 0) {
              saveButton = btn;
              break;
            }
          } catch {
            continue;
          }
        }
        if (saveButton) {
          log.info('Clicking "Save" button to preserve application');
          await saveButton.click();
          await this.page.waitForTimeout(1500);
          try {
            await saveModal.waitFor({ state: "hidden", timeout: 3e3 });
            log.info("\u2705 Save modal closed");
          } catch {
            log.warn("Save modal didn't close - continuing anyway");
          }
          await this.page.waitForTimeout(1e3);
          log.info("Waiting for Easy Apply modal to reopen...");
          try {
            const easyApplyModal = this.page.locator("div.jobs-easy-apply-modal").first();
            await easyApplyModal.waitFor({ state: "visible", timeout: 5e3 });
            log.info("\u2705 Easy Apply modal reopened - application continuing");
          } catch {
            log.warn("Easy Apply modal didn't reopen - may have completed");
          }
          return true;
        } else {
          log.warn("Could not find Save button in modal");
          return false;
        }
      }
      return false;
    } catch (error) {
      log.debug(`Error handling save modal: ${error}`);
      return false;
    }
  }
  /**
   * Unfollow company checkbox (like Python's unfollow_company)
   */
  async unfollowCompany() {
    try {
      const followCheckbox = this.page.locator('input[type="checkbox"][id*="follow"]').first();
      if (await followCheckbox.count() > 0 && await followCheckbox.isChecked()) {
        log.debug("Unchecking follow company checkbox");
        await followCheckbox.uncheck();
      }
    } catch {
    }
  }
  /**
   * Check if Easy Apply modal is still open
   */
  async isModalOpen() {
    try {
      const modal = this.page.locator("div.jobs-easy-apply-modal").first();
      return await modal.count() > 0 && await modal.isVisible();
    } catch {
      return false;
    }
  }
  /**
   * Get the current state of the Easy Apply modal
   * 
   * This determines what navigation buttons are available
   * and what action should be taken next.
   */
  async getModalState() {
    try {
      const modal = this.page.locator("[data-test-modal]").first();
      if (await modal.count() === 0) {
        return "closed";
      }
      const successIndicators = [
        "text=/application.*sent/i",
        "text=/successfully.*applied/i",
        "[data-test-modal-close-btn]"
        // Success modal has close button
      ];
      for (const selector of successIndicators) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await modal.textContent() || "";
          if (text.toLowerCase().includes("application") && (text.toLowerCase().includes("sent") || text.toLowerCase().includes("submitted"))) {
            return "success";
          }
        }
      }
      const submitButton = this.page.locator('button[aria-label*="Submit application"]');
      if (await submitButton.count() > 0 && await submitButton.isVisible()) {
        return "submit";
      }
      const reviewButton = this.page.locator('button[aria-label*="Review"]');
      if (await reviewButton.count() > 0 && await reviewButton.isVisible()) {
        return "review";
      }
      const nextButton = this.page.locator('button[aria-label*="Continue to next step"]');
      if (await nextButton.count() > 0 && await nextButton.isVisible()) {
        return "form";
      }
      const errorMessage = this.page.locator(".artdeco-inline-feedback--error");
      if (await errorMessage.count() > 0) {
        return "error";
      }
      return "unknown";
    } catch (error) {
      log.error(`Error getting modal state: ${error}`);
      return "unknown";
    }
  }
  /**
   * Close the Easy Apply modal
   * 
   * Used when aborting an application or after success.
   */
  async closeModal() {
    try {
      const closeButton = this.page.locator('button[aria-label*="Dismiss"]').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
        await this.page.waitForTimeout(500);
        await this.handleDiscardConfirmation();
        return true;
      }
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(500);
      await this.handleDiscardConfirmation();
      return true;
    } catch (error) {
      log.error(`Error closing modal: ${error}`);
      return false;
    }
  }
  /**
   * Handle the "Discard" confirmation dialog
   * 
   * When closing an in-progress application, LinkedIn asks to confirm.
   */
  async handleDiscardConfirmation() {
    try {
      const discardButton = this.page.locator("button[data-test-dialog-primary-btn]");
      if (await discardButton.count() > 0) {
        const buttonText = await discardButton.textContent();
        if (buttonText?.toLowerCase().includes("discard")) {
          await discardButton.click();
          await this.page.waitForTimeout(500);
          log.debug("Clicked Discard in confirmation dialog");
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
      const errorSelectors = [
        ".artdeco-inline-feedback--error",
        "[data-test-form-element-error-message]",
        ".fb-form-element__error-text"
      ];
      for (const selector of errorSelectors) {
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
          if (text?.trim()) {
            errors.push(text.trim());
          }
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
      await this.page.waitForTimeout(500);
    } catch {
    }
  }
}
export {
  NavigationHandler
};
//# sourceMappingURL=navigation.js.map
