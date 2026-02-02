import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
import { normalizeText } from "../form-utils.js";
const log = createLogger("RadioHandler");
class RadioButtonHandler extends BaseFieldHandler {
  /**
   * Check if this element contains radio buttons
   */
  async canHandle(element) {
    try {
      const count = await element.locator("input[type=radio]").count();
      return count > 0;
    } catch {
      return false;
    }
  }
  /**
   * Handle a radio button group
   * 
   * Process flow:
   * 1. Find all radio buttons in the group
   * 2. Extract the question text
   * 3. Get all option labels
   * 4. Check for saved answer or ask GPT
   * 5. Click the matching option
   * 6. Check for validation errors and retry if needed
   */
  async handle(element) {
    try {
      const radios = await element.locator("input[type=radio]").all();
      if (radios.length === 0) return false;
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);
      const options = await this.extractOptions(element, radios);
      if (options.length === 0) {
        log.warn("No options found for radio group");
        return false;
      }
      log.debug(`Options: ${options.join(", ")}`);
      let answer = this.formUtils.getSavedAnswer("radio", questionText);
      let fromGPT = false;
      if (!answer) {
        log.debug(`Asking GPT: "${questionText}" with options [${options.join(", ")}]`);
        answer = await this.gptAnswerer.answerFromOptions(questionText, options);
        fromGPT = true;
      }
      if (!answer?.trim()) {
        log.warn("No answer available for radio question");
        return false;
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 "${answer}"`);
      const clicked = await this.selectOption(element, radios, answer);
      if (!clicked) {
        log.warn(`Could not find matching option for: "${answer}"`);
        return false;
      }
      if (fromGPT) {
        this.formUtils.rememberAnswer("radio", questionText, answer);
      }
      await this.page.waitForTimeout(250);
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      if (errorMsg) {
        log.warn(`Validation error after clicking "${answer}": ${errorMsg}`);
        const retryAnswer = await this.gptAnswerer.answerFromOptionsWithRetry(
          questionText,
          options,
          answer,
          errorMsg
        );
        if (retryAnswer?.trim()) {
          log.info(`\u{1F504} Retry answer: "${retryAnswer}"`);
          const retryClicked = await this.selectOption(element, radios, retryAnswer);
          if (retryClicked) {
            this.formUtils.rememberAnswer("radio", questionText, retryAnswer);
            await this.page.waitForTimeout(250);
            const retryError = await this.formUtils.extractFieldErrors(element);
            if (retryError) {
              log.error(`Retry failed, error persists: ${retryError}`);
            } else {
              log.info("\u2705 Retry successful, error cleared");
            }
          }
        }
      }
      return true;
    } catch (error) {
      log.error(`Error handling radio buttons: ${error}`);
      return false;
    }
  }
  /**
   * Extract option labels from radio buttons
   */
  async extractOptions(element, radios) {
    const options = [];
    for (const radio of radios) {
      try {
        const radioId = await radio.getAttribute("id");
        if (!radioId) continue;
        const label = element.locator(`label[for="${radioId}"]`).first();
        if (await label.count() > 0) {
          const text = await label.textContent();
          if (text?.trim()) {
            options.push(text.trim());
          }
        }
      } catch {
      }
    }
    return options;
  }
  /**
   * Find and click the radio button matching the answer
   */
  async selectOption(element, radios, answer) {
    const normalizedAnswer = normalizeText(answer);
    for (const radio of radios) {
      try {
        const radioId = await radio.getAttribute("id");
        if (!radioId) continue;
        const label = element.locator(`label[for="${radioId}"]`).first();
        if (await label.count() === 0) continue;
        const labelText = await label.textContent();
        if (!labelText) continue;
        const normalizedLabel = normalizeText(labelText);
        if (normalizedLabel === normalizedAnswer) {
          await this.formUtils.safeClick(label);
          await this.page.waitForTimeout(250);
          return true;
        }
      } catch {
      }
    }
    return false;
  }
}
export {
  RadioButtonHandler
};
//# sourceMappingURL=radio-handler.js.map
