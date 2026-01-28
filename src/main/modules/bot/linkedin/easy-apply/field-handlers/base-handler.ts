/**
 * Base Field Handler - Abstract class for form field handlers
 * 
 * All field handlers inherit from this base class.
 * Each handler is responsible for detecting and filling one type of form field.
 * 
 * DESIGN PATTERN: Strategy Pattern
 * ================================
 * Each handler encapsulates a specific algorithm for handling a field type.
 * The FormHandler iterates through handlers and uses the first one that
 * says it can handle the current element.
 */

import type { Page, Locator } from 'playwright';
import type { GPTAnswerer } from '../../ai/gpt-answerer';
import type { FormUtils } from '../form-utils';

/**
 * Abstract base class for all field handlers
 * 
 * To create a new field handler:
 * 1. Extend this class
 * 2. Implement canHandle() to detect your field type
 * 3. Implement handle() to fill the field
 */
export abstract class BaseFieldHandler {
  /**
   * Create a new field handler
   * 
   * @param page - Playwright Page instance for DOM interactions
   * @param gptAnswerer - AI service for generating form responses
   * @param formUtils - Shared utilities for form processing
   */
  constructor(
    protected page: Page,
    protected gptAnswerer: GPTAnswerer,
    protected formUtils: FormUtils
  ) {}

  /**
   * Check if this handler can process the given element
   * 
   * Override this in subclasses to detect specific field types.
   * For example, RadioButtonHandler checks for input[type=radio] elements.
   * 
   * @param element - The form element to check
   * @returns True if this handler can process the element
   */
  abstract canHandle(element: Locator): Promise<boolean>;

  /**
   * Process the form field
   * 
   * Override this in subclasses to implement field-specific logic.
   * This typically involves:
   * 1. Extracting the question text
   * 2. Getting available options (if applicable)
   * 3. Finding a saved answer or asking GPT
   * 4. Filling in the field
   * 
   * @param element - The form element to process
   * @returns True if the field was handled successfully
   */
  abstract handle(element: Locator): Promise<boolean>;

  /**
   * Extract question text from a form element
   * 
   * Searches for labels, legends, aria-labels, etc.
   * This is the text that gets sent to GPT for context.
   * 
   * @param element - The form element to search
   * @returns The question text, or a default value
   */
  protected async extractQuestionText(element: Locator): Promise<string> {
    // Try different label sources in order of preference
    
    // 1. Try <legend> (for fieldsets/radio groups)
    try {
      const legend = element.locator('legend').first();
      if (await legend.count() > 0) {
        const text = await legend.textContent();
        if (text?.trim()) return text.trim();
      }
    } catch { /* ignore */ }

    // 2. Try <label> element
    try {
      const label = element.locator('label').first();
      if (await label.count() > 0) {
        const text = await label.textContent();
        if (text?.trim()) return text.trim();
      }
    } catch { /* ignore */ }

    // 3. Try data-test attribute for question title
    try {
      const title = element.locator('[data-test-form-builder-radio-button-form-component__title]').first();
      if (await title.count() > 0) {
        const text = await title.textContent();
        if (text?.trim()) return text.trim();
      }
    } catch { /* ignore */ }

    // 4. Try aria-label attribute
    try {
      const ariaLabel = await element.getAttribute('aria-label');
      if (ariaLabel?.trim()) return ariaLabel.trim();
    } catch { /* ignore */ }

    // 5. Try input name attribute as fallback
    try {
      const input = element.locator('input, select, textarea').first();
      if (await input.count() > 0) {
        const name = await input.getAttribute('name');
        if (name) return name;
      }
    } catch { /* ignore */ }

    return 'unknown_question';
  }

  /**
   * Normalize text for comparison (case-insensitive, accent-insensitive)
   * 
   * This helps match user answers to options when there are minor differences
   * in capitalization, accents, or whitespace.
   */
  protected normalizeText(text: string): string {
    return this.formUtils.normalizeText(text);
  }
}
