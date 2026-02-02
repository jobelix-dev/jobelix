import { normalizeText } from "../form-utils.js";
import { SmartFieldMatcher } from "../utils/smart-field-matcher.js";
import { TIMEOUTS } from "../selectors.js";
import { createLogger } from "../../../utils/logger.js";
const log = createLogger("BaseHandler");
class BaseFieldHandler {
  /**
   * Create a new field handler
   * 
   * @param page - Playwright Page instance for DOM interactions
   * @param gptAnswerer - AI service for generating form responses
   * @param formUtils - Shared utilities for form processing
   */
  constructor(page, gptAnswerer, formUtils) {
    this.page = page;
    this.gptAnswerer = gptAnswerer;
    this.formUtils = formUtils;
  }
  /**
   * Extract question text from a form element
   * 
   * Searches for labels, legends, aria-labels, etc.
   * This is the text that gets sent to GPT for context.
   * 
   * @param element - The form element to search
   * @returns The question text, or a default value
   */
  async extractQuestionText(element) {
    const deduplicateText = (text) => {
      const trimmed = text.trim();
      if (trimmed.length < 4) return trimmed;
      const half = Math.floor(trimmed.length / 2);
      const firstHalf = trimmed.substring(0, half);
      const secondHalf = trimmed.substring(half);
      if (firstHalf === secondHalf) {
        return firstHalf;
      }
      return trimmed;
    };
    const getVisibleText = async (locator) => {
      try {
        const text = await locator.evaluate((el) => {
          const clone = el.cloneNode(true);
          clone.querySelectorAll(".visually-hidden, .sr-only").forEach((e) => e.remove());
          return clone.textContent;
        });
        return text?.trim() || null;
      } catch {
        const text = await locator.textContent();
        return text?.trim() || null;
      }
    };
    try {
      const legend = element.locator("legend").first();
      if (await legend.count() > 0) {
        const text = await getVisibleText(legend);
        if (text) return deduplicateText(text);
      }
    } catch {
    }
    try {
      const label = element.locator("label").first();
      if (await label.count() > 0) {
        const text = await getVisibleText(label);
        if (text) return deduplicateText(text);
      }
    } catch {
    }
    try {
      const title = element.locator("[data-test-form-builder-radio-button-form-component__title]").first();
      if (await title.count() > 0) {
        const text = await getVisibleText(title);
        if (text) return deduplicateText(text);
      }
    } catch {
    }
    try {
      const checkboxTitle = element.locator("[data-test-checkbox-form-title]").first();
      if (await checkboxTitle.count() > 0) {
        const text = await getVisibleText(checkboxTitle);
        if (text) return deduplicateText(text);
      }
    } catch {
    }
    try {
      const textEntityTitle = element.locator("[data-test-text-entity-list-form-title]").first();
      if (await textEntityTitle.count() > 0) {
        const text = await getVisibleText(textEntityTitle);
        if (text) return deduplicateText(text);
      }
    } catch {
    }
    try {
      const ariaLabel = await element.getAttribute("aria-label");
      if (ariaLabel?.trim()) return deduplicateText(ariaLabel.trim());
    } catch {
    }
    try {
      const input = element.locator("input, select, textarea").first();
      if (await input.count() > 0) {
        const name = await input.getAttribute("name");
        if (name) return name;
      }
    } catch {
    }
    return "unknown_question";
  }
  /**
   * Normalize text for comparison (case-insensitive, accent-insensitive)
   * 
   * This helps match user answers to options when there are minor differences
   * in capitalization, accents, or whitespace.
   */
  normalizeText(text) {
    return normalizeText(text);
  }
  /**
   * Create a SmartFieldMatcher instance for resume-based field matching
   */
  createSmartMatcher() {
    return new SmartFieldMatcher(this.gptAnswerer.resume ?? void 0);
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
  async handleValidationError(element, fieldType, questionText, originalAnswer, retryFn, fillCallback) {
    await this.page.waitForTimeout(TIMEOUTS.medium);
    const errorMsg = await this.formUtils.extractFieldErrors(element);
    if (!errorMsg) return;
    log.warn(`Validation error for "${fieldType}": ${errorMsg}`);
    const retryAnswer = await retryFn(questionText, originalAnswer, errorMsg);
    if (retryAnswer) {
      await fillCallback(retryAnswer);
      this.formUtils.rememberAnswer(fieldType, questionText, retryAnswer);
      log.info(`\u2705 Retry answer applied: "${retryAnswer.substring(0, 50)}..."`);
    }
  }
}
export {
  BaseFieldHandler
};
//# sourceMappingURL=base-handler.js.map
