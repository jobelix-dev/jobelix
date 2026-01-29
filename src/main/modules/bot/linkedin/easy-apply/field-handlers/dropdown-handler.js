import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
import { normalizeText } from "../form-utils.js";
const log = createLogger("DropdownHandler");
class DropdownHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a select dropdown
   */
  async canHandle(element) {
    try {
      const count = await element.locator("select").count();
      return count > 0;
    } catch {
      return false;
    }
  }
  /**
   * Handle a dropdown select field
   * 
   * Process flow:
   * 1. Find the select element
   * 2. Extract question text
   * 3. Get all options (skip placeholder)
   * 4. Try saved answer → smart match → GPT
   * 5. Select the matching option
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
      let answer;
      let fromGPT = false;
      answer = this.formUtils.getSavedAnswer("dropdown", questionText);
      if (!answer) {
        answer = await this.smartMatch(element, questionText, options);
      }
      if (!answer) {
        log.debug(`Asking GPT: "${questionText}"`);
        const MAX_OPTIONS_FOR_GPT = 100;
        let optionsForGPT = options;
        if (options.length > MAX_OPTIONS_FOR_GPT) {
          log.warn(`Large dropdown (${options.length} options) - truncating to ${MAX_OPTIONS_FOR_GPT} for GPT`);
          optionsForGPT = options.slice(0, MAX_OPTIONS_FOR_GPT);
          const questionLower = questionText.toLowerCase();
          if (questionLower.includes("school") || questionLower.includes("university")) {
            log.error(`[SCHOOL] Could not find resume school in ${options.length} options - GPT will only see first ${MAX_OPTIONS_FOR_GPT}`);
          }
        }
        answer = await this.gptAnswerer.answerFromOptions(questionText, optionsForGPT);
        fromGPT = true;
      }
      if (!answer?.trim()) {
        log.warn("No answer available for dropdown");
        return false;
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 "${answer}"`);
      const selected = await this.selectOption(select, options, answer);
      if (!selected) {
        log.warn(`Could not find matching option for: "${answer}"`);
        return false;
      }
      if (fromGPT) {
        this.formUtils.rememberAnswer("dropdown", questionText, answer);
      }
      await this.page.waitForTimeout(500);
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      if (errorMsg) {
        log.warn(`Validation error: ${errorMsg}`);
        const retryAnswer = await this.gptAnswerer.answerFromOptionsWithRetry(
          questionText,
          options,
          answer,
          errorMsg
        );
        if (retryAnswer) {
          await this.selectOption(select, options, retryAnswer);
          this.formUtils.rememberAnswer("dropdown", questionText, retryAnswer);
        }
      }
      return true;
    } catch (error) {
      log.error(`Error handling dropdown: ${error}`);
      return false;
    }
  }
  /**
   * Extract options from select element
   * Skips placeholder options (empty value or "Select...")
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
   * Smart matching for common dropdown types
   * 
   * Handles special cases where we can infer the answer from context:
   * - Phone prefix → match user's phone number
   * - Country → use resume country
   * - School/University → use resume education
   */
  async smartMatch(element, questionText, options) {
    const questionLower = questionText.toLowerCase();
    const resume = this.gptAnswerer.resume;
    if (questionLower.includes("school") || questionLower.includes("university") || questionLower.includes("college") || questionLower.includes("institution")) {
      log.debug("[SMART MATCH] Detected school/university field");
      const alternativeNames = {
        "universit\xE9 psl": ["Paris Sciences et Lettres", "PSL University", "PSL Research University"],
        "psl": ["Paris Sciences et Lettres", "PSL University"],
        "institut polytechnique de paris": ["IP Paris", "Polytechnique Paris", "Institut Polytechnique"],
        "telecom sudparis": ["T\xE9l\xE9com SudParis", "Telecom SudParis", "TSP"],
        "telecom paris": ["T\xE9l\xE9com Paris", "ENST"],
        "ecole polytechnique": ["Polytechnique", "X"],
        "hec paris": ["HEC", "HEC School of Management"],
        "sciences po": ["Sciences Po Paris", "Institut d'\xC9tudes Politiques"],
        "ens": ["\xC9cole Normale Sup\xE9rieure", "ENS Paris", "Normale Sup"],
        "centrale": ["CentraleSup\xE9lec", "\xC9cole Centrale"],
        "mines": ["MINES ParisTech", "\xC9cole des Mines"],
        "sainte-genevi\xE8ve": ["Ginette", "Sainte Genevi\xE8ve"]
      };
      if (resume?.education && resume.education.length > 0) {
        for (const edu of resume.education) {
          const institution = edu.institution || edu.school;
          if (!institution) continue;
          const instLower = institution.toLowerCase();
          log.debug(`[SMART MATCH] Checking resume institution: "${institution}"`);
          const exactMatch = options.find(
            (o) => o.toLowerCase() === instLower
          );
          if (exactMatch) {
            log.info(`[SMART MATCH] \u2705 Found exact school match: "${exactMatch}"`);
            return exactMatch;
          }
          for (const [key, alts] of Object.entries(alternativeNames)) {
            if (instLower.includes(key)) {
              for (const alt of alts) {
                const altMatch = options.find(
                  (o) => o.toLowerCase().includes(alt.toLowerCase()) || alt.toLowerCase().includes(o.toLowerCase())
                );
                if (altMatch) {
                  log.info(`[SMART MATCH] \u2705 Found alternative name match: "${altMatch}" (via "${alt}")`);
                  return altMatch;
                }
              }
            }
          }
          const partialMatch = options.find(
            (o) => o.toLowerCase().includes(instLower) || instLower.includes(o.toLowerCase())
          );
          if (partialMatch) {
            log.info(`[SMART MATCH] \u2705 Found partial school match: "${partialMatch}"`);
            return partialMatch;
          }
          const institutionWords = instLower.split(/[\s\-()]+/).filter((w) => w.length > 4);
          for (const word of institutionWords) {
            if (["university", "institut", "\xE9cole", "ecole", "paris", "france"].includes(word)) continue;
            const wordMatch = options.find((o) => o.toLowerCase().includes(word));
            if (wordMatch) {
              log.info(`[SMART MATCH] \u2705 Found word-based school match: "${wordMatch}" (word: "${word}")`);
              return wordMatch;
            }
          }
        }
        log.warn("[SMART MATCH] No school match found in options - resume schools may not be in dropdown");
      }
    }
    if (questionLower.includes("phone") || questionLower.includes("prefix") || questionLower.includes("code")) {
      const selectId = await element.locator("select").first().getAttribute("id") || "";
      if (selectId.includes("phonePrefix") || selectId.includes("countryCode")) {
        const preferredPrefixes = ["+1", "+44", "+33", "+49"];
        for (const prefix of preferredPrefixes) {
          const match = options.find((o) => o.includes(prefix));
          if (match) {
            log.debug(`Smart match (phone prefix): "${match}"`);
            return match;
          }
        }
      }
    }
    return void 0;
  }
  /**
   * Select option by label (handles minor text differences)
   */
  async selectOption(select, options, answer) {
    const normalizedAnswer = normalizeText(answer);
    for (const option of options) {
      const normalizedOption = normalizeText(option);
      if (normalizedOption === normalizedAnswer) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(500);
          return true;
        } catch (error) {
          log.debug(`Failed to select "${option}": ${error}`);
        }
      }
    }
    for (const option of options) {
      if (normalizeText(option).includes(normalizedAnswer) || normalizedAnswer.includes(normalizeText(option))) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(500);
          return true;
        } catch {
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
