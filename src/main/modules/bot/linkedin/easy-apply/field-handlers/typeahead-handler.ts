/**
 * Typeahead Handler - Handles autocomplete/typeahead fields
 * 
 * LinkedIn uses typeahead for: Location, Schools, Companies, Skills
 * These fields require typing text, waiting for suggestions, then selecting.
 */

import type { Locator } from 'playwright-core';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { TIMEOUTS } from '../selectors';

const log = createLogger('TypeaheadHandler');

export class TypeaheadHandler extends BaseFieldHandler {
  /**
   * Check if this element is a typeahead field
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      // Check for typeahead-specific attributes
      if (await element.locator('[data-test-single-typeahead-input]').count() > 0) return true;
      if (await element.locator('[role="combobox"]').count() > 0) return true;

      // Check for autocomplete attribute pattern
      const input = element.locator('input').first();
      if (await input.count() > 0) {
        const autocomplete = await input.getAttribute('autocomplete');
        const ariaAutocomplete = await input.getAttribute('aria-autocomplete');
        if (autocomplete === 'off' && ariaAutocomplete === 'list') return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Handle a typeahead field
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const input = element.locator('input').first();
      if (await input.count() === 0) return false;

      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Always clear and get fresh answer from GPT (don't trust prefill)
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Clearing LinkedIn prefill: "${existingValue}"`);
      }

      // Get answer from GPT
      log.debug(`Asking GPT: "${questionText}"`);
      const answer = await this.gptAnswerer.answerTextual(questionText);
      if (!answer?.trim()) {
        log.warn('No answer available for typeahead');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${answer}"`);

      // Type the answer to trigger autocomplete
      await input.click();
      await input.fill('');
      await input.pressSequentially(answer, { delay: TIMEOUTS.typing });
      await this.page.waitForTimeout(TIMEOUTS.long);

      // Try to select from dropdown
      await this.selectSuggestion(answer);
      
      this.formUtils.rememberAnswer('typeahead', questionText, answer);
      return true;
    } catch (error) {
      log.error(`Error handling typeahead: ${error}`);
      return false;
    }
  }

  /**
   * Select a suggestion from the dropdown
   */
  private async selectSuggestion(answer: string): Promise<boolean> {
    try {
      const listbox = this.page.locator('[role="listbox"]').first();
      
      try {
        await listbox.waitFor({ state: 'visible', timeout: 3000 });
      } catch {
        log.debug('No listbox appeared');
        return false;
      }

      const options = await listbox.locator('[role="option"]').all();
      if (options.length === 0) {
        log.debug('No options in listbox');
        return false;
      }

      const normalizedAnswer = this.normalizeText(answer);

      // Find matching option
      for (const option of options) {
        const text = await option.textContent();
        if (!text) continue;

        const normalizedOption = this.normalizeText(text);
        if (this.isMatch(normalizedAnswer, normalizedOption)) {
          await option.click();
          await this.page.waitForTimeout(TIMEOUTS.medium);
          log.debug(`Selected suggestion: "${text}"`);
          return true;
        }
      }

      // Select first option as fallback
      if (options.length > 0) {
        const firstText = await options[0].textContent();
        await options[0].click();
        await this.page.waitForTimeout(TIMEOUTS.medium);
        log.debug(`Selected first suggestion: "${firstText}"`);
        return true;
      }

      return false;
    } catch (error) {
      log.debug(`Error selecting suggestion: ${error}`);
      return false;
    }
  }

  /**
   * Check if two normalized strings match (exact or contains)
   */
  private isMatch(a: string, b: string): boolean {
    return a === b || a.includes(b) || b.includes(a);
  }
}
