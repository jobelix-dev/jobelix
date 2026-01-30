import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
import { TIMEOUTS } from "../selectors.js";
const log = createLogger("DropdownHandler");
const MAX_OPTIONS_FOR_GPT = 100;
class DropdownHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a select dropdown
   */
  async canHandle(element) {
    try {
      return await element.locator("select").count() > 0;
    } catch {
      return false;
    }
  }
  /**
   * Handle a dropdown select field
   */
  async handle(element) {
    try {
      const select = element.locator("select").first();
      if (await select.count() === 0) return false;
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);
      const options = await this.extractOptions(select);
      if (options.length === 0) {
        log.warn("No options found for dropdown");
        return false;
      }
      log.debug(`Options: ${options.slice(0, 5).join(", ")}${options.length > 5 ? "..." : ""}`);
      log.debug(`Asking GPT: "${questionText}"`);
      const truncatedOptions = this.truncateOptionsForGPT(options, questionText);
      const answer = await this.gptAnswerer.answerFromOptions(questionText, truncatedOptions);
      if (!answer?.trim()) {
        log.warn("No answer available for dropdown");
        return false;
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 "${answer}"`);
      if (!await this.selectOption(select, options, answer)) {
        log.warn(`Could not find matching option for: "${answer}"`);
        return false;
      }
      this.formUtils.rememberAnswer("dropdown", questionText, answer);
      await this.handleValidationError(
        element,
        "dropdown",
        questionText,
        answer,
        (q, a, e) => this.gptAnswerer.answerFromOptionsWithRetry(q, options, a, e),
        async (retryAnswer) => {
          await this.selectOption(select, options, retryAnswer);
        }
      );
      return true;
    } catch (error) {
      log.error(`Error handling dropdown: ${error}`);
      return false;
    }
  }
  /**
   * Smart matching for school fields only (to match resume school name to dropdown options)
   */
  smartMatchSchool(questionText, options) {
    const questionLower = questionText.toLowerCase();
    if (this.isSchoolField(questionLower)) {
      log.debug("[SMART MATCH] Detected school/university field");
      const matcher = this.createSmartMatcher();
      return matcher.matchSchool(options) ?? void 0;
    }
    return void 0;
  }
  /**
   * Check if this is a school/university field
   */
  isSchoolField(questionLower) {
    return questionLower.includes("school") || questionLower.includes("university") || questionLower.includes("college") || questionLower.includes("institution");
  }
  /**
   * Truncate options for GPT to avoid "message too long" errors
   */
  truncateOptionsForGPT(options, questionText) {
    if (options.length <= MAX_OPTIONS_FOR_GPT) return options;
    log.warn(`Large dropdown (${options.length} options) - truncating to ${MAX_OPTIONS_FOR_GPT}`);
    if (this.isSchoolField(questionText.toLowerCase())) {
      log.error(`[SCHOOL] Could not find resume school - GPT will only see first ${MAX_OPTIONS_FOR_GPT}`);
    }
    return options.slice(0, MAX_OPTIONS_FOR_GPT);
  }
  /**
   * Extract options from select element (skip placeholders)
   */
  async extractOptions(select) {
    const options = [];
    const optionElements = await select.locator("option").all();
    for (let i = 0; i < optionElements.length; i++) {
      try {
        const opt = optionElements[i];
        const text = await opt.textContent();
        const value = await opt.getAttribute("value");
        if (i === 0 && (!value || text?.toLowerCase().includes("select"))) {
          continue;
        }
        if (text?.trim()) {
          options.push(text.trim());
        }
      } catch {
      }
    }
    return options;
  }
  /**
   * Select option by label (handles minor text differences)
   */
  async selectOption(select, options, answer) {
    const normalizedAnswer = this.normalizeText(answer);
    for (const option of options) {
      if (this.normalizeText(option) === normalizedAnswer) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(TIMEOUTS.medium);
          return true;
        } catch (error) {
          log.debug(`Failed to select "${option}": ${error}`);
        }
      }
    }
    for (const option of options) {
      const normalizedOption = this.normalizeText(option);
      if (normalizedOption.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedOption)) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(TIMEOUTS.medium);
          return true;
        } catch {
          continue;
        }
      }
    }
    return false;
  }
}
export {
  DropdownHandler
};
//# sourceMappingURL=dropdown-handler.js.map
