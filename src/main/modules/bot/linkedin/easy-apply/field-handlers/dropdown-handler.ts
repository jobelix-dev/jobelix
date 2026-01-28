/**
 * Dropdown Handler - Handles <select> elements in LinkedIn forms
 * 
 * Dropdowns are used for questions like:
 * - "Phone country code" (+1, +44, +33, etc.)
 * - "Years of experience" (0-1, 2-3, 4-5, etc.)
 * - "Education level" (Bachelor's, Master's, etc.)
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { normalizeText } from '../form-utils';

const log = createLogger('DropdownHandler');

export class DropdownHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a select dropdown
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      const count = await element.locator('select').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Handle a dropdown select field
   * 
   * Process flow:
   * 1. Find the select element
   * 2. Extract question text
   * 3. Get all options (skip placeholder)
   * 4. Try saved answer → smart match → GPT
   * 5. Select the matching option
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const select = element.locator('select').first();
      if (await select.count() === 0) return false;

      // Get question text
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Get all options
      const options = await this.extractOptions(select);
      if (options.length === 0) {
        log.warn('No options found for dropdown');
        return false;
      }

      log.debug(`Options: ${options.slice(0, 5).join(', ')}${options.length > 5 ? '...' : ''}`);

      // Try to get answer
      let answer: string | undefined;
      let fromGPT = false;

      // 1. Check saved answers
      answer = this.formUtils.getSavedAnswer('dropdown', questionText);

      // 2. Try smart matching (phone prefix, country, etc.)
      if (!answer) {
        answer = await this.smartMatch(element, questionText, options);
      }

      // 3. Ask GPT
      if (!answer) {
        log.debug(`Asking GPT: "${questionText}"`);
        answer = await this.gptAnswerer.answerFromOptions(questionText, options);
        fromGPT = true;
      }

      if (!answer?.trim()) {
        log.warn('No answer available for dropdown');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${answer}"`);

      // Select the option
      const selected = await this.selectOption(select, options, answer);
      
      if (!selected) {
        log.warn(`Could not find matching option for: "${answer}"`);
        return false;
      }

      // Save if from smart match or GPT
      if (fromGPT) {
        this.formUtils.rememberAnswer('dropdown', questionText, answer);
      }

      // Check for validation errors
      await this.page.waitForTimeout(500);
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      
      if (errorMsg) {
        log.warn(`Validation error: ${errorMsg}`);
        // Retry with error context
        const retryAnswer = await this.gptAnswerer.answerFromOptionsWithRetry(
          questionText, options, answer, errorMsg
        );
        if (retryAnswer) {
          await this.selectOption(select, options, retryAnswer);
          this.formUtils.rememberAnswer('dropdown', questionText, retryAnswer);
        }
      }

      return true;

    } catch (error) {
      log.error(`Error handling dropdown: ${error}`);
      return false;
    }
  }

  /**
   * Extract options from select element
   * Skips placeholder options (empty value or "Select...")
   */
  private async extractOptions(select: Locator): Promise<string[]> {
    const options: string[] = [];
    const optionElements = await select.locator('option').all();

    for (let i = 0; i < optionElements.length; i++) {
      try {
        const opt = optionElements[i];
        const text = await opt.textContent();
        const value = await opt.getAttribute('value');

        // Skip placeholder options (first with empty value or "Select...")
        if (i === 0 && (!value || text?.toLowerCase().includes('select'))) {
          continue;
        }

        if (text?.trim()) {
          options.push(text.trim());
        }
      } catch {
        // Skip problematic options
      }
    }

    return options;
  }

  /**
   * Smart matching for common dropdown types
   * 
   * Handles special cases where we can infer the answer from context:
   * - Phone prefix → match user's phone number
   * - Country → use resume country
   */
  private async smartMatch(
    element: Locator,
    questionText: string,
    options: string[]
  ): Promise<string | undefined> {
    const questionLower = questionText.toLowerCase();

    // Phone prefix detection
    if (questionLower.includes('phone') || questionLower.includes('prefix') || questionLower.includes('code')) {
      // Check if element has phone-related ID
      const selectId = await element.locator('select').first().getAttribute('id') || '';
      if (selectId.includes('phonePrefix') || selectId.includes('countryCode')) {
        // Try to find common country codes
        // This would be better with resume data, but for now use common defaults
        const preferredPrefixes = ['+1', '+44', '+33', '+49'];
        for (const prefix of preferredPrefixes) {
          const match = options.find(o => o.includes(prefix));
          if (match) {
            log.debug(`Smart match (phone prefix): "${match}"`);
            return match;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Select option by label (handles minor text differences)
   */
  private async selectOption(select: Locator, options: string[], answer: string): Promise<boolean> {
    const normalizedAnswer = normalizeText(answer);

    for (const option of options) {
      const normalizedOption = normalizeText(option);
      
      if (normalizedOption === normalizedAnswer) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(500);
          return true;
        } catch (error) {
          log.debug(`Failed to select "${option}": ${error}`);
        }
      }
    }

    // Fallback: try partial match
    for (const option of options) {
      if (normalizeText(option).includes(normalizedAnswer) || 
          normalizedAnswer.includes(normalizeText(option))) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(500);
          return true;
        } catch {
          // Continue
        }
      }
    }

    return false;
  }
}
