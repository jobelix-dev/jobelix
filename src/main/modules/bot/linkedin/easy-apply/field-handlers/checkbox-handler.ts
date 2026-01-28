/**
 * Checkbox Handler - Handles checkbox fields (terms acceptance, preferences, etc.)
 * 
 * LinkedIn uses checkboxes for:
 * - Terms and conditions acceptance
 * - Data sharing consent
 * - Job preferences (remote, willing to relocate, etc.)
 * - Multiple choice questions
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { normalizeText } from '../form-utils';

const log = createLogger('CheckboxHandler');

export class CheckboxHandler extends BaseFieldHandler {
  /**
   * Check if this element is a checkbox field
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      // Check for checkbox inputs
      const checkboxes = element.locator('input[type="checkbox"]');
      return await checkboxes.count() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Handle a checkbox field
   * 
   * For single checkboxes (terms/consent), auto-check them
   * For multiple checkboxes (preferences), ask GPT which to select
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const checkboxes = await element.locator('input[type="checkbox"]').all();
      const questionText = await this.extractQuestionText(element);
      
      log.debug(`Question: "${questionText}" (${checkboxes.length} checkbox(es))`);

      // Single checkbox - likely a consent/agreement
      if (checkboxes.length === 1) {
        return await this.handleSingleCheckbox(element, checkboxes[0], questionText);
      }

      // Multiple checkboxes - need to decide which to check
      return await this.handleMultipleCheckboxes(element, checkboxes, questionText);

    } catch (error) {
      log.error(`Error handling checkbox: ${error}`);
      return false;
    }
  }

  /**
   * Handle a single checkbox (typically consent/agreement)
   */
  private async handleSingleCheckbox(
    element: Locator, 
    checkbox: Locator, 
    questionText: string
  ): Promise<boolean> {
    try {
      // Check if already checked
      const isChecked = await checkbox.isChecked();
      if (isChecked) {
        log.debug('Checkbox already checked');
        return true;
      }

      // Get label text to understand what we're agreeing to
      const labelText = await this.getCheckboxLabel(element, checkbox);
      const lowerLabel = labelText.toLowerCase();

      // Auto-check consent/agreement checkboxes
      const autoCheckKeywords = [
        'agree', 'accept', 'consent', 'acknowledge', 'confirm',
        'terms', 'privacy', 'policy', 'understand', 'certify'
      ];

      const shouldAutoCheck = autoCheckKeywords.some(keyword => 
        lowerLabel.includes(keyword) || questionText.toLowerCase().includes(keyword)
      );

      if (shouldAutoCheck) {
        await checkbox.check();
        log.info(`✅ Auto-checked consent: "${labelText.substring(0, 50)}..."`);
        return true;
      }

      // For other single checkboxes, ask GPT
      const prompt = `Should I check this checkbox? "${labelText}" (Answer: yes or no)`;
      const answer = await this.gptAnswerer.answerTextual(prompt);
      
      if (answer?.toLowerCase().includes('yes')) {
        await checkbox.check();
        log.info(`✅ Checked: "${labelText.substring(0, 50)}..."`);
      } else {
        log.debug(`Left unchecked: "${labelText.substring(0, 50)}..."`);
      }

      return true;

    } catch (error) {
      log.debug(`Error with single checkbox: ${error}`);
      return false;
    }
  }

  /**
   * Handle multiple checkboxes (e.g., preferences, skills)
   */
  private async handleMultipleCheckboxes(
    element: Locator,
    checkboxes: Locator[],
    questionText: string
  ): Promise<boolean> {
    try {
      // Collect all options
      const options: { checkbox: Locator; label: string }[] = [];
      
      for (const checkbox of checkboxes) {
        const label = await this.getCheckboxLabel(element, checkbox);
        options.push({ checkbox, label });
      }

      // Format options for GPT
      const optionsList = options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
      
      // Ask GPT which options to select
      const prompt = `Question: "${questionText}"\n\nOptions:\n${optionsList}\n\nWhich options should I select? List the numbers separated by commas, or say "none".`;
      
      const answer = await this.gptAnswerer.answerTextual(prompt);
      
      if (!answer || answer.toLowerCase() === 'none') {
        log.debug('No checkboxes selected');
        return true;
      }

      // Parse selected numbers
      const selectedNumbers = this.parseSelectedNumbers(answer, options.length);
      
      // Check the selected options
      for (const num of selectedNumbers) {
        const option = options[num - 1];
        if (option && !(await option.checkbox.isChecked())) {
          await option.checkbox.check();
          log.info(`✅ Checked: "${option.label}"`);
          await this.page.waitForTimeout(200);
        }
      }

      return true;

    } catch (error) {
      log.debug(`Error with multiple checkboxes: ${error}`);
      return false;
    }
  }

  /**
   * Get the label text for a checkbox
   */
  private async getCheckboxLabel(container: Locator, checkbox: Locator): Promise<string> {
    try {
      // Try to get associated label by 'for' attribute
      const checkboxId = await checkbox.getAttribute('id');
      if (checkboxId) {
        const label = container.locator(`label[for="${checkboxId}"]`);
        if (await label.count() > 0) {
          const text = await label.textContent();
          if (text?.trim()) return normalizeText(text);
        }
      }

      // Try parent label
      const parentLabel = checkbox.locator('xpath=ancestor::label');
      if (await parentLabel.count() > 0) {
        const text = await parentLabel.textContent();
        if (text?.trim()) return normalizeText(text);
      }

      // Try sibling text
      const parent = checkbox.locator('xpath=..');
      const text = await parent.textContent();
      return normalizeText(text || '');

    } catch {
      return '';
    }
  }

  /**
   * Parse GPT's answer for selected checkbox numbers
   */
  private parseSelectedNumbers(answer: string, maxNum: number): number[] {
    const numbers: number[] = [];
    
    // Extract all numbers from the answer
    const matches = answer.match(/\d+/g);
    if (!matches) return numbers;

    for (const match of matches) {
      const num = parseInt(match);
      if (num >= 1 && num <= maxNum && !numbers.includes(num)) {
        numbers.push(num);
      }
    }

    return numbers;
  }
}
