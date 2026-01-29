/**
 * LinkedIn Easy Apply - Main Entry Point
 * 
 * This module handles the entire Easy Apply flow:
 * - Opening the Easy Apply modal
 * - Filling multi-page application forms
 * - Navigating between pages
 * - Handling various field types (text, radio, dropdown, etc.)
 * - Uploading resumes and documents
 * - Submitting applications
 * 
 * Main Components:
 * - EasyApplier: Top-level coordinator
 * - FormHandler: Orchestrates field handlers
 * - NavigationHandler: Controls modal navigation
 * - Field Handlers: Strategy pattern for each field type
 */

// Main coordinator
export { EasyApplier, LinkedInEasyApplier } from './easy-applier';
export type { EasyApplyResult, EasyApplierConfig } from './easy-applier';

// Form handling
export { FormHandler } from './form-handler';
export type { FormPageResult, AnswerRecordCallback } from './form-handler';

// Navigation
export { NavigationHandler } from './navigation';
export type { ModalState, PrimaryButtonResult } from './navigation';

// Utilities
export { FormUtils, normalizeText } from './form-utils';

// Field handlers (for advanced customization)
export {
  BaseFieldHandler,
  TextInputHandler,
  TextareaHandler,
  RadioButtonHandler,
  DropdownHandler,
  CheckboxHandler,
  TypeaheadHandler,
  DateHandler,
  FileUploadHandler,
} from './field-handlers';
