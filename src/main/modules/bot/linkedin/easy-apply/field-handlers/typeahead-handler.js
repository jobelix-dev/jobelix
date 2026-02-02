import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
import { TIMEOUTS } from "../selectors.js";
const log = createLogger("TypeaheadHandler");
class TypeaheadHandler extends BaseFieldHandler {
  /**
   * Check if this element is a typeahead field
   */
  async canHandle(element) {
    try {
      if (await element.locator("[data-test-single-typeahead-input]").count() > 0) return true;
      if (await element.locator('[role="combobox"]').count() > 0) return true;
      const input = element.locator("input").first();
      if (await input.count() > 0) {
        const autocomplete = await input.getAttribute("autocomplete");
        const ariaAutocomplete = await input.getAttribute("aria-autocomplete");
        if (autocomplete === "off" && ariaAutocomplete === "list") return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  /**
   * Handle a typeahead field
   */
  async handle(element) {
    try {
      const input = element.locator("input").first();
      if (await input.count() === 0) return false;
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Clearing LinkedIn prefill: "${existingValue}"`);
      }
      log.debug(`Asking GPT: "${questionText}"`);
      const answer = await this.gptAnswerer.answerTextual(questionText);
      if (!answer?.trim()) {
        log.warn("No answer available for typeahead");
        return false;
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 "${answer}"`);
      await input.click();
      await input.fill("");
      await input.pressSequentially(answer, { delay: TIMEOUTS.typing });
      await this.page.waitForTimeout(TIMEOUTS.long);
      await this.selectSuggestion(answer);
      this.formUtils.rememberAnswer("typeahead", questionText, answer);
      return true;
    } catch (error) {
      log.error(`Error handling typeahead: ${error}`);
      return false;
    }
  }
  /**
   * Select a suggestion from the dropdown
   */
  async selectSuggestion(answer) {
    try {
      const listbox = this.page.locator('[role="listbox"]').first();
      try {
        await listbox.waitFor({ state: "visible", timeout: 3e3 });
      } catch {
        log.debug("No listbox appeared");
        return false;
      }
      const options = await listbox.locator('[role="option"]').all();
      if (options.length === 0) {
        log.debug("No options in listbox");
        return false;
      }
      const normalizedAnswer = this.normalizeText(answer);
      for (const option of options) {
        const text = await option.textContent();
        if (!text) continue;
        const normalizedOption = this.normalizeText(text);
        if (this.isMatch(normalizedAnswer, normalizedOption)) {
          await option.click();
          await this.page.waitForTimeout(TIMEOUTS.medium);
          log.debug(`Selected suggestion: "${text}"`);
          return true;
        }
      }
      if (options.length > 0) {
        const firstText = await options[0].textContent();
        await options[0].click();
        await this.page.waitForTimeout(TIMEOUTS.medium);
        log.debug(`Selected first suggestion: "${firstText}"`);
        return true;
      }
      return false;
    } catch (error) {
      log.debug(`Error selecting suggestion: ${error}`);
      return false;
    }
  }
  /**
   * Check if two normalized strings match (exact or contains)
   */
  isMatch(a, b) {
    return a === b || a.includes(b) || b.includes(a);
  }
}
export {
  TypeaheadHandler
};
//# sourceMappingURL=typeahead-handler.js.map
