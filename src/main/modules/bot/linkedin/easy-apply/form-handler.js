import { createLogger } from "../../utils/logger.js";
import { FormUtils } from "./form-utils.js";
import {
  TextInputHandler,
  TextareaHandler,
  RadioButtonHandler,
  DropdownHandler,
  CheckboxHandler,
  TypeaheadHandler,
  DateHandler,
  FileUploadHandler
} from "./field-handlers/index.js";
const log = createLogger("FormHandler");
class FormHandler {
  /**
   * Create a new form handler
   * 
   * @param page - Playwright page instance
   * @param gptAnswerer - GPT answerer for generating responses
   * @param savedAnswers - Previously saved Q&A pairs for reuse
   * @param recordCallback - Callback to persist new answers
   * @param resumePath - Optional path to resume file
   * @param coverLetterPath - Optional path to cover letter file
   */
  constructor(page, gptAnswerer, savedAnswers = [], recordCallback, resumePath, coverLetterPath) {
    this.page = page;
    this.gptAnswerer = gptAnswerer;
    this.formUtils = new FormUtils(page, savedAnswers, recordCallback);
    this.fileUploadHandler = new FileUploadHandler(
      page,
      gptAnswerer,
      this.formUtils,
      resumePath || null,
      coverLetterPath || null
    );
    this.handlers = [
      this.fileUploadHandler,
      // File uploads first (most specific)
      new RadioButtonHandler(page, gptAnswerer, this.formUtils),
      // Radio buttons
      new DropdownHandler(page, gptAnswerer, this.formUtils),
      // Dropdowns/selects
      new CheckboxHandler(page, gptAnswerer, this.formUtils),
      // Checkboxes
      new TypeaheadHandler(page, gptAnswerer, this.formUtils),
      // Autocomplete fields
      new DateHandler(page, gptAnswerer, this.formUtils),
      // Date fields
      new TextareaHandler(page, gptAnswerer, this.formUtils),
      // Textareas
      new TextInputHandler(page, gptAnswerer, this.formUtils)
      // Text inputs (most generic)
    ];
  }
  /**
   * Fill all form fields on the current Easy Apply page
   * 
   * This method:
   * 1. Finds all form groups/sections
   * 2. For each, determines the appropriate handler
   * 3. Fills the field using that handler
   * 4. Tracks success/failure
   */
  async fillCurrentPage() {
    const result = {
      success: true,
      fieldsProcessed: 0,
      fieldsFailed: 0,
      errors: []
    };
    try {
      await this.page.waitForTimeout(500);
      const formSections = await this.findFormSections();
      log.info(`Found ${formSections.length} form section(s) on this page`);
      for (const section of formSections) {
        try {
          if (!await section.isVisible()) {
            continue;
          }
          const handler = await this.findHandler(section);
          if (handler) {
            const success = await handler.handle(section);
            result.fieldsProcessed++;
            if (!success) {
              result.fieldsFailed++;
              log.warn("Failed to handle a form field");
            }
          } else {
            log.debug("No handler found for section (might be non-input)");
          }
        } catch (error) {
          result.fieldsProcessed++;
          result.fieldsFailed++;
          result.errors.push(String(error));
          log.error(`Error processing section: ${error}`);
        }
      }
      result.success = result.fieldsFailed < result.fieldsProcessed / 2;
      log.info(`Page complete: ${result.fieldsProcessed - result.fieldsFailed}/${result.fieldsProcessed} fields filled`);
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      log.error(`Error filling page: ${error}`);
    }
    return result;
  }
  /**
   * Find all form sections on the current page
   * 
   * LinkedIn Easy Apply uses .jobs-easy-apply-form-section__grouping
   * for each form field grouping.
   */
  async findFormSections() {
    const sectionSelectors = [
      ".jobs-easy-apply-form-section__grouping",
      ".fb-dash-form-element",
      "[data-test-form-element]",
      ".jobs-document-upload"
      // Resume upload sections
    ];
    const sections = [];
    const seenElements = /* @__PURE__ */ new Set();
    for (const selector of sectionSelectors) {
      const elements = await this.page.locator(selector).all();
      for (const element of elements) {
        try {
          const box = await element.boundingBox();
          if (box) {
            const id = `${box.x}-${box.y}-${box.width}-${box.height}`;
            if (!seenElements.has(id)) {
              seenElements.add(id);
              sections.push(element);
            }
          }
        } catch {
        }
      }
    }
    return sections;
  }
  /**
   * Find the appropriate handler for a form section
   * 
   * Uses the strategy pattern - tries each handler in order
   * until one reports it can handle this element type.
   */
  async findHandler(element) {
    for (const handler of this.handlers) {
      try {
        const canHandle = await handler.canHandle(element);
        if (canHandle) {
          return handler;
        }
      } catch {
      }
    }
    return null;
  }
  /**
   * Update resume path for file uploads
   */
  setResumePath(path) {
    this.fileUploadHandler.setResumePath(path);
  }
  /**
   * Update cover letter path for file uploads
   */
  setCoverLetterPath(path) {
    this.fileUploadHandler.setCoverLetterPath(path);
  }
}
export {
  FormHandler
};
//# sourceMappingURL=form-handler.js.map
