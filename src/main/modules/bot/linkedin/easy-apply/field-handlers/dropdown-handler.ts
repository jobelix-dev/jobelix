/**
 * Dropdown Handler - Handles <select> elements in LinkedIn forms
 * 
 * Dropdowns are used for: Phone country code, Years of experience, Education level, Schools
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { TIMEOUTS } from '../selectors';

const log = createLogger('DropdownHandler');

/** Maximum options to send to GPT (to avoid "message too long" errors) */
const MAX_OPTIONS_FOR_GPT = 100;

export class DropdownHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a select dropdown
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      return await element.locator('select').count() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Handle a dropdown select field
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const select = element.locator('select').first();
      if (await select.count() === 0) return false;

      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      const options = await this.extractOptions(select);
      if (options.length === 0) {
        log.warn('No options found for dropdown');
        return false;
      }

      log.debug(`Options: ${options.slice(0, 5).join(', ')}${options.length > 5 ? '...' : ''}`);

      // Get answer: saved → smartMatch → GPT
      const { answer, fromGPT } = await this.getAnswer(questionText, options);
      if (!answer?.trim()) {
        log.warn('No answer available for dropdown');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${answer}"`);

      // Select the option
      if (!await this.selectOption(select, options, answer)) {
        log.warn(`Could not find matching option for: "${answer}"`);
        return false;
      }

      if (fromGPT) {
        this.formUtils.rememberAnswer('dropdown', questionText, answer);
      }

      // Handle validation errors
      await this.handleValidationError(
        element, 'dropdown', questionText, answer,
        (q, a, e) => this.gptAnswerer.answerFromOptionsWithRetry(q, options, a, e),
        async (retryAnswer) => { await this.selectOption(select, options, retryAnswer); }
      );

      return true;
    } catch (error) {
      log.error(`Error handling dropdown: ${error}`);
      return false;
    }
  }

  /**
   * Get answer from saved answers, smart matching, or GPT
   */
  private async getAnswer(
    questionText: string, 
    options: string[]
  ): Promise<{ answer: string | undefined; fromGPT: boolean }> {
    // 1. Check saved answers
    const savedAnswer = this.formUtils.getSavedAnswer('dropdown', questionText);
    if (savedAnswer) return { answer: savedAnswer, fromGPT: false };

    // 2. Try smart matching
    const smartAnswer = this.smartMatch(questionText, options);
    if (smartAnswer) return { answer: smartAnswer, fromGPT: false };

    // 3. Ask GPT
    log.debug(`Asking GPT: "${questionText}"`);
    const truncatedOptions = this.truncateOptionsForGPT(options, questionText);
    const gptAnswer = await this.gptAnswerer.answerFromOptions(questionText, truncatedOptions);
    return { answer: gptAnswer, fromGPT: true };
  }

  /**
   * Smart matching for common dropdown types
   */
  private smartMatch(questionText: string, options: string[]): string | undefined {
    const questionLower = questionText.toLowerCase();
    const matcher = this.createSmartMatcher();

    // School/University detection
    if (this.isSchoolField(questionLower)) {
      log.debug('[SMART MATCH] Detected school/university field');
      const school = matcher.matchSchool(options);
      if (school) return school;
    }

    // Phone prefix detection  
    if (this.isPhonePrefixField(questionLower)) {
      const prefix = matcher.matchPhonePrefix(options);
      if (prefix) return prefix;
    }

    return undefined;
  }

  /**
   * Check if this is a school/university field
   */
  private isSchoolField(questionLower: string): boolean {
    return (
      questionLower.includes('school') ||
      questionLower.includes('university') ||
      questionLower.includes('college') ||
      questionLower.includes('institution')
    );
  }

  /**
   * Check if this is a phone prefix field
   */
  private isPhonePrefixField(questionLower: string): boolean {
    return (
      questionLower.includes('phone') ||
      questionLower.includes('prefix') ||
      questionLower.includes('code')
    );
  }

  /**
   * Truncate options for GPT to avoid "message too long" errors
   */
  private truncateOptionsForGPT(options: string[], questionText: string): string[] {
    if (options.length <= MAX_OPTIONS_FOR_GPT) return options;

    log.warn(`Large dropdown (${options.length} options) - truncating to ${MAX_OPTIONS_FOR_GPT}`);
    
    if (this.isSchoolField(questionText.toLowerCase())) {
      log.error(`[SCHOOL] Could not find resume school - GPT will only see first ${MAX_OPTIONS_FOR_GPT}`);
    }
    
    return options.slice(0, MAX_OPTIONS_FOR_GPT);
  }

  /**
   * Extract options from select element (skip placeholders)
   */
  private async extractOptions(select: Locator): Promise<string[]> {
    const options: string[] = [];
    const optionElements = await select.locator('option').all();

    for (let i = 0; i < optionElements.length; i++) {
      try {
        const opt = optionElements[i];
        const text = await opt.textContent();
        const value = await opt.getAttribute('value');

        // Skip placeholder options
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
   * Select option by label (handles minor text differences)
   */
  private async selectOption(select: Locator, options: string[], answer: string): Promise<boolean> {
    const normalizedAnswer = this.normalizeText(answer);

    // Try exact match
    for (const option of options) {
      if (this.normalizeText(option) === normalizedAnswer) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(TIMEOUTS.medium);
          return true;
        } catch (error) {
          log.debug(`Failed to select "${option}": ${error}`);
        }
      }
    }

    // Try partial match
    for (const option of options) {
      const normalizedOption = this.normalizeText(option);
      if (normalizedOption.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedOption)) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(TIMEOUTS.medium);
          return true;
        } catch {
          continue;
        }
      }
    }

    return false;
  }
}
