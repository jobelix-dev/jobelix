/**
 * Navigation Handler - Manages Easy Apply modal navigation
 * 
 * Handles all navigation within the LinkedIn Easy Apply modal:
 * - Next button clicking
 * - Review button clicking
 * - Submit button clicking
 * - Back button for error recovery
 * - Modal dismissal
 * - Error detection
 */

import type { Page, Locator } from 'playwright';
import { createLogger } from '../../utils/logger';

const log = createLogger('Navigation');

/**
 * Possible states of the Easy Apply modal
 */
export type ModalState = 
  | 'form'        // Regular form page with Next button
  | 'review'      // Review page before submission
  | 'submit'      // Final submit button visible
  | 'success'     // Application submitted successfully
  | 'error'       // Error occurred
  | 'closed'      // Modal was closed
  | 'unknown';    // Unable to determine state

/**
 * Navigation result after an action
 */
export interface NavigationResult {
  success: boolean;
  state: ModalState;
  error?: string;
}

export class NavigationHandler {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
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
   * Click the Next button to go to the next form page
   * 
   * @returns Navigation result with new state
   */
  async clickNext(): Promise<NavigationResult> {
    try {
      // Find Next button - LinkedIn uses various labels
      const nextSelectors = [
        'button[aria-label*="Continue to next step"]',
        'button[data-easy-apply-next-button]',
        'button:has-text("Next")',
        'button:has-text("Continue")',
      ];

      let nextButton: Locator | null = null;
      for (const selector of nextSelectors) {
        const btn = this.page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isEnabled()) {
          nextButton = btn;
          break;
        }
      }

      if (!nextButton) {
        log.debug('No Next button found');
        return { success: false, state: await this.getModalState(), error: 'No Next button found' };
      }

      // Click and wait for navigation
      await nextButton.click();
      await this.page.waitForTimeout(1000);

      // Check for validation errors
      const hasErrors = await this.hasValidationErrors();
      if (hasErrors) {
        log.warn('Validation errors detected after clicking Next');
        return { success: false, state: 'error', error: 'Validation errors' };
      }

      const newState = await this.getModalState();
      log.debug(`Clicked Next → state: ${newState}`);
      return { success: true, state: newState };

    } catch (error) {
      log.error(`Error clicking Next: ${error}`);
      return { success: false, state: 'error', error: String(error) };
    }
  }

  /**
   * Click the Review button
   */
  async clickReview(): Promise<NavigationResult> {
    try {
      const reviewButton = this.page.locator('button[aria-label*="Review"]').first();
      
      if (await reviewButton.count() === 0 || !(await reviewButton.isEnabled())) {
        log.debug('No Review button found');
        return { success: false, state: await this.getModalState(), error: 'No Review button' };
      }

      await reviewButton.click();
      await this.page.waitForTimeout(1000);

      const newState = await this.getModalState();
      log.debug(`Clicked Review → state: ${newState}`);
      return { success: true, state: newState };

    } catch (error) {
      log.error(`Error clicking Review: ${error}`);
      return { success: false, state: 'error', error: String(error) };
    }
  }

  /**
   * Click the Submit button to finalize the application
   * 
   * This is the final action - after this, the application is submitted.
   */
  async clickSubmit(): Promise<NavigationResult> {
    try {
      const submitButton = this.page.locator('button[aria-label*="Submit application"]').first();
      
      if (await submitButton.count() === 0 || !(await submitButton.isEnabled())) {
        log.debug('No Submit button found');
        return { success: false, state: await this.getModalState(), error: 'No Submit button' };
      }

      // Final confirmation log
      log.info('🚀 Submitting application...');
      
      await submitButton.click();
      await this.page.waitForTimeout(2000);

      // Check for success
      const newState = await this.getModalState();
      
      if (newState === 'success') {
        log.info('✅ Application submitted successfully!');
        return { success: true, state: 'success' };
      } else {
        log.warn(`Submit clicked but state is: ${newState}`);
        return { success: false, state: newState, error: 'Submission may have failed' };
      }

    } catch (error) {
      log.error(`Error clicking Submit: ${error}`);
      return { success: false, state: 'error', error: String(error) };
    }
  }

  /**
   * Click the Back button to return to previous page
   * 
   * Useful for error recovery.
   */
  async clickBack(): Promise<NavigationResult> {
    try {
      const backButton = this.page.locator('button[aria-label*="Back"]').first();
      
      if (await backButton.count() === 0) {
        return { success: false, state: await this.getModalState(), error: 'No Back button' };
      }

      await backButton.click();
      await this.page.waitForTimeout(500);

      const newState = await this.getModalState();
      log.debug(`Clicked Back → state: ${newState}`);
      return { success: true, state: newState };

    } catch (error) {
      log.error(`Error clicking Back: ${error}`);
      return { success: false, state: 'error', error: String(error) };
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

  /**
   * Check if the modal is currently open
   */
  async isModalOpen(): Promise<boolean> {
    try {
      const modal = this.page.locator('[data-test-modal]').first();
      return await modal.count() > 0 && await modal.isVisible();
    } catch {
      return false;
    }
  }
}
