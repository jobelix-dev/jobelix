import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
import { normalizeText } from "../form-utils.js";
const log = createLogger("CheckboxHandler");
class CheckboxHandler extends BaseFieldHandler {
  /**
   * Check if this element is a checkbox field
   */
  async canHandle(element) {
    try {
      const checkboxes = element.locator('input[type="checkbox"]');
      return await checkboxes.count() > 0;
    } catch {
      return false;
    }
  }
  /**
   * Handle a checkbox field
   * 
   * For single checkboxes (terms/consent), auto-check them
   * For multiple checkboxes (preferences), ask GPT which to select
   */
  async handle(element) {
    try {
      const checkboxes = await element.locator('input[type="checkbox"]').all();
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}" (${checkboxes.length} checkbox(es))`);
      if (checkboxes.length === 1) {
        return await this.handleSingleCheckbox(element, checkboxes[0], questionText);
      }
      return await this.handleMultipleCheckboxes(element, checkboxes, questionText);
    } catch (error) {
      log.error(`Error handling checkbox: ${error}`);
      return false;
    }
  }
  /**
   * Handle a single checkbox (typically consent/agreement)
   */
  async handleSingleCheckbox(element, checkbox, questionText) {
    try {
      const isChecked = await checkbox.isChecked();
      if (isChecked) {
        log.debug("Checkbox already checked");
        return true;
      }
      const labelText = await this.getCheckboxLabel(element, checkbox);
      const lowerLabel = labelText.toLowerCase();
      const autoCheckKeywords = [
        "agree",
        "accept",
        "consent",
        "acknowledge",
        "confirm",
        "terms",
        "privacy",
        "policy",
        "understand",
        "certify"
      ];
      const shouldAutoCheck = autoCheckKeywords.some(
        (keyword) => lowerLabel.includes(keyword) || questionText.toLowerCase().includes(keyword)
      );
      if (shouldAutoCheck) {
        await checkbox.check();
        log.info(`\u2705 Auto-checked consent: "${labelText.substring(0, 50)}..."`);
        return true;
      }
      const prompt = `Should I check this checkbox? "${labelText}" (Answer: yes or no)`;
      const answer = await this.gptAnswerer.answerTextual(prompt);
      if (answer?.toLowerCase().includes("yes")) {
        await checkbox.check();
        log.info(`\u2705 Checked: "${labelText.substring(0, 50)}..."`);
      } else {
        log.debug(`Left unchecked: "${labelText.substring(0, 50)}..."`);
      }
      return true;
    } catch (error) {
      log.debug(`Error with single checkbox: ${error}`);
      return false;
    }
  }
  /**
   * Handle multiple checkboxes (e.g., preferences, skills)
   */
  async handleMultipleCheckboxes(element, checkboxes, questionText) {
    try {
      const options = [];
      for (const checkbox of checkboxes) {
        const label = await this.getCheckboxLabel(element, checkbox);
        options.push({ checkbox, label });
      }
      const optionsList = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");
      const prompt = `Question: "${questionText}"

Options:
${optionsList}

Which options should I select? List the numbers separated by commas, or say "none".`;
      const answer = await this.gptAnswerer.answerTextual(prompt);
      if (!answer || answer.toLowerCase() === "none") {
        log.debug("No checkboxes selected");
        return true;
      }
      const selectedNumbers = this.parseSelectedNumbers(answer, options.length);
      for (const num of selectedNumbers) {
        const option = options[num - 1];
        if (option && !await option.checkbox.isChecked()) {
          await option.checkbox.check();
          log.info(`\u2705 Checked: "${option.label}"`);
          await this.page.waitForTimeout(200);
        }
      }
      return true;
    } catch (error) {
      log.debug(`Error with multiple checkboxes: ${error}`);
      return false;
    }
  }
  /**
   * Get the label text for a checkbox
   */
  async getCheckboxLabel(container, checkbox) {
    try {
      const checkboxId = await checkbox.getAttribute("id");
      if (checkboxId) {
        const label = container.locator(`label[for="${checkboxId}"]`);
        if (await label.count() > 0) {
          const text2 = await label.textContent();
          if (text2?.trim()) return normalizeText(text2);
        }
      }
      const parentLabel = checkbox.locator("xpath=ancestor::label");
      if (await parentLabel.count() > 0) {
        const text2 = await parentLabel.textContent();
        if (text2?.trim()) return normalizeText(text2);
      }
      const parent = checkbox.locator("xpath=..");
      const text = await parent.textContent();
      return normalizeText(text || "");
    } catch {
      return "";
    }
  }
  /**
   * Parse GPT's answer for selected checkbox numbers
   */
  parseSelectedNumbers(answer, maxNum) {
    const numbers = [];
    const matches = answer.match(/\d+/g);
    if (!matches) return numbers;
    for (const match of matches) {
      const num = parseInt(match);
      if (num >= 1 && num <= maxNum && !numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers;
  }
}
export {
  CheckboxHandler
};
//# sourceMappingURL=checkbox-handler.js.map
