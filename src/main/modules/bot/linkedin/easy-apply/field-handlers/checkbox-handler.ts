/**
 * Checkbox Handler - Handles checkbox fields (terms acceptance, preferences, etc.)
 * 
 * LinkedIn uses checkboxes for:
 * - Terms and conditions acceptance
 * - Data sharing consent
 * - Job preferences (remote, willing to relocate, etc.)
 * - Multiple choice questions
 * 
 * Retry Behavior:
 * - On retries (isRetry=true), force-checks ALL unchecked checkboxes to ensure submission
 */

import type { Locator } from 'playwright-core';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { normalizeText } from '../form-utils';

const log = createLogger('CheckboxHandler');

export class CheckboxHandler extends BaseFieldHandler {
  /**
   * Whether this is a retry attempt (force-check all unchecked checkboxes)
   */
  private isRetry: boolean = false;
  
  /**
   * Set retry mode - when true, force-checks all unchecked checkboxes
   */
  setRetryMode(isRetry: boolean): void {
    this.isRetry = isRetry;
    if (isRetry) {
      log.debug('Retry mode enabled - will force-check all unchecked checkboxes');
    }
  }
  
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

      // Auto-check consent/agreement checkboxes (multi-language support)
      const autoCheckKeywords = [
        'agree', 'accept', 'consent', 'acknowledge', 'confirm',
        'terms', 'privacy', 'policy', 'understand', 'certify',
        // French
        'accepte', 'accepter', 'j\'accepte', 'consentement', 'confirme',
        'conditions', 'confidentialité', 'politique', 'comprends',
        // German
        'akzeptiere', 'zustimme', 'einverstanden', 'bestätige',
        // Spanish
        'acepto', 'aceptar', 'consiento', 'confirmo'
      ];

      const shouldAutoCheck = autoCheckKeywords.some(keyword => 
        lowerLabel.includes(keyword) || questionText.toLowerCase().includes(keyword)
      );

      if (shouldAutoCheck) {
        // Click the label instead of the checkbox to avoid "label intercepts pointer events" error
        const label = await this.getCheckboxLabelElement(element, checkbox);
        if (label) {
          await label.click();
        } else {
          // Fallback: force click on checkbox
          await checkbox.click({ force: true });
        }
        log.info(`✅ Auto-checked consent: "${labelText.substring(0, 50)}..."`)
        return true;
      }

      // RETRY FALLBACK: If this is a retry attempt, force-check all unchecked checkboxes
      // This ensures form submission succeeds when validation errors occur
      if (this.isRetry) {
        // Click the label instead of the checkbox to avoid "label intercepts pointer events" error
        const label = await this.getCheckboxLabelElement(element, checkbox);
        if (label) {
          await label.click();
        } else {
          await checkbox.click({ force: true });
        }
        log.info(`✅ Force-checked on retry: "${labelText.substring(0, 50)}..."`);
        return true;
      }

      // For other single checkboxes, ask GPT directly (no section routing)
      const prompt = `Should I check this checkbox? "${labelText}" (Answer: yes or no)`;
      const answer = await this.gptAnswerer.answerCheckboxQuestion(prompt);
      
      if (answer?.toLowerCase().includes('yes')) {
        // Click the label instead of the checkbox to avoid "label intercepts pointer events" error
        const label = await this.getCheckboxLabelElement(element, checkbox);
        if (label) {
          await label.click();
        } else {
          await checkbox.click({ force: true });
        }
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

      // RETRY FALLBACK: If this is a retry attempt, force-check all unchecked checkboxes
      // This ensures form submission succeeds when validation errors occur
      if (this.isRetry) {
        let checkedCount = 0;
        for (const option of options) {
          if (!(await option.checkbox.isChecked())) {
            const label = await this.getCheckboxLabelElement(element, option.checkbox);
            if (label) {
              await label.click();
            } else {
              await option.checkbox.click({ force: true });
            }
            log.info(`✅ Force-checked on retry: "${option.label}"`);
            await this.page.waitForTimeout(100);
            checkedCount++;
          }
        }
        if (checkedCount > 0) {
          log.info(`Force-checked ${checkedCount} checkbox(es) on retry`);
        }
        return true;
      }

      // Format options for GPT (MATCHES PYTHON APPROACH)
      const optionsList = options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
      
      // Ask GPT directly which options to select (no section routing!)
      // This is critical for questions like "How did you hear about us?" which are
      // NOT based on resume content
      const prompt = `Question: "${questionText}"\n\nOptions:\n${optionsList}\n\nWhich options should I select? List the numbers separated by commas, or say "none". If the question asks how you heard about a company and "LinkedIn" or "Job Board" is an option, select that.`;
      
      const answer = await this.gptAnswerer.answerCheckboxQuestion(prompt);
      
      if (!answer || answer.toLowerCase().trim() === 'none') {
        log.debug('No checkboxes selected');
        return true;
      }

      // Parse selected numbers
      const selectedNumbers = this.parseSelectedNumbers(answer, options.length);
      
      if (selectedNumbers.length === 0) {
        log.warn(`Could not parse checkbox selection from: "${answer}"`);
        // Try to find "linkedin" or "job board" as fallback for "how did you hear" questions
        if (questionText.toLowerCase().includes('hear about') || questionText.toLowerCase().includes('how did you')) {
          for (let i = 0; i < options.length; i++) {
            const label = options[i].label.toLowerCase();
            if (label.includes('linkedin') || label.includes('job board') || label.includes('job site')) {
              selectedNumbers.push(i + 1);
              log.info(`Fallback: selecting "${options[i].label}" for referral question`);
              break;
            }
          }
        }
      }
      
      // Check the selected options
      for (const num of selectedNumbers) {
        const option = options[num - 1];
        if (option && !(await option.checkbox.isChecked())) {
          // Click the label instead of the checkbox to avoid "label intercepts pointer events" error
          const label = await this.getCheckboxLabelElement(element, option.checkbox);
          if (label) {
            await label.click();
          } else {
            await option.checkbox.click({ force: true });
          }
          log.info(`✅ Checked: "${option.label}"`);
          await this.page.waitForTimeout(100);
        }
      }

      return true;

    } catch (error) {
      log.debug(`Error with multiple checkboxes: ${error}`);
      return false;
    }
  }

  /**
   * Get the label element for a checkbox (for clicking)
   */
  private async getCheckboxLabelElement(container: Locator, checkbox: Locator): Promise<Locator | null> {
    try {
      // Try to get associated label by 'for' attribute
      const checkboxId = await checkbox.getAttribute('id');
      if (checkboxId) {
        const label = container.locator(`label[for="${checkboxId}"]`);
        if (await label.count() > 0) {
          return label.first();
        }
      }

      // Try parent label
      const parentLabel = checkbox.locator('xpath=ancestor::label');
      if (await parentLabel.count() > 0) {
        return parentLabel.first();
      }

      return null;
    } catch {
      return null;
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
