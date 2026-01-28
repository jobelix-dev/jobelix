/**
 * Form Handler - Orchestrates field handlers to fill LinkedIn Easy Apply forms
 * 
 * This is the main coordinator that:
 * 1. Finds all form fields on the current page
 * 2. Determines the appropriate handler for each field
 * 3. Fills fields in order using the strategy pattern
 * 4. Handles errors and retries
 */

import type { Page, Locator } from 'playwright';
import type { SavedAnswer } from '../../types';
import { createLogger } from '../../utils/logger';
import { FormUtils } from './form-utils';
import { 
  BaseFieldHandler,
  TextInputHandler,
  TextareaHandler,
  RadioButtonHandler,
  DropdownHandler,
  CheckboxHandler,
  TypeaheadHandler,
  DateHandler,
  FileUploadHandler
} from './field-handlers';

const log = createLogger('FormHandler');

/**
 * Result of handling a single form page
 */
export interface FormPageResult {
  success: boolean;
  fieldsProcessed: number;
  fieldsFailed: number;
  errors: string[];
}

/**
 * Callback for recording answered questions
 */
export type AnswerRecordCallback = (type: string, question: string, answer: string) => void;

export class FormHandler {
  private page: Page;
  private gptAnswerer: any;
  private formUtils: FormUtils;
  private handlers: BaseFieldHandler[];
  private fileUploadHandler: FileUploadHandler;

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
  constructor(
    page: Page, 
    gptAnswerer: any,
    savedAnswers: SavedAnswer[] = [],
    recordCallback?: AnswerRecordCallback,
    resumePath?: string,
    coverLetterPath?: string
  ) {
    this.page = page;
    this.gptAnswerer = gptAnswerer;
    this.formUtils = new FormUtils(page, savedAnswers, recordCallback);

    // Create file upload handler separately (needs file paths)
    this.fileUploadHandler = new FileUploadHandler(
      page, 
      gptAnswerer, 
      this.formUtils,
      resumePath || null,
      coverLetterPath || null
    );

    // Initialize handlers in priority order
    // More specific handlers should come before generic ones
    this.handlers = [
      this.fileUploadHandler,                                    // File uploads first (most specific)
      new RadioButtonHandler(page, gptAnswerer, this.formUtils), // Radio buttons
      new DropdownHandler(page, gptAnswerer, this.formUtils),    // Dropdowns/selects
      new CheckboxHandler(page, gptAnswerer, this.formUtils),    // Checkboxes
      new TypeaheadHandler(page, gptAnswerer, this.formUtils),   // Autocomplete fields
      new DateHandler(page, gptAnswerer, this.formUtils),        // Date fields
      new TextareaHandler(page, gptAnswerer, this.formUtils),    // Textareas
      new TextInputHandler(page, gptAnswerer, this.formUtils),   // Text inputs (most generic)
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
  async fillCurrentPage(): Promise<FormPageResult> {
    const result: FormPageResult = {
      success: true,
      fieldsProcessed: 0,
      fieldsFailed: 0,
      errors: [],
    };

    try {
      // Wait for form to be ready
      await this.page.waitForTimeout(500);

      // Find all form field sections
      const formSections = await this.findFormSections();
      log.info(`Found ${formSections.length} form section(s) on this page`);

      // Process each section
      for (const section of formSections) {
        try {
          // Check if section is visible
          if (!(await section.isVisible())) {
            continue;
          }

          // Find appropriate handler
          const handler = await this.findHandler(section);
          
          if (handler) {
            const success = await handler.handle(section);
            result.fieldsProcessed++;
            
            if (!success) {
              result.fieldsFailed++;
              log.warn('Failed to handle a form field');
            }
          } else {
            // No handler found - might be a label-only section
            log.debug('No handler found for section (might be non-input)');
          }
        } catch (error) {
          result.fieldsProcessed++;
          result.fieldsFailed++;
          result.errors.push(String(error));
          log.error(`Error processing section: ${error}`);
        }
      }

      // Overall success if majority of fields worked
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
  private async findFormSections(): Promise<Locator[]> {
    // LinkedIn form section selectors
    const sectionSelectors = [
      '.jobs-easy-apply-form-section__grouping',
      '.fb-dash-form-element',
      '[data-test-form-element]',
      '.jobs-document-upload',  // Resume upload sections
    ];

    const sections: Locator[] = [];
    const seenElements = new Set<string>();

    for (const selector of sectionSelectors) {
      const elements = await this.page.locator(selector).all();
      
      for (const element of elements) {
        // Avoid duplicates by checking unique identifier
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
          // Element might not be visible
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
  private async findHandler(element: Locator): Promise<BaseFieldHandler | null> {
    for (const handler of this.handlers) {
      try {
        const canHandle = await handler.canHandle(element);
        if (canHandle) {
          return handler;
        }
      } catch {
        // Handler check failed, try next
      }
    }
    return null;
  }

  /**
   * Update resume path for file uploads
   */
  setResumePath(path: string): void {
    this.fileUploadHandler.setResumePath(path);
  }

  /**
   * Update cover letter path for file uploads
   */
  setCoverLetterPath(path: string): void {
    this.fileUploadHandler.setCoverLetterPath(path);
  }
}
