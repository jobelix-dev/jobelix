import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
const log = createLogger("TextareaHandler");
class TextareaHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a textarea
   */
  async canHandle(element) {
    try {
      const count = await element.locator("textarea").count();
      return count > 0;
    } catch {
      return false;
    }
  }
  /**
   * Handle a textarea field
   */
  async handle(element) {
    try {
      const textarea = element.locator("textarea").first();
      if (await textarea.count() === 0) return false;
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);
      const existingValue = await textarea.inputValue();
      if (existingValue?.trim() && existingValue.length > 50) {
        log.debug("Textarea already has substantial content, skipping");
        return true;
      }
      log.debug(`Asking GPT for long-form answer: "${questionText}"`);
      const answer = await this.gptAnswerer.answerTextual(questionText);
      if (!answer?.trim()) {
        log.warn("No answer available for textarea");
        return false;
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 [${answer.length} chars]`);
      await textarea.click();
      await textarea.fill("");
      await textarea.fill(answer);
      await this.page.waitForTimeout(300);
      this.formUtils.rememberAnswer("textarea", questionText, answer);
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      if (errorMsg) {
        log.warn(`Validation error: ${errorMsg}`);
        const retryAnswer = await this.gptAnswerer.answerTextualWithRetry(
          questionText,
          answer,
          errorMsg
        );
        if (retryAnswer) {
          await textarea.fill("");
          await textarea.fill(retryAnswer);
          this.formUtils.rememberAnswer("textarea", questionText, retryAnswer);
        }
      }
      return true;
    } catch (error) {
      log.error(`Error handling textarea: ${error}`);
      return false;
    }
  }
}
export {
  TextareaHandler
};
//# sourceMappingURL=textarea-handler.js.map
