import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
import { TIMEOUTS } from "../selectors.js";
const log = createLogger("TextHandler");
const EXCLUDED_INPUT_TYPES = ["button", "submit", "checkbox", "radio", "file", "hidden"];
class TextInputHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a text input
   */
  async canHandle(element) {
    try {
      const inputs = await element.locator("input").all();
      for (const input of inputs) {
        const type = await input.getAttribute("type") || "text";
        if (!EXCLUDED_INPUT_TYPES.includes(type)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  /**
   * Handle a text input field
   */
  async handle(element) {
    try {
      const input = element.locator("input").first();
      if (await input.count() === 0) return false;
      const inputType = await input.getAttribute("type") || "text";
      if (EXCLUDED_INPUT_TYPES.includes(inputType)) return false;
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Clearing LinkedIn prefill: "${existingValue}"`);
      }
      const answer = await this.askGpt(input, questionText);
      if (!answer?.trim()) {
        log.warn("No answer available for text input");
        return false;
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 "${this.truncate(answer)}"`);
      await this.fillInput(input, answer);
      this.formUtils.rememberAnswer("text", questionText, answer);
      await this.handleValidationError(
        element,
        "text",
        questionText,
        answer,
        (q, a, e) => this.gptAnswerer.answerTextualWithRetry(q, a, e),
        async (retryAnswer) => this.fillInput(input, retryAnswer)
      );
      return true;
    } catch (error) {
      log.error(`Error handling text input: ${error}`);
      return false;
    }
  }
  /**
   * Ask GPT for an answer (numeric or textual)
   */
  async askGpt(input, questionText) {
    const isNumeric = await this.isNumericField(input);
    if (isNumeric) {
      log.debug(`Asking GPT (numeric): "${questionText}"`);
      const numAnswer = await this.gptAnswerer.answerNumeric(questionText);
      return String(numAnswer);
    } else {
      log.debug(`Asking GPT (textual): "${questionText}"`);
      return this.gptAnswerer.answerTextual(questionText);
    }
  }
  /**
   * Fill an input field
   */
  async fillInput(input, value) {
    await input.click();
    await input.fill("");
    await input.fill(value);
    await this.page.waitForTimeout(TIMEOUTS.short);
  }
  /**
   * Truncate text for logging
   */
  truncate(text, maxLen = 50) {
    return text.length > maxLen ? `${text.substring(0, maxLen)}...` : text;
  }
  /**
   * Check if this is a numeric field
   */
  async isNumericField(input) {
    try {
      const type = await input.getAttribute("type");
      if (type === "number") return true;
      const inputmode = await input.getAttribute("inputmode");
      if (inputmode && ["numeric", "decimal"].includes(inputmode)) return true;
      const id = await input.getAttribute("id") || "";
      const name = await input.getAttribute("name") || "";
      return id.includes("numeric") || id.includes("number") || name.includes("numeric") || name.includes("number");
    } catch {
      return false;
    }
  }
}
export {
  TextInputHandler
};
//# sourceMappingURL=text-handler.js.map
