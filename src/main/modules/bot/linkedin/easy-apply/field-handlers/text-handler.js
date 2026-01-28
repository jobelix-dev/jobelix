import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
const log = createLogger("TextHandler");
class TextInputHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a text input
   * Excludes radio, checkbox, file, and button inputs
   */
  async canHandle(element) {
    try {
      const inputs = await element.locator("input").all();
      for (const input of inputs) {
        const type = await input.getAttribute("type") || "text";
        if (!["button", "submit", "checkbox", "radio", "file", "hidden"].includes(type)) {
          return true;
        }
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
      if (["button", "submit", "checkbox", "radio", "file", "hidden"].includes(inputType)) {
        return false;
      }
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`LinkedIn pre-filled: "${existingValue}" - checking if we should override`);
        if (!existingValue.toLowerCase().includes("select") && !existingValue.toLowerCase().includes("enter")) {
          log.debug("Keeping pre-filled value");
          return true;
        }
      }
      const isNumeric = await this.isNumericField(input);
      let answer;
      answer = this.formUtils.getSavedAnswer("text", questionText);
      if (!answer) {
        answer = await this.smartMatch(element, questionText);
      }
      if (!answer) {
        if (isNumeric) {
          log.debug(`Asking GPT (numeric): "${questionText}"`);
          const numAnswer = await this.gptAnswerer.answerNumeric(questionText);
          answer = String(numAnswer);
        } else {
          log.debug(`Asking GPT (textual): "${questionText}"`);
          answer = await this.gptAnswerer.answerTextual(questionText);
        }
      }
      if (!answer?.trim()) {
        log.warn("No answer available for text input");
        return false;
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 "${answer.substring(0, 50)}${answer.length > 50 ? "..." : ""}"`);
      await input.click();
      await input.fill("");
      await input.fill(answer);
      await this.page.waitForTimeout(300);
      this.formUtils.rememberAnswer("text", questionText, answer);
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      if (errorMsg) {
        log.warn(`Validation error: ${errorMsg}`);
        const retryAnswer = await this.gptAnswerer.answerTextualWithRetry(
          questionText,
          answer,
          errorMsg
        );
        if (retryAnswer) {
          await input.fill("");
          await input.fill(retryAnswer);
          this.formUtils.rememberAnswer("text", questionText, retryAnswer);
        }
      }
      return true;
    } catch (error) {
      log.error(`Error handling text input: ${error}`);
      return false;
    }
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
  /**
   * Smart matching for common text fields
   */
  async smartMatch(element, questionText) {
    const questionLower = questionText.toLowerCase();
    if (questionLower.includes("phone") && !questionLower.includes("prefix")) {
      return void 0;
    }
    return void 0;
  }
}
export {
  TextInputHandler
};
//# sourceMappingURL=text-handler.js.map
