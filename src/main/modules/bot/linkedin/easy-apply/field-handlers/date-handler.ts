/**
 * Date Handler - Handles date input fields
 * 
 * LinkedIn date fields can appear as:
 * - Standard date inputs (type="date")
 * - Multiple dropdowns (month/day/year)
 * - Text input that accepts date strings
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';

const log = createLogger('DateHandler');

export class DateHandler extends BaseFieldHandler {
  /**
   * Check if this element is a date field
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      // Check for date input type
      const dateInput = element.locator('input[type="date"]');
      if (await dateInput.count() > 0) return true;

      // Check for month/year dropdowns (LinkedIn style)
      const monthSelect = element.locator('select[id*="month"], select[name*="month"]');
      const yearSelect = element.locator('select[id*="year"], select[name*="year"]');
      if (await monthSelect.count() > 0 || await yearSelect.count() > 0) return true;

      // Check for aria-describedby or labels mentioning date
      const label = element.locator('label');
      if (await label.count() > 0) {
        const labelText = await label.textContent() || '';
        const lowerLabel = labelText.toLowerCase();
        if (lowerLabel.includes('date') || 
            lowerLabel.includes('when') ||
            lowerLabel.includes('start') ||
            lowerLabel.includes('end')) {
          // Also verify there's an input
          const input = element.locator('input, select');
          if (await input.count() > 0) return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Handle a date field
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      // Get question text
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Try different date input types
      let success = false;

      // Type 1: Standard date input
      success = await this.handleDateInput(element, questionText);
      if (success) return true;

      // Type 2: Month/Year dropdowns
      success = await this.handleMonthYearDropdowns(element, questionText);
      if (success) return true;

      // Type 3: Text input for date
      success = await this.handleTextDateInput(element, questionText);
      if (success) return true;

      log.warn(`Could not handle date field: "${questionText}"`);
      return false;

    } catch (error) {
      log.error(`Error handling date field: ${error}`);
      return false;
    }
  }

  /**
   * Handle standard HTML5 date input
   */
  private async handleDateInput(element: Locator, questionText: string): Promise<boolean> {
    try {
      const dateInput = element.locator('input[type="date"]').first();
      if (await dateInput.count() === 0) return false;

      // Always clear and get fresh answer from GPT (don't trust prefill)
      const existingValue = await dateInput.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Clearing LinkedIn prefill: "${existingValue}"`);
      }

      // Get answer from GPT
      const answer = await this.getDateAnswer(questionText);
      if (!answer) return false;

      // Format as YYYY-MM-DD for date input
      const formattedDate = this.formatDateForInput(answer);
      if (!formattedDate) {
        log.warn(`Could not format date: "${answer}"`);
        return false;
      }

      await dateInput.fill(formattedDate);
      log.info(`✅ Q: "${questionText}" → "${formattedDate}"`);
      return true;

    } catch {
      return false;
    }
  }

  /**
   * Handle LinkedIn-style month/year dropdowns
   */
  private async handleMonthYearDropdowns(element: Locator, questionText: string): Promise<boolean> {
    try {
      // Look for month dropdown
      const monthSelect = element.locator('select[id*="month"], select[name*="month"]').first();
      const hasMonth = await monthSelect.count() > 0;

      // Look for year dropdown
      const yearSelect = element.locator('select[id*="year"], select[name*="year"]').first();
      const hasYear = await yearSelect.count() > 0;

      if (!hasMonth && !hasYear) return false;

      // Get answer
      const answer = await this.getDateAnswer(questionText);
      if (!answer) return false;

      // Parse month and year from answer
      const dateInfo = this.parseDateAnswer(answer);
      
      // Fill month if available
      if (hasMonth && dateInfo.month) {
        const monthValue = dateInfo.month.toString().padStart(2, '0');
        await monthSelect.selectOption({ value: monthValue });
        log.debug(`Selected month: ${dateInfo.month}`);
      }

      // Fill year if available
      if (hasYear && dateInfo.year) {
        await yearSelect.selectOption({ value: dateInfo.year.toString() });
        log.debug(`Selected year: ${dateInfo.year}`);
      }

      log.info(`✅ Q: "${questionText}" → month: ${dateInfo.month}, year: ${dateInfo.year}`);
      return true;

    } catch (error) {
      log.debug(`Error with month/year dropdowns: ${error}`);
      return false;
    }
  }

  /**
   * Handle text input that accepts date strings
   */
  private async handleTextDateInput(element: Locator, questionText: string): Promise<boolean> {
    try {
      const input = element.locator('input[type="text"]').first();
      if (await input.count() === 0) return false;

      // Check if already filled
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Already filled: "${existingValue}"`);
        return true;
      }

      // Get answer
      const answer = await this.getDateAnswer(questionText);
      if (!answer) return false;

      await input.fill(answer);
      log.info(`✅ Q: "${questionText}" → "${answer}"`);
      return true;

    } catch {
      return false;
    }
  }

  /**
   * Get date answer from saved answers or GPT
   */
  private async getDateAnswer(questionText: string): Promise<string | null> {
    // Check saved answers first
    let answer = this.formUtils.getSavedAnswer('date', questionText);
    
    if (!answer) {
      // Ask GPT with specific prompt for dates
      const prompt = `${questionText} (Please provide a date. Common formats: YYYY-MM-DD, MM/DD/YYYY, or just month/year like "January 2024")`;
      answer = await this.gptAnswerer.answerTextual(prompt);
    }

    if (answer) {
      this.formUtils.rememberAnswer('date', questionText, answer);
    }

    return answer || null;
  }

  /**
   * Parse date answer into components
   */
  private parseDateAnswer(answer: string): { month?: number; year?: number; day?: number } {
    const result: { month?: number; year?: number; day?: number } = {};

    // Try YYYY-MM-DD format
    const isoMatch = answer.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      result.year = parseInt(isoMatch[1]);
      result.month = parseInt(isoMatch[2]);
      result.day = parseInt(isoMatch[3]);
      return result;
    }

    // Try MM/DD/YYYY format
    const usMatch = answer.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (usMatch) {
      result.month = parseInt(usMatch[1]);
      result.day = parseInt(usMatch[2]);
      result.year = parseInt(usMatch[3]);
      return result;
    }

    // Try "Month Year" format (e.g., "January 2024")
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const lower = answer.toLowerCase();
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) {
        result.month = i + 1;
        break;
      }
    }

    // Extract year
    const yearMatch = answer.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[0]);
    }

    return result;
  }

  /**
   * Format date for HTML5 date input (YYYY-MM-DD)
   */
  private formatDateForInput(answer: string): string | null {
    const parsed = this.parseDateAnswer(answer);
    
    if (!parsed.year) return null;
    
    const year = parsed.year;
    const month = (parsed.month || 1).toString().padStart(2, '0');
    const day = (parsed.day || 1).toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
}
