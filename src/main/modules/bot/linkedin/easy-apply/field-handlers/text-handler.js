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
      const questionLower = questionText.toLowerCase();
      const isUrlField = questionLower.includes("website") || questionLower.includes("url") || questionLower.includes("portfolio") || questionLower.includes("github") || questionLower.includes("linkedin");
      if (isUrlField) {
        answer = await this.smartMatch(element, questionText);
        if (answer) {
          log.debug(`[URL FIELD] Smart match found URL: ${answer}`);
        }
      }
      if (!answer) {
        const savedAnswer = this.formUtils.getSavedAnswer("text", questionText);
        if (isUrlField) {
          if (savedAnswer && (savedAnswer.startsWith("http") || savedAnswer.includes(".com") || savedAnswer.includes(".io"))) {
            answer = savedAnswer;
          } else if (savedAnswer) {
            log.debug(`[URL FIELD] Ignoring non-URL saved answer: "${savedAnswer.substring(0, 50)}..."`);
          }
        } else {
          answer = savedAnswer;
        }
      }
      if (!answer && !isUrlField) {
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
      await this.page.waitForTimeout(150);
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
   * 
   * Uses language-independent HTML patterns to identify field types like:
   * - Location/City fields (geo-location pattern in element ID)
   * - Phone number fields
   * 
   * This matches the Python smart_text_match() logic in playwright_form_utils.py
   */
  async smartMatch(element, questionText) {
    try {
      const resume = this.gptAnswerer.resume;
      if (!resume?.personalInformation) {
        log.debug("[SMART TEXT] No resume or personal info available");
        return void 0;
      }
      const personalInfo = resume.personalInformation;
      const input = element.locator("input").first();
      if (await input.count() === 0) {
        return void 0;
      }
      const elementId = (await input.getAttribute("id") || "").toLowerCase();
      log.debug(`[SMART TEXT] Element ID: ${elementId}`);
      if (elementId.includes("geo-location") || elementId.includes("location-geo")) {
        log.debug("[SMART TEXT] Detected location/city field (by HTML structure)");
        const city = personalInfo.city;
        if (city) {
          log.info(`[SMART TEXT] \u2705 Using city from resume: ${city}`);
          return city;
        } else {
          log.warn("[SMART TEXT] No city in resume");
        }
        return void 0;
      }
      if (elementId.includes("phonenumber-nationalnumber") || elementId.includes("phone-national")) {
        log.debug("[SMART TEXT] Detected phone number field (by HTML structure)");
        const phone = personalInfo.phonePrefix && personalInfo.phone ? `${personalInfo.phonePrefix}${personalInfo.phone}` : personalInfo.phone;
        if (phone) {
          log.info(`[SMART TEXT] \u2705 Using phone from resume: ${phone}`);
          return phone;
        } else {
          log.warn("[SMART TEXT] No phone in resume");
        }
        return void 0;
      }
      const questionLower = questionText.toLowerCase();
      if (questionLower.includes("website") || questionLower.includes("url") || questionLower.includes("portfolio") || questionLower.includes("personal site") || questionLower.includes("github") || questionLower.includes("linkedin")) {
        log.debug("[SMART TEXT] Detected URL/Website field (by question text)");
        const profiles = resume?.profiles || personalInfo?.profiles || [];
        if (questionLower.includes("github")) {
          const github = profiles.find((p) => p.network?.toLowerCase() === "github" || p.url?.includes("github"));
          if (github?.url) {
            log.info(`[SMART TEXT] \u2705 Using GitHub from resume: ${github.url}`);
            return github.url;
          }
        }
        if (questionLower.includes("linkedin")) {
          const linkedin = profiles.find((p) => p.network?.toLowerCase() === "linkedin" || p.url?.includes("linkedin"));
          if (linkedin?.url) {
            log.info(`[SMART TEXT] \u2705 Using LinkedIn from resume: ${linkedin.url}`);
            return linkedin.url;
          }
        }
        if (questionLower.includes("website") || questionLower.includes("portfolio") || questionLower.includes("personal site") || questionLower.includes("url")) {
          const portfolio = profiles.find((p) => p.network?.toLowerCase() === "portfolio" || p.url && !p.url.includes("linkedin") && !p.url.includes("github"));
          if (portfolio?.url) {
            log.info(`[SMART TEXT] \u2705 Using portfolio from resume: ${portfolio.url}`);
            return portfolio.url;
          }
          const github = profiles.find((p) => p.network?.toLowerCase() === "github" || p.url?.includes("github"));
          if (github?.url) {
            log.info(`[SMART TEXT] \u2705 Using GitHub for website: ${github.url}`);
            return github.url;
          }
          const personalWebsite = personalInfo?.website || personalInfo?.url;
          if (personalWebsite) {
            log.info(`[SMART TEXT] \u2705 Using website from personal info: ${personalWebsite}`);
            return personalWebsite;
          }
          log.debug("[SMART TEXT] No URL/website found in resume profiles");
        }
      }
      if (questionLower.includes("phone") && !questionLower.includes("prefix")) {
        const phone = personalInfo.phonePrefix && personalInfo.phone ? `${personalInfo.phonePrefix}${personalInfo.phone}` : personalInfo.phone;
        if (phone) {
          log.info(`[SMART TEXT] \u2705 Using phone from resume (by question): ${phone}`);
          return phone;
        }
      }
      if (questionLower.includes("city") || questionLower.includes("location")) {
        const city = personalInfo.city;
        if (city) {
          log.info(`[SMART TEXT] \u2705 Using city from resume (by question): ${city}`);
          return city;
        }
      }
      log.debug("[SMART TEXT] No pattern matched");
      return void 0;
    } catch (error) {
      log.debug(`[SMART TEXT] Error analyzing element: ${error}`);
      return void 0;
    }
  }
}
export {
  TextInputHandler
};
//# sourceMappingURL=text-handler.js.map
