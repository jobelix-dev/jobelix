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

import type { Page, Locator } from 'playwright-core';
import type { FormUtils } from '../form-utils';
import type { Resume } from '../../../types';
import { normalizeText } from '../form-utils';
import { SmartFieldMatcher } from '../utils/smart-field-matcher';
import { TIMEOUTS } from '../selectors';
import { createLogger } from '../../../utils/logger';

const log = createLogger('BaseHandler');

/** Validation retry callback signature */
type RetryCallback = (answer: string) => Promise<void>;

/**
 * Interface for GPT answerer - allows flexibility with different implementations
 */
export interface GPTAnswererLike {
  resume: Resume | null;
  answerTextual(question: string): Promise<string>;
  answerFromOptions(question: string, options: string[]): Promise<string>;
  answerNumeric(question: string, defaultValue?: number): Promise<number>;
  answerCheckboxQuestion(prompt: string): Promise<string>;
  answerFromOptionsWithRetry(question: string, options: string[], previousAnswer: string, errorMessage: string): Promise<string>;
  answerTextualWithRetry(question: string, previousAnswer: string, errorMessage: string): Promise<string>;
  answerNumericWithRetry(question: string, previousAnswer: string, errorMessage: string, defaultValue?: number): Promise<number>;
  tailorResumeToJob?(jobDescription: string, baseResumeYaml: string): Promise<string>;
}

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
    protected gptAnswerer: GPTAnswererLike,
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
    // Helper to deduplicate text (handles "Code paysCode pays" -> "Code pays")
    // LinkedIn sometimes includes visually-hidden duplicate text for accessibility
    const deduplicateText = (text: string): string => {
      const trimmed = text.trim();
      if (trimmed.length < 4) return trimmed;
      
      // Check if the text is exactly doubled
      const half = Math.floor(trimmed.length / 2);
      const firstHalf = trimmed.substring(0, half);
      const secondHalf = trimmed.substring(half);
      if (firstHalf === secondHalf) {
        return firstHalf;
      }
      return trimmed;
    };

    // Helper to extract visible text only (excludes .visually-hidden elements)
    const getVisibleText = async (locator: Locator): Promise<string | null> => {
      try {
        // Use evaluate to exclude visually-hidden content (matches Python approach)
        // Note: The callback runs in browser context where DOM APIs are available
        //
        // IMPORTANT: LinkedIn's HTML structure:
        // - <span aria-hidden="true"> = VISIBLE text (shown on page, hidden from screen readers)
        // - <span class="visually-hidden"> = HIDDEN text (for screen readers only, CSS hidden)
        //
        // We must ONLY remove .visually-hidden and .sr-only elements, NOT [aria-hidden="true"]!
        const text = await locator.evaluate((el: Element): string | null => {
          const clone = el.cloneNode(true) as Element;
          // Remove ONLY screen-reader-only elements (NOT aria-hidden which contains visible text!)
          clone.querySelectorAll('.visually-hidden, .sr-only').forEach((e) => e.remove());
          return clone.textContent;
        });
        return text?.trim() || null;
      } catch {
        // Fallback to regular textContent
        const text = await locator.textContent();
        return text?.trim() || null;
      }
    };

    // Try different label sources in order of preference
    
    // 1. Try <legend> (for fieldsets/radio groups)
    try {
      const legend = element.locator('legend').first();
      if (await legend.count() > 0) {
        const text = await getVisibleText(legend);
        if (text) return deduplicateText(text);
      }
    } catch { /* ignore */ }

    // 2. Try <label> element
    try {
      const label = element.locator('label').first();
      if (await label.count() > 0) {
        const text = await getVisibleText(label);
        if (text) return deduplicateText(text);
      }
    } catch { /* ignore */ }

    // 3. Try data-test attribute for question title (radio buttons)
    try {
      const title = element.locator('[data-test-form-builder-radio-button-form-component__title]').first();
      if (await title.count() > 0) {
        const text = await getVisibleText(title);
        if (text) return deduplicateText(text);
      }
    } catch { /* ignore */ }

    // 4. Try data-test attribute for checkbox form title
    try {
      const checkboxTitle = element.locator('[data-test-checkbox-form-title]').first();
      if (await checkboxTitle.count() > 0) {
        const text = await getVisibleText(checkboxTitle);
        if (text) return deduplicateText(text);
      }
    } catch { /* ignore */ }

    // 5. Try data-test attribute for text entity list title (dropdowns with labels)
    try {
      const textEntityTitle = element.locator('[data-test-text-entity-list-form-title]').first();
      if (await textEntityTitle.count() > 0) {
        const text = await getVisibleText(textEntityTitle);
        if (text) return deduplicateText(text);
      }
    } catch { /* ignore */ }

    // 6. Try aria-label attribute
    try {
      const ariaLabel = await element.getAttribute('aria-label');
      if (ariaLabel?.trim()) return deduplicateText(ariaLabel.trim());
    } catch { /* ignore */ }

    // 7. Try input name attribute as fallback
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
    return normalizeText(text);
  }

  /**
   * Create a SmartFieldMatcher instance for resume-based field matching
   */
  protected createSmartMatcher(): SmartFieldMatcher {
    return new SmartFieldMatcher(this.gptAnswerer.resume ?? undefined);
  }

  /**
   * Handle validation errors with GPT retry
   * 
   * Consolidates the common pattern of:
   * 1. Check for validation error message
   * 2. If error, ask GPT for alternative answer
   * 3. Fill with retry answer and save it
   * 
   * @param element - Form element to check for errors
   * @param fieldType - Type of field for answer caching
   * @param questionText - The question being asked
   * @param originalAnswer - The answer that failed validation
   * @param retryFn - GPT retry function to call
   * @param fillCallback - Callback to fill in the new answer
   */
  protected async handleValidationError(
    element: Locator,
    fieldType: string,
    questionText: string,
    originalAnswer: string,
    retryFn: (question: string, answer: string, error: string) => Promise<string | undefined>,
    fillCallback: RetryCallback
  ): Promise<void> {
    await this.page.waitForTimeout(TIMEOUTS.medium);
    
    const errorMsg = await this.formUtils.extractFieldErrors(element);
    if (!errorMsg) return;

    log.warn(`Validation error for "${fieldType}": ${errorMsg}`);

    const retryAnswer = await retryFn(questionText, originalAnswer, errorMsg);
    if (retryAnswer) {
      await fillCallback(retryAnswer);
      this.formUtils.rememberAnswer(fieldType, questionText, retryAnswer);
      log.info(`✅ Retry answer applied: "${retryAnswer.substring(0, 50)}..."`);
    }
  }
}
