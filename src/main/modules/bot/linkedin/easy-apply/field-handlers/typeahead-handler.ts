/**
 * Typeahead Handler - Handles autocomplete/typeahead fields
 * 
 * LinkedIn uses typeahead for fields like:
 * - Location (city)
 * - Schools/Universities
 * - Company names
 * - Skills
 * 
 * These fields require typing text, waiting for suggestions,
 * then selecting from the dropdown.
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { normalizeText } from '../form-utils';
import type { Resume } from '../../../types';

const log = createLogger('TypeaheadHandler');

export class TypeaheadHandler extends BaseFieldHandler {
  /**
   * Check if this element is a typeahead field
   * 
   * Typeahead fields typically have:
   * - An input with autocomplete attributes
   * - Data attributes like data-test-single-typeahead
   * - Associated listbox for suggestions
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      // Check for typeahead-specific attributes
      const typeaheadInput = element.locator('[data-test-single-typeahead-input]');
      if (await typeaheadInput.count() > 0) return true;

      // Check for combobox role
      const combobox = element.locator('[role="combobox"]');
      if (await combobox.count() > 0) return true;

      // Check for autocomplete attribute
      const input = element.locator('input').first();
      if (await input.count() > 0) {
        const autocomplete = await input.getAttribute('autocomplete');
        const ariaAutocomplete = await input.getAttribute('aria-autocomplete');
        if (autocomplete === 'off' && ariaAutocomplete === 'list') {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Handle a typeahead field
   * 
   * Process:
   * 1. Get the question text
   * 2. Get answer from saved answers or GPT
   * 3. Type the answer into the input
   * 4. Wait for suggestions to appear
   * 5. Select the first matching suggestion
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      // Find the input element
      const input = element.locator('input').first();
      if (await input.count() === 0) return false;

      // Get question text
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Check if already filled
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Already filled: "${existingValue}"`);
        return true;
      }

      // Get answer - first try smart match (checks HTML structure like Python)
      let answer = await this.smartTextMatch(element);
      
      if (answer) {
        log.debug(`Smart match found: "${answer}"`);
      } else {
        // Try saved answers
        answer = this.formUtils.getSavedAnswer('typeahead', questionText);
      }
      
      if (!answer) {
        log.debug(`Asking GPT: "${questionText}"`);
        answer = await this.gptAnswerer.answerTextual(questionText);
      }

      if (!answer?.trim()) {
        log.warn('No answer available for typeahead');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${answer}"`);

      // Type the answer
      await input.click();
      await input.fill(''); // Clear first
      
      // Type slowly to trigger autocomplete
      await input.pressSequentially(answer, { delay: 50 });
      
      // Wait for suggestions to appear
      await this.page.waitForTimeout(1000);

      // Try to select from dropdown
      const selected = await this.selectSuggestion(element, answer);
      
      if (!selected) {
        log.debug('No matching suggestion found, keeping typed value');
      }

      // Remember answer
      this.formUtils.rememberAnswer('typeahead', questionText, answer);

      return true;

    } catch (error) {
      log.error(`Error handling typeahead: ${error}`);
      return false;
    }
  }

  /**
   * Smart text matching for common typeahead fields
   * 
   * Uses language-independent HTML patterns to identify field types like:
   * - Location/City fields (geo-location pattern in element ID)
   * - Phone number fields
   * 
   * This matches the Python smart_text_match() logic in playwright_form_utils.py
   */
  private async smartTextMatch(element: Locator): Promise<string | undefined> {
    try {
      const resume = this.gptAnswerer.resume as Resume | undefined;
      if (!resume?.personalInformation) {
        log.debug('[SMART TEXT] No resume or personal info available');
        return undefined;
      }
      
      const personalInfo = resume.personalInformation;
      
      // Find the input element and check its ID
      const input = element.locator('input').first();
      if (await input.count() === 0) {
        return undefined;
      }
      
      const elementId = (await input.getAttribute('id') || '').toLowerCase();
      const elementName = (await input.getAttribute('name') || '').toLowerCase();
      
      log.debug(`[SMART TEXT] Element ID: ${elementId}`);
      
      // Location/City detection (HTML structure-based)
      // Pattern: id contains "geo-location" or "location-geo" (matches Python exactly)
      if (elementId.includes('geo-location') || elementId.includes('location-geo')) {
        log.debug('[SMART TEXT] Detected location/city field (by HTML structure)');
        const city = personalInfo.city;
        if (city) {
          log.info(`[SMART TEXT] ✅ Using city from resume: ${city}`);
          return city;
        } else {
          log.warn('[SMART TEXT] No city in resume');
        }
        return undefined;
      }
      
      // Phone number detection (HTML structure-based)
      // Pattern: id contains "phonenumber-nationalnumber" or "phone-national" (matches Python)
      if (elementId.includes('phonenumber-nationalnumber') || elementId.includes('phone-national')) {
        log.debug('[SMART TEXT] Detected phone number field (by HTML structure)');
        const phone = personalInfo.phonePrefix && personalInfo.phone 
          ? `${personalInfo.phonePrefix}${personalInfo.phone}`
          : personalInfo.phone;
        if (phone) {
          log.info(`[SMART TEXT] ✅ Using phone from resume: ${phone}`);
          return phone;
        } else {
          log.warn('[SMART TEXT] No phone in resume');
        }
        return undefined;
      }
      
      log.debug('[SMART TEXT] No pattern matched');
      return undefined;
      
    } catch (error) {
      log.debug(`[SMART TEXT] Error analyzing element: ${error}`);
      return undefined;
    }
  }

  /**
   * Select a suggestion from the dropdown
   */
  private async selectSuggestion(element: Locator, answer: string): Promise<boolean> {
    try {
      // LinkedIn typeahead suggestions are typically in a listbox
      const listbox = this.page.locator('[role="listbox"]').first();
      
      // Wait for listbox to appear
      try {
        await listbox.waitFor({ state: 'visible', timeout: 3000 });
      } catch {
        log.debug('No listbox appeared');
        return false;
      }

      // Find all options
      const options = await listbox.locator('[role="option"]').all();
      if (options.length === 0) {
        log.debug('No options in listbox');
        return false;
      }

      const normalizedAnswer = normalizeText(answer);

      // Try to find exact or close match
      for (const option of options) {
        const text = await option.textContent();
        if (!text) continue;

        const normalizedOption = normalizeText(text);
        
        // Check for exact match or if answer is contained in option
        if (normalizedOption === normalizedAnswer || 
            normalizedOption.includes(normalizedAnswer) ||
            normalizedAnswer.includes(normalizedOption)) {
          await option.click();
          await this.page.waitForTimeout(500);
          log.debug(`Selected suggestion: "${text}"`);
          return true;
        }
      }

      // If no match, click first option (often the best match for what was typed)
      if (options.length > 0) {
        const firstText = await options[0].textContent();
        await options[0].click();
        await this.page.waitForTimeout(500);
        log.debug(`Selected first suggestion: "${firstText}"`);
        return true;
      }

      return false;
    } catch (error) {
      log.debug(`Error selecting suggestion: ${error}`);
      return false;
    }
  }
}
