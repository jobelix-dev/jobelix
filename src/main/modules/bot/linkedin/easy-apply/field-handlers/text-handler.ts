/**
 * Text Input Handler - Handles single-line text inputs
 * 
 * Used for fields like:
 * - Name, email, phone number
 * - Years of experience (numeric)
 * - City, company name, URLs
 */

import type { Locator } from 'playwright-core';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { TIMEOUTS } from '../selectors';

const log = createLogger('TextHandler');

/** Input types to exclude */
const EXCLUDED_INPUT_TYPES = ['button', 'submit', 'checkbox', 'radio', 'file', 'hidden'];

export class TextInputHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a text input
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      const inputs = await element.locator('input').all();
      for (const input of inputs) {
        const type = await input.getAttribute('type') || 'text';
        if (!EXCLUDED_INPUT_TYPES.includes(type)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Handle a text input field
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const input = element.locator('input').first();
      if (await input.count() === 0) return false;

      const inputType = await input.getAttribute('type') || 'text';
      if (EXCLUDED_INPUT_TYPES.includes(inputType)) return false;

      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Always clear and get fresh answer from GPT (don't trust LinkedIn prefill)
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Clearing LinkedIn prefill: "${existingValue}"`);
      }

      // Try smart matching first for common fields (phone, email, city, etc.)
      let answer: string | undefined;
      const smartMatcher = this.createSmartMatcher();
      
      // Try matching by element ID/name first
      const smartMatchById = await smartMatcher.matchByElementId(input);
      if (smartMatchById?.value) {
        log.info(`[SMART] Matched by element: ${smartMatchById.fieldType} = "${smartMatchById.value}"`);
        answer = smartMatchById.value;
      }
      
      // If no match by ID, try matching by question text
      if (!answer) {
        const smartMatchByText = smartMatcher.matchByQuestionText(questionText);
        if (smartMatchByText?.value) {
          log.info(`[SMART] Matched by question: ${smartMatchByText.fieldType} = "${smartMatchByText.value}"`);
          answer = smartMatchByText.value;
        }
      }

      // Fall back to GPT if no smart match
      if (!answer) {
        answer = await this.askGpt(input, questionText);
      }
      
      if (!answer?.trim()) {
        log.warn('No answer available for text input');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${this.truncate(answer)}"`);

      // Fill the input
      await this.fillInput(input, answer);
      this.formUtils.rememberAnswer('text', questionText, answer);

      // Handle validation errors with retry
      await this.handleValidationError(
        element, 'text', questionText, answer,
        (q, a, e) => this.gptAnswerer.answerTextualWithRetry(q, a, e),
        async (retryAnswer) => this.fillInput(input, retryAnswer)
      );

      return true;
    } catch (error) {
      log.error(`Error handling text input: ${error}`);
      return false;
    }
  }

  /**
   * Ask GPT for an answer (numeric or textual)
   */
  private async askGpt(input: Locator, questionText: string): Promise<string | undefined> {
    const isNumeric = await this.isNumericField(input);
    
    if (isNumeric) {
      log.debug(`Asking GPT (numeric): "${questionText}"`);
      const numAnswer = await this.gptAnswerer.answerNumeric(questionText);
      return String(numAnswer);
    } else {
      log.debug(`Asking GPT (textual): "${questionText}"`);
      return this.gptAnswerer.answerTextual(questionText);
    }
  }

  /**
   * Fill an input field
   */
  private async fillInput(input: Locator, value: string): Promise<void> {
    await input.click();
    await input.fill('');
    await input.fill(value);
    await this.page.waitForTimeout(TIMEOUTS.short);
  }

  /**
   * Truncate text for logging
   */
  private truncate(text: string, maxLen = 50): string {
    return text.length > maxLen ? `${text.substring(0, maxLen)}...` : text;
  }

  /**
   * Check if this is a numeric field
   */
  private async isNumericField(input: Locator): Promise<boolean> {
    try {
      const type = await input.getAttribute('type');
      if (type === 'number') return true;

      const inputmode = await input.getAttribute('inputmode');
      if (inputmode && ['numeric', 'decimal'].includes(inputmode)) return true;

      const id = await input.getAttribute('id') || '';
      const name = await input.getAttribute('name') || '';

      return (
        id.includes('numeric') ||
        id.includes('number') ||
        name.includes('numeric') ||
        name.includes('number')
      );
    } catch {
      return false;
    }
  }
}
