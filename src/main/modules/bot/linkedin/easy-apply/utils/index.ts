/**
 * Easy Apply Utilities - Shared utilities for LinkedIn Easy Apply
 */

export { SmartFieldMatcher, type FieldMatchResult } from './smart-field-matcher';
export { detectDocumentType, type DocumentTypeResult } from './document-type-detector';
export { 
  generateCoverLetterPdf, 
  cleanupGeneratedCoverLetter,
  getGeneratedCoverLetterPath 
} from './cover-letter-generator';
