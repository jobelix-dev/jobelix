/**
 * Text Input Handler - Handles single-line text inputs
 * 
 * Used for fields like:
 * - Name, email, phone number
 * - Years of experience (numeric)
 * - City, company name
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';

const log = createLogger('TextHandler');

export class TextInputHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a text input
   * Excludes radio, checkbox, file, and button inputs
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      const inputs = await element.locator('input').all();
      
      for (const input of inputs) {
        const type = await input.getAttribute('type') || 'text';
        // Accept text-like inputs, exclude special types
        if (!['button', 'submit', 'checkbox', 'radio', 'file', 'hidden'].includes(type)) {
          return true;
        }
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
      
      // Skip non-text inputs
      if (['button', 'submit', 'checkbox', 'radio', 'file', 'hidden'].includes(inputType)) {
        return false;
      }

      // Get question text
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Check if already filled by LinkedIn
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`LinkedIn pre-filled: "${existingValue}" - checking if we should override`);
        // Only override if it looks like a placeholder
        if (!existingValue.toLowerCase().includes('select') && 
            !existingValue.toLowerCase().includes('enter')) {
          log.debug('Keeping pre-filled value');
          return true;
        }
      }

      // Determine if numeric
      const isNumeric = await this.isNumericField(input);
      
      // Get answer
      let answer: string | undefined;

      // Check saved answers
      answer = this.formUtils.getSavedAnswer('text', questionText);

      // Try smart matching
      if (!answer) {
        answer = await this.smartMatch(element, questionText);
      }

      // Ask GPT
      if (!answer) {
        if (isNumeric) {
          log.debug(`Asking GPT (numeric): "${questionText}"`);
          const numAnswer = await this.gptAnswerer.answerNumeric(questionText);
          answer = String(numAnswer);
        } else {
          log.debug(`Asking GPT (textual): "${questionText}"`);
          answer = await this.gptAnswerer.answerTextual(questionText);
        }
      }

      if (!answer?.trim()) {
        log.warn('No answer available for text input');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${answer.substring(0, 50)}${answer.length > 50 ? '...' : ''}"`);

      // Fill the input
      await input.click();
      await input.fill(''); // Clear first
      await input.fill(answer);
      await this.page.waitForTimeout(300);

      // Remember answer
      this.formUtils.rememberAnswer('text', questionText, answer);

      // Check for validation errors
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      if (errorMsg) {
        log.warn(`Validation error: ${errorMsg}`);
        
        // Retry with error context
        const retryAnswer = await this.gptAnswerer.answerTextualWithRetry(
          questionText, answer, errorMsg
        );
        
        if (retryAnswer) {
          await input.fill('');
          await input.fill(retryAnswer);
          this.formUtils.rememberAnswer('text', questionText, retryAnswer);
        }
      }

      return true;

    } catch (error) {
      log.error(`Error handling text input: ${error}`);
      return false;
    }
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

  /**
   * Smart matching for common text fields
   */
  private async smartMatch(element: Locator, questionText: string): Promise<string | undefined> {
    const questionLower = questionText.toLowerCase();

    // Phone number detection
    if (questionLower.includes('phone') && !questionLower.includes('prefix')) {
      // Would get from resume, return undefined to use GPT
      return undefined;
    }

    return undefined;
  }
}
