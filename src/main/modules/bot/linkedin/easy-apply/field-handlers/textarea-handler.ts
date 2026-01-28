/**
 * Textarea Handler - Handles multi-line text areas
 * 
 * Used for questions like:
 * - "Tell us about yourself"
 * - "Why are you interested in this role?"
 * - Cover letter text
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';

const log = createLogger('TextareaHandler');

export class TextareaHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a textarea
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      const count = await element.locator('textarea').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Handle a textarea field
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const textarea = element.locator('textarea').first();
      if (await textarea.count() === 0) return false;

      // Get question text
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Check if already filled
      const existingValue = await textarea.inputValue();
      if (existingValue?.trim() && existingValue.length > 50) {
        log.debug('Textarea already has substantial content, skipping');
        return true;
      }

      // Get answer from GPT (textareas are usually open-ended)
      log.debug(`Asking GPT for long-form answer: "${questionText}"`);
      const answer = await this.gptAnswerer.answerTextual(questionText);

      if (!answer?.trim()) {
        log.warn('No answer available for textarea');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → [${answer.length} chars]`);

      // Fill the textarea
      await textarea.click();
      await textarea.fill(''); // Clear first
      await textarea.fill(answer);
      await this.page.waitForTimeout(300);

      // Remember answer
      this.formUtils.rememberAnswer('textarea', questionText, answer);

      // Check for validation errors
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      if (errorMsg) {
        log.warn(`Validation error: ${errorMsg}`);
        
        const retryAnswer = await this.gptAnswerer.answerTextualWithRetry(
          questionText, answer, errorMsg
        );
        
        if (retryAnswer) {
          await textarea.fill('');
          await textarea.fill(retryAnswer);
          this.formUtils.rememberAnswer('textarea', questionText, retryAnswer);
        }
      }

      return true;

    } catch (error) {
      log.error(`Error handling textarea: ${error}`);
      return false;
    }
  }
}
