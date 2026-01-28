import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
const log = createLogger("DateHandler");
class DateHandler extends BaseFieldHandler {
  /**
   * Check if this element is a date field
   */
  async canHandle(element) {
    try {
      const dateInput = element.locator('input[type="date"]');
      if (await dateInput.count() > 0) return true;
      const monthSelect = element.locator('select[id*="month"], select[name*="month"]');
      const yearSelect = element.locator('select[id*="year"], select[name*="year"]');
      if (await monthSelect.count() > 0 || await yearSelect.count() > 0) return true;
      const label = element.locator("label");
      if (await label.count() > 0) {
        const labelText = await label.textContent() || "";
        const lowerLabel = labelText.toLowerCase();
        if (lowerLabel.includes("date") || lowerLabel.includes("when") || lowerLabel.includes("start") || lowerLabel.includes("end")) {
          const input = element.locator("input, select");
          if (await input.count() > 0) return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
  /**
   * Handle a date field
   */
  async handle(element) {
    try {
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);
      let success = false;
      success = await this.handleDateInput(element, questionText);
      if (success) return true;
      success = await this.handleMonthYearDropdowns(element, questionText);
      if (success) return true;
      success = await this.handleTextDateInput(element, questionText);
      if (success) return true;
      log.warn(`Could not handle date field: "${questionText}"`);
      return false;
    } catch (error) {
      log.error(`Error handling date field: ${error}`);
      return false;
    }
  }
  /**
   * Handle standard HTML5 date input
   */
  async handleDateInput(element, questionText) {
    try {
      const dateInput = element.locator('input[type="date"]').first();
      if (await dateInput.count() === 0) return false;
      const existingValue = await dateInput.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Already filled: "${existingValue}"`);
        return true;
      }
      const answer = await this.getDateAnswer(questionText);
      if (!answer) return false;
      const formattedDate = this.formatDateForInput(answer);
      if (!formattedDate) {
        log.warn(`Could not format date: "${answer}"`);
        return false;
      }
      await dateInput.fill(formattedDate);
      log.info(`\u2705 Q: "${questionText}" \u2192 "${formattedDate}"`);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Handle LinkedIn-style month/year dropdowns
   */
  async handleMonthYearDropdowns(element, questionText) {
    try {
      const monthSelect = element.locator('select[id*="month"], select[name*="month"]').first();
      const hasMonth = await monthSelect.count() > 0;
      const yearSelect = element.locator('select[id*="year"], select[name*="year"]').first();
      const hasYear = await yearSelect.count() > 0;
      if (!hasMonth && !hasYear) return false;
      const answer = await this.getDateAnswer(questionText);
      if (!answer) return false;
      const dateInfo = this.parseDateAnswer(answer);
      if (hasMonth && dateInfo.month) {
        const monthValue = dateInfo.month.toString().padStart(2, "0");
        await monthSelect.selectOption({ value: monthValue });
        log.debug(`Selected month: ${dateInfo.month}`);
      }
      if (hasYear && dateInfo.year) {
        await yearSelect.selectOption({ value: dateInfo.year.toString() });
        log.debug(`Selected year: ${dateInfo.year}`);
      }
      log.info(`\u2705 Q: "${questionText}" \u2192 month: ${dateInfo.month}, year: ${dateInfo.year}`);
      return true;
    } catch (error) {
      log.debug(`Error with month/year dropdowns: ${error}`);
      return false;
    }
  }
  /**
   * Handle text input that accepts date strings
   */
  async handleTextDateInput(element, questionText) {
    try {
      const input = element.locator('input[type="text"]').first();
      if (await input.count() === 0) return false;
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`Already filled: "${existingValue}"`);
        return true;
      }
      const answer = await this.getDateAnswer(questionText);
      if (!answer) return false;
      await input.fill(answer);
      log.info(`\u2705 Q: "${questionText}" \u2192 "${answer}"`);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get date answer from saved answers or GPT
   */
  async getDateAnswer(questionText) {
    let answer = this.formUtils.getSavedAnswer("date", questionText);
    if (!answer) {
      const prompt = `${questionText} (Please provide a date. Common formats: YYYY-MM-DD, MM/DD/YYYY, or just month/year like "January 2024")`;
      answer = await this.gptAnswerer.answerTextual(prompt);
    }
    if (answer) {
      this.formUtils.rememberAnswer("date", questionText, answer);
    }
    return answer;
  }
  /**
   * Parse date answer into components
   */
  parseDateAnswer(answer) {
    const result = {};
    const isoMatch = answer.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      result.year = parseInt(isoMatch[1]);
      result.month = parseInt(isoMatch[2]);
      result.day = parseInt(isoMatch[3]);
      return result;
    }
    const usMatch = answer.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (usMatch) {
      result.month = parseInt(usMatch[1]);
      result.day = parseInt(usMatch[2]);
      result.year = parseInt(usMatch[3]);
      return result;
    }
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december"
    ];
    const lower = answer.toLowerCase();
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) {
        result.month = i + 1;
        break;
      }
    }
    const yearMatch = answer.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[0]);
    }
    return result;
  }
  /**
   * Format date for HTML5 date input (YYYY-MM-DD)
   */
  formatDateForInput(answer) {
    const parsed = this.parseDateAnswer(answer);
    if (!parsed.year) return null;
    const year = parsed.year;
    const month = (parsed.month || 1).toString().padStart(2, "0");
    const day = (parsed.day || 1).toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
export {
  DateHandler
};
//# sourceMappingURL=date-handler.js.map
