import { createLogger } from "../../utils/logger.js";
const log = createLogger("FormUtils");
function normalizeText(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
class FormUtils {
  constructor(page, savedAnswers, recordCallback) {
    this.page = page;
    this.recordCallback = recordCallback;
    this.answers = /* @__PURE__ */ new Map();
    for (const { questionType, questionText, answer } of savedAnswers) {
      const key = `${questionType.toLowerCase()}:${questionText.toLowerCase()}`;
      this.answers.set(key, answer);
    }
    log.info(`Loaded ${this.answers.size} saved answers`);
  }
  /**
   * Normalize text for comparison
   */
  normalizeText(text) {
    return normalizeText(text);
  }
  /**
   * Get a saved answer for a question
   * 
   * Looks up answers using substring matching, so "years of experience"
   * will match questions like "How many years of experience do you have?"
   * 
   * @param fieldType - Type of field (radio, dropdown, text, etc.)
   * @param questionText - The question being asked
   * @returns Saved answer or undefined if not found
   */
  getSavedAnswer(fieldType, questionText) {
    const normalizedQuestion = questionText.toLowerCase();
    const typePrefix = fieldType.toLowerCase() + ":";
    const exactKey = typePrefix + normalizedQuestion;
    if (this.answers.has(exactKey)) {
      const answer = this.answers.get(exactKey);
      log.debug(`Found exact answer for "${questionText}": "${answer}"`);
      return answer;
    }
    for (const [key, answer] of this.answers) {
      if (!key.startsWith(typePrefix)) continue;
      const savedQuestion = key.substring(typePrefix.length);
      if (normalizedQuestion.includes(savedQuestion) || savedQuestion.includes(normalizedQuestion)) {
        log.debug(`Found fuzzy answer for "${questionText}": "${answer}"`);
        return answer;
      }
    }
    return void 0;
  }
  /**
   * Remember an answer for future use
   * 
   * Saves the answer to the in-memory cache and calls the record callback
   * to persist it to disk (old_Questions.csv).
   * 
   * @param fieldType - Type of field
   * @param questionText - The question
   * @param answer - The answer to save
   */
  rememberAnswer(fieldType, questionText, answer) {
    const key = `${fieldType.toLowerCase()}:${questionText.toLowerCase()}`;
    this.answers.set(key, answer);
    if (this.recordCallback) {
      try {
        this.recordCallback(fieldType, questionText, answer);
        log.debug(`Recorded answer: "${questionText}" \u2192 "${answer}"`);
      } catch (error) {
        log.error("Failed to record answer", error);
      }
    }
  }
  /**
   * Safe click operation with retry
   * 
   * LinkedIn forms can be finicky - this adds stability by:
   * 1. Scrolling element into view
   * 2. Waiting for element to be visible
   * 3. Retrying on failure
   * 
   * @param element - Element to click
   * @param retries - Number of retry attempts
   */
  async safeClick(element, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await element.scrollIntoViewIfNeeded();
        await element.waitFor({ state: "visible", timeout: 5e3 });
        await element.click();
        return;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        log.debug(`Click attempt ${attempt} failed, retrying...`);
        await this.page.waitForTimeout(500);
      }
    }
  }
  /**
   * Extract validation error messages from a form element
   * 
   * LinkedIn shows error messages in specific elements when validation fails.
   * This helps us detect and retry with better answers.
   * 
   * @param element - Form element to check for errors
   * @returns Error message or undefined if no errors
   */
  async extractFieldErrors(element) {
    try {
      const errorSelectors = [
        "[data-test-form-element-error-message]",
        ".artdeco-inline-feedback--error",
        ".fb-form-element__error-text",
        '[role="alert"]'
      ];
      for (const selector of errorSelectors) {
        const errorElement = element.locator(selector).first();
        if (await errorElement.count() > 0) {
          const text = await errorElement.textContent();
          if (text?.trim()) {
            return text.trim();
          }
        }
      }
    } catch {
    }
    return void 0;
  }
  /**
   * Generate a stable key for tracking processed elements
   * 
   * Used to avoid processing the same element twice during form scrolling.
   * 
   * @param element - Element to generate key for
   * @returns Unique identifier string
   */
  async stableKey(element) {
    try {
      const id = await element.getAttribute("id");
      if (id) return `id:${id}`;
      const name = await element.locator("input, select, textarea").first().getAttribute("name");
      if (name) return `name:${name}`;
      const text = await element.textContent();
      return `text:${text?.substring(0, 100)}`;
    } catch {
      return `fallback:${Date.now()}`;
    }
  }
}
export {
  FormUtils,
  normalizeText
};
//# sourceMappingURL=form-utils.js.map
