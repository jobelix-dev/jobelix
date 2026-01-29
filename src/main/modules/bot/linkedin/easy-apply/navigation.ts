/**
 * Navigation Handler - Manages Easy Apply modal navigation
 * 
 * Handles:
 * - Primary button clicking (Next/Review/Submit)
 * - Modal state detection
 * - Validation error detection
 * - Modal dismissal
 */

import type { Page, Locator } from 'playwright';
import { createLogger } from '../../utils/logger';

const log = createLogger('Navigation');

/** Possible states of the Easy Apply modal */
export type ModalState = 
  | 'form'      // Regular form page with Next button
  | 'review'    // Review page before submission
  | 'submit'    // Final submit button visible
  | 'success'   // Application submitted successfully
  | 'error'     // Error occurred
  | 'closed'    // Modal was closed
  | 'unknown';  // Unable to determine state

/** Result after clicking primary button */
export interface PrimaryButtonResult {
  success: boolean;
  submitted: boolean;  // True if this was the final Submit click
  error?: string;
}

export class NavigationHandler {
  private page: Page;

  constructor(page: Page) {
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
  async clickPrimaryButton(): Promise<PrimaryButtonResult> {
    try {
      // Find the footer first (like Python does)
      const footer = this.page.locator('div.jobs-easy-apply-modal footer, footer.jobs-easy-apply-modal__footer').first();
      
      if (await footer.count() === 0) {
        // No footer - check if modal is closed (application complete)
        const isOpen = await this.isModalOpen();
        if (!isOpen) {
          log.info('Modal closed - application already complete');
          return { success: true, submitted: true };
        }
        return { success: false, submitted: false, error: 'No footer found in modal' };
      }

      // Try various selectors for the primary button (matching Python's selector list)
      const selectors = [
        // Explicit hooks
        'button[data-live-test-easy-apply-next-button]',
        'button[data-live-test-easy-apply-review-button]',
        'button[data-live-test-easy-apply-submit-button]',
        'button[data-easy-apply-next-button]',
        // Aria labels  
        'button[aria-label*="Continue to next step"]',
        'button[aria-label*="Review your application"]',
        'button[aria-label*="Submit application"]',
        // Last-resort primary CTA
        'button.artdeco-button--primary',
      ];

      let primaryBtn: Locator | null = null;
      let buttonLabel = '';

      for (const selector of selectors) {
        try {
          const btn = footer.locator(selector).first();
          if (await btn.count() > 0 && await btn.isVisible() && await btn.isEnabled()) {
            primaryBtn = btn;
            buttonLabel = (await btn.textContent())?.trim() || await btn.getAttribute('aria-label') || '';
            break;
          }
        } catch {
          continue;
        }
      }

      if (!primaryBtn) {
        // No button found - check if modal closed
        const isOpen = await this.isModalOpen();
        if (!isOpen) {
          log.info('Modal closed - application complete');
          return { success: true, submitted: true };
        }
        return { success: false, submitted: false, error: 'No primary button found' };
      }

      log.info(`Found button: "${buttonLabel}"`);

      // Check if this is the Submit button
      const isSubmit = buttonLabel.toLowerCase().includes('submit');
      
      if (isSubmit) {
        // Unfollow company before submitting (like Python does)
        await this.unfollowCompany();
        log.info('🚀 Submitting application...');
      }

      // Click the button
      await primaryBtn.scrollIntoViewIfNeeded();
      await primaryBtn.click();
      log.info(`Clicked button: "${buttonLabel}"`);

      // Wait for page to react
      await this.page.waitForTimeout(1000);

      // Check for validation errors
      if (await this.hasValidationErrors()) {
        log.warn('Validation errors after clicking button');
        return { success: false, submitted: false, error: 'Validation errors' };
      }

      // Handle "Save this application?" modal if it appears (MATCHES PYTHON)
      if (await this.handleSaveApplicationModal()) {
        log.info('Handled "Save this application?" modal - continuing');
      }

      // Wait for button to become detached (page updated)
      try {
        await primaryBtn.waitFor({ state: 'detached', timeout: 8000 });
        log.debug('Button became detached - page updated');
      } catch {
        log.debug('Button did not detach within timeout - continuing');
      }

      // Give new page time to stabilize
      await this.page.waitForTimeout(500);

      // Check if we just submitted
      if (isSubmit) {
        // Check if modal closed (success) or still open (might need more steps)
        const stillOpen = await this.isModalOpen();
        if (!stillOpen) {
          log.info('✅ Application submitted successfully!');
          return { success: true, submitted: true };
        }
        // Modal still open - might have post-submit modal or error
        const state = await this.getModalState();
        if (state === 'success') {
          log.info('✅ Application submitted successfully!');
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
  private async handleSaveApplicationModal(): Promise<boolean> {
    try {
      // Look for the "Save this application?" modal
      const saveModal = this.page.locator('div.artdeco-modal').filter({ hasText: 'Save this application' });
      
      if (await saveModal.count() > 0 && await saveModal.isVisible()) {
        log.info('⚠️ "Save this application?" modal detected');
        
        // Click "Save" button to save draft and continue
        const saveSelectors = [
          'button[data-control-name*="save"]',
          'button:has-text("Save")',
          '.artdeco-modal__footer button.artdeco-button--primary',
        ];
        
        let saveButton = null;
        for (const selector of saveSelectors) {
          try {
            const btn = saveModal.locator(selector).first();
            if (await btn.count() > 0) {
              saveButton = btn;
              break;
            }
          } catch { continue; }
        }
        
        if (saveButton) {
          log.info('Clicking "Save" button to preserve application');
          await saveButton.click();
          await this.page.waitForTimeout(1500);
          
          // Wait for modal to close
          try {
            await saveModal.waitFor({ state: 'hidden', timeout: 3000 });
            log.info('✅ Save modal closed');
          } catch {
            log.warn('Save modal didn\'t close - continuing anyway');
          }
          
          // Wait for Easy Apply modal to reopen
          await this.page.waitForTimeout(1000);
          log.info('Waiting for Easy Apply modal to reopen...');
          
          try {
            const easyApplyModal = this.page.locator('div.jobs-easy-apply-modal').first();
            await easyApplyModal.waitFor({ state: 'visible', timeout: 5000 });
            log.info('✅ Easy Apply modal reopened - application continuing');
          } catch {
            log.warn('Easy Apply modal didn\'t reopen - may have completed');
          }
          
          return true;
        } else {
          log.warn('Could not find Save button in modal');
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
  private async unfollowCompany(): Promise<void> {
    try {
      const followCheckbox = this.page.locator('input[type="checkbox"][id*="follow"]').first();
      if (await followCheckbox.count() > 0 && await followCheckbox.isChecked()) {
        log.debug('Unchecking follow company checkbox');
        await followCheckbox.uncheck();
      }
    } catch {
      // Ignore - checkbox might not exist
    }
  }

  /**
   * Check if Easy Apply modal is still open
   */
  async isModalOpen(): Promise<boolean> {
    try {
      const modal = this.page.locator('div.jobs-easy-apply-modal').first();
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
  async getModalState(): Promise<ModalState> {
    try {
      // Check if modal is still open
      const modal = this.page.locator('[data-test-modal]').first();
      if (await modal.count() === 0) {
        return 'closed';
      }

      // Check for success message
      const successIndicators = [
        'text=/application.*sent/i',
        'text=/successfully.*applied/i',
        '[data-test-modal-close-btn]', // Success modal has close button
      ];
      
      for (const selector of successIndicators) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0) {
          const text = await modal.textContent() || '';
          if (text.toLowerCase().includes('application') && 
              (text.toLowerCase().includes('sent') || text.toLowerCase().includes('submitted'))) {
            return 'success';
          }
        }
      }

      // Check for Submit button (final step)
      const submitButton = this.page.locator('button[aria-label*="Submit application"]');
      if (await submitButton.count() > 0 && await submitButton.isVisible()) {
        return 'submit';
      }

      // Check for Review button (one step before submit)
      const reviewButton = this.page.locator('button[aria-label*="Review"]');
      if (await reviewButton.count() > 0 && await reviewButton.isVisible()) {
        return 'review';
      }

      // Check for Next button (regular form pages)
      const nextButton = this.page.locator('button[aria-label*="Continue to next step"]');
      if (await nextButton.count() > 0 && await nextButton.isVisible()) {
        return 'form';
      }

      // Check for error state
      const errorMessage = this.page.locator('.artdeco-inline-feedback--error');
      if (await errorMessage.count() > 0) {
        return 'error';
      }

      return 'unknown';
    } catch (error) {
      log.error(`Error getting modal state: ${error}`);
      return 'unknown';
    }
  }

  /**
   * Close the Easy Apply modal
   * 
   * Used when aborting an application or after success.
   */
  async closeModal(): Promise<boolean> {
    try {
      // Try X button first
      const closeButton = this.page.locator('button[aria-label*="Dismiss"]').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
        await this.page.waitForTimeout(500);
        
        // Handle "Discard" confirmation if it appears
        await this.handleDiscardConfirmation();
        
        return true;
      }

      // Try pressing Escape
      await this.page.keyboard.press('Escape');
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
  private async handleDiscardConfirmation(): Promise<void> {
    try {
      // Look for discard confirmation
      const discardButton = this.page.locator('button[data-test-dialog-primary-btn]');
      if (await discardButton.count() > 0) {
        const buttonText = await discardButton.textContent();
        if (buttonText?.toLowerCase().includes('discard')) {
          await discardButton.click();
          await this.page.waitForTimeout(500);
          log.debug('Clicked Discard in confirmation dialog');
        }
      }
    } catch {
      // Ignore - confirmation might not appear
    }
  }

  /**
   * Check if there are validation errors on the current page
   */
  async hasValidationErrors(): Promise<boolean> {
    try {
      // LinkedIn shows errors with specific classes
      const errorSelectors = [
        '.artdeco-inline-feedback--error',
        '[data-test-form-element-error-message]',
        '.fb-form-element__error-text',
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
  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    try {
      const errorElements = await this.page.locator('.artdeco-inline-feedback--error').all();
      
      for (const element of errorElements) {
        if (await element.isVisible()) {
          const text = await element.textContent();
          if (text?.trim()) {
            errors.push(text.trim());
          }
        }
      }
    } catch {
      // Ignore errors in error collection
    }

    return errors;
  }

  /**
   * Wait for the modal to finish loading/transitioning
   */
  async waitForModalReady(): Promise<void> {
    try {
      // Wait for loading indicators to disappear
      const loadingSpinner = this.page.locator('.artdeco-spinner');
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      
      // Small delay for any animations
      await this.page.waitForTimeout(500);
    } catch {
      // Ignore timeout - modal might already be ready
    }
  }
}
