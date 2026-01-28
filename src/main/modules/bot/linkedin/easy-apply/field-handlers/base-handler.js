class BaseFieldHandler {
  /**
   * Create a new field handler
   * 
   * @param page - Playwright Page instance for DOM interactions
   * @param gptAnswerer - AI service for generating form responses
   * @param formUtils - Shared utilities for form processing
   */
  constructor(page, gptAnswerer, formUtils) {
    this.page = page;
    this.gptAnswerer = gptAnswerer;
    this.formUtils = formUtils;
  }
  /**
   * Extract question text from a form element
   * 
   * Searches for labels, legends, aria-labels, etc.
   * This is the text that gets sent to GPT for context.
   * 
   * @param element - The form element to search
   * @returns The question text, or a default value
   */
  async extractQuestionText(element) {
    try {
      const legend = element.locator("legend").first();
      if (await legend.count() > 0) {
        const text = await legend.textContent();
        if (text?.trim()) return text.trim();
      }
    } catch {
    }
    try {
      const label = element.locator("label").first();
      if (await label.count() > 0) {
        const text = await label.textContent();
        if (text?.trim()) return text.trim();
      }
    } catch {
    }
    try {
      const title = element.locator("[data-test-form-builder-radio-button-form-component__title]").first();
      if (await title.count() > 0) {
        const text = await title.textContent();
        if (text?.trim()) return text.trim();
      }
    } catch {
    }
    try {
      const ariaLabel = await element.getAttribute("aria-label");
      if (ariaLabel?.trim()) return ariaLabel.trim();
    } catch {
    }
    try {
      const input = element.locator("input, select, textarea").first();
      if (await input.count() > 0) {
        const name = await input.getAttribute("name");
        if (name) return name;
      }
    } catch {
    }
    return "unknown_question";
  }
  /**
   * Normalize text for comparison (case-insensitive, accent-insensitive)
   * 
   * This helps match user answers to options when there are minor differences
   * in capitalization, accents, or whitespace.
   */
  normalizeText(text) {
    return this.formUtils.normalizeText(text);
  }
}
export {
  BaseFieldHandler
};
//# sourceMappingURL=base-handler.js.map
