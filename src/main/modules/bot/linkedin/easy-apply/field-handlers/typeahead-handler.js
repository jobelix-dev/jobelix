import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
import { normalizeText } from "../form-utils.js";
const log = createLogger("TypeaheadHandler");
class TypeaheadHandler extends BaseFieldHandler {
  /**
   * Check if this element is a typeahead field
   * 
   * Typeahead fields typically have:
   * - An input with autocomplete attributes
   * - Data attributes like data-test-single-typeahead
   * - Associated listbox for suggestions
   */
  async canHandle(element) {
    try {
      const typeaheadInput = element.locator("[data-test-single-typeahead-input]");
      if (await typeaheadInput.count() > 0) return true;
      const combobox = element.locator('[role="combobox"]');
      if (await combobox.count() > 0) return true;
      const input = element.locator("input").first();
      if (await input.count() > 0) {
        const autocomplete = await input.getAttribute("autocomplete");
        const ariaAutocomplete = await input.getAttribute("aria-autocomplete");
        if (autocomplete === "off" && ariaAutocomplete === "list") {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  /**
   * Handle a typeahead field
   * 
   * Process:
   * 1. Get the question text
   * 2. Get answer from saved answers or GPT
   * 3. Type the answer into the input
   * 4. Wait for suggestions to appear
   * 5. Select the first matching suggestion
   */
  async handle(element) {
    try {
      const input = element.locator("input").first();
      if (await input.count() === 0) return false;
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Already filled: "${existingValue}"`);
        return true;
      }
      let answer = this.formUtils.getSavedAnswer("typeahead", questionText);
      if (!answer) {
        log.debug(`Asking GPT: "${questionText}"`);
        answer = await this.gptAnswerer.answerTextual(questionText);
      }
      if (!answer?.trim()) {
        log.warn("No answer available for typeahead");
        return false;
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 "${answer}"`);
      await input.click();
      await input.fill("");
      await input.pressSequentially(answer, { delay: 50 });
      await this.page.waitForTimeout(1e3);
      const selected = await this.selectSuggestion(element, answer);
      if (!selected) {
        log.debug("No matching suggestion found, keeping typed value");
      }
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
  async selectSuggestion(element, answer) {
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
      const normalizedAnswer = normalizeText(answer);
      for (const option of options) {
        const text = await option.textContent();
        if (!text) continue;
        const normalizedOption = normalizeText(text);
        if (normalizedOption === normalizedAnswer || normalizedOption.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedOption)) {
          await option.click();
          await this.page.waitForTimeout(500);
          log.debug(`Selected suggestion: "${text}"`);
          return true;
        }
      }
      if (options.length > 0) {
        const firstText = await options[0].textContent();
        await options[0].click();
        await this.page.waitForTimeout(500);
        log.debug(`Selected first suggestion: "${firstText}"`);
        return true;
      }
      return false;
    } catch (error) {
      log.debug(`Error selecting suggestion: ${error}`);
      return false;
    }
  }
}
export {
  TypeaheadHandler
};
//# sourceMappingURL=typeahead-handler.js.map
