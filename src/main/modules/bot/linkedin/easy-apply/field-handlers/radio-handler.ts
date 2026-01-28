/**
 * Radio Button Handler - Handles radio button groups in LinkedIn forms
 * 
 * Radio buttons are used for single-choice questions like:
 * - "Do you have experience with X?" (Yes/No)
 * - "What is your preferred work arrangement?" (Remote/Hybrid/On-site)
 * - "Are you legally authorized to work?" (Yes/No)
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { normalizeText } from '../form-utils';

const log = createLogger('RadioHandler');

export class RadioButtonHandler extends BaseFieldHandler {
  /**
   * Check if this element contains radio buttons
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      const count = await element.locator('input[type=radio]').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Handle a radio button group
   * 
   * Process flow:
   * 1. Find all radio buttons in the group
   * 2. Extract the question text
   * 3. Get all option labels
   * 4. Check for saved answer or ask GPT
   * 5. Click the matching option
   * 6. Check for validation errors and retry if needed
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const radios = await element.locator('input[type=radio]').all();
      if (radios.length === 0) return false;

      // Get question text
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Extract all options by finding labels
      const options = await this.extractOptions(element, radios);
      if (options.length === 0) {
        log.warn('No options found for radio group');
        return false;
      }

      log.debug(`Options: ${options.join(', ')}`);

      // Check for saved answer first
      let answer = this.formUtils.getSavedAnswer('radio', questionText);
      let fromGPT = false;

      // Ask GPT if no saved answer
      if (!answer) {
        log.debug(`Asking GPT: "${questionText}" with options [${options.join(', ')}]`);
        answer = await this.gptAnswerer.answerFromOptions(questionText, options);
        fromGPT = true;
      }

      if (!answer?.trim()) {
        log.warn('No answer available for radio question');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${answer}"`);

      // Find and click the matching radio button
      const clicked = await this.selectOption(element, radios, answer);
      
      if (!clicked) {
        log.warn(`Could not find matching option for: "${answer}"`);
        return false;
      }

      // Save answer if from GPT
      if (fromGPT) {
        this.formUtils.rememberAnswer('radio', questionText, answer);
      }

      // Check for validation errors
      await this.page.waitForTimeout(500);
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      
      if (errorMsg) {
        log.warn(`Validation error after clicking "${answer}": ${errorMsg}`);
        
        // Retry with error context
        const retryAnswer = await this.gptAnswerer.answerFromOptionsWithRetry(
          questionText, options, answer, errorMsg
        );

        if (retryAnswer?.trim()) {
          log.info(`🔄 Retry answer: "${retryAnswer}"`);
          const retryClicked = await this.selectOption(element, radios, retryAnswer);
          
          if (retryClicked) {
            this.formUtils.rememberAnswer('radio', questionText, retryAnswer);
            
            // Check if error cleared
            await this.page.waitForTimeout(500);
            const retryError = await this.formUtils.extractFieldErrors(element);
            if (retryError) {
              log.error(`Retry failed, error persists: ${retryError}`);
            } else {
              log.info('✅ Retry successful, error cleared');
            }
          }
        }
      }

      return true;

    } catch (error) {
      log.error(`Error handling radio buttons: ${error}`);
      return false;
    }
  }

  /**
   * Extract option labels from radio buttons
   */
  private async extractOptions(element: Locator, radios: Locator[]): Promise<string[]> {
    const options: string[] = [];

    for (const radio of radios) {
      try {
        const radioId = await radio.getAttribute('id');
        if (!radioId) continue;

        // Find label with matching "for" attribute
        const label = element.locator(`label[for="${radioId}"]`).first();
        if (await label.count() > 0) {
          const text = await label.textContent();
          if (text?.trim()) {
            options.push(text.trim());
          }
        }
      } catch {
        // Skip this radio if we can't get its label
      }
    }

    return options;
  }

  /**
   * Find and click the radio button matching the answer
   */
  private async selectOption(element: Locator, radios: Locator[], answer: string): Promise<boolean> {
    const normalizedAnswer = normalizeText(answer);

    for (const radio of radios) {
      try {
        const radioId = await radio.getAttribute('id');
        if (!radioId) continue;

        const label = element.locator(`label[for="${radioId}"]`).first();
        if (await label.count() === 0) continue;

        const labelText = await label.textContent();
        if (!labelText) continue;

        const normalizedLabel = normalizeText(labelText);

        if (normalizedLabel === normalizedAnswer) {
          // Click the label (more reliable than clicking the radio input)
          await this.formUtils.safeClick(label);
          await this.page.waitForTimeout(500); // Let LinkedIn process
          return true;
        }
      } catch {
        // Continue to next radio
      }
    }

    return false;
  }
}
