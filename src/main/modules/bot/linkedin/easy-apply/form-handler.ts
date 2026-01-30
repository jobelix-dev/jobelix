/**
 * Form Handler - Orchestrates field handlers to fill LinkedIn Easy Apply forms
 * 
 * This is the main coordinator that:
 * 1. Finds all form fields on the current page
 * 2. Determines the appropriate handler for each field
 * 3. Fills fields in order using the strategy pattern
 * 4. Handles errors and retries
 */

import type { Page, Locator } from 'playwright-core';
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
  private checkboxHandler: CheckboxHandler;

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
    
    // Create checkbox handler separately (needs retry mode access)
    this.checkboxHandler = new CheckboxHandler(page, gptAnswerer, this.formUtils);

    // Initialize handlers in priority order
    // More specific handlers should come before generic ones
    this.handlers = [
      this.fileUploadHandler,                                    // File uploads first (most specific)
      new RadioButtonHandler(page, gptAnswerer, this.formUtils), // Radio buttons
      new DropdownHandler(page, gptAnswerer, this.formUtils),    // Dropdowns/selects
      this.checkboxHandler,                                      // Checkboxes
      new TypeaheadHandler(page, gptAnswerer, this.formUtils),   // Autocomplete fields
      new DateHandler(page, gptAnswerer, this.formUtils),        // Date fields
      new TextareaHandler(page, gptAnswerer, this.formUtils),    // Textareas
      new TextInputHandler(page, gptAnswerer, this.formUtils),   // Text inputs (most generic)
    ];
  }
  
  /**
   * Set retry mode for handlers that support it
   * When true, checkbox handler will force-check all unchecked checkboxes
   */
  setRetryMode(isRetry: boolean): void {
    this.checkboxHandler.setRetryMode(isRetry);
  }

  /**
   * Fill all form fields on the current Easy Apply page
   * 
   * MATCHES PYTHON _answer_visible_form:
   * Uses multi-pass approach with scrolling to handle virtualized lists.
   * 
   * This method:
   * 1. Finds all form groups/sections
   * 2. For each, determines the appropriate handler
   * 3. Fills the field using that handler
   * 4. Scrolls and repeats until no new elements found
   * 5. Tracks success/failure
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
      await this.page.waitForTimeout(250);

      // Track processed elements to avoid re-processing (like Python's processed set)
      const processedKeys = new Set<string>();
      let passIndex = 0;

      // Multi-pass loop (matches Python's while True loop)
      while (true) {
        passIndex++;
        let newlyHandled = 0;

        // Find all form field sections
        const formSections = await this.findFormSections();
        
        if (passIndex === 1) {
          log.info(`Found ${formSections.length} form section(s) on this page`);
        }

        // Process each section
        for (const section of formSections) {
          try {
            // Generate stable key to track processed elements
            const key = await this.formUtils.stableKey(section);
            if (processedKeys.has(key)) {
              continue; // Already processed
            }

            // Check if section is visible
            if (!(await section.isVisible())) {
              continue;
            }

            // Find appropriate handler
            const handler = await this.findHandler(section);
            
            if (handler) {
              const success = await handler.handle(section);
              result.fieldsProcessed++;
              processedKeys.add(key);
              newlyHandled++;
              
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

        // CRITICAL: Pick up bare <input type="file"> blocks (MATCHES PYTHON _answer_visible_form)
        // This handles file upload sections that aren't found by standard selectors
        try {
          const form = this.page.locator('form').first();
          const fileInputs = await form.locator('input[type="file"]').all();
          
          for (const fileInput of fileInputs) {
            try {
              // Find ancestor container (matches Python's xpath ancestor lookup)
              const block = await fileInput.locator('xpath=./ancestor::div[contains(@class,"jobs-document-upload") or contains(@class,"jobs-resume-picker")]').first();
              
              if (await block.count() === 0) {
                continue;
              }
              
              const key = await this.formUtils.stableKey(block);
              if (processedKeys.has(key)) {
                continue;
              }
              
              // Use file upload handler directly
              if (await this.fileUploadHandler.canHandle(block)) {
                log.debug('Processing bare file input block');
                const success = await this.fileUploadHandler.handle(block);
                processedKeys.add(key);
                newlyHandled++;
                result.fieldsProcessed++;
                
                if (!success) {
                  result.fieldsFailed++;
                }
              }
            } catch {
              // Could not process this file input, continue to next
            }
          }
        } catch {
          // No form found or error processing file inputs
        }

        log.debug(`Pass ${passIndex}: handled ${newlyHandled} new elements`);

        // Exit if no new elements were handled (matches Python's if newly_handled == 0: break)
        if (newlyHandled === 0) {
          break;
        }

        // Scroll to load more elements (virtualized lists) - matches Python's form_el.evaluate scroll
        try {
          const form = this.page.locator('form').first();
          await form.evaluate((el) => { 
            if ('scrollTop' in el) {
              (el as { scrollTop: number }).scrollTop += 300;
            }
          });
          await this.page.waitForTimeout(150);
        } catch {
          // Scroll failed - form might not exist or be scrollable
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
    // LinkedIn form section selectors (MATCHES PYTHON approach)
    const sectionSelectors = [
      '.jobs-easy-apply-form-section__grouping',
      '.fb-dash-form-element',
      '[data-test-form-element]',
      '.jobs-document-upload',        // Resume/document upload sections
      '.jobs-resume-picker',          // Resume picker sections (ADDED - matches Python)
      '[data-test-document-upload]',  // Document upload attribute
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
   * Set a pending tailored resume Promise for parallel processing
   * 
   * This allows resume tailoring to run in the background while the
   * Easy Apply modal opens and early form fields are filled.
   * 
   * @param promise - Promise that resolves to tailored resume path
   */
  setPendingTailoredResume(promise: Promise<string | null>): void {
    this.fileUploadHandler.setPendingTailoredResume(promise);
  }

  /**
   * Update cover letter path for file uploads
   */
  setCoverLetterPath(path: string): void {
    this.fileUploadHandler.setCoverLetterPath(path);
  }
}
