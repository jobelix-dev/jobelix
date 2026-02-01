/**
 * Document Type Detector - Detects whether a file upload field is for resume or cover letter
 * 
 * Uses HTML attributes and URN patterns for reliable detection, with keyword fallback.
 */

import type { Locator } from 'playwright-core';
import { createLogger } from '../../../utils/logger';

const log = createLogger('DocumentTypeDetector');

/** Document type detection result */
export interface DocumentTypeResult {
  isResumeUpload: boolean;
  isCoverLetterUpload: boolean;
  detectedBy: 'urn-pattern' | 'attribute' | 'question-text' | 'default';
}

/** Cover letter keywords (multi-language) for HTML attribute detection */
const COVER_LETTER_ID_KEYWORDS = [
  'cover', 'coverletter', 'cover-letter',  // English
  'lettre', 'motivation',                  // French (lettre de motivation)
  'anschreiben', 'bewerbung',              // German
  'carta', 'presentacion',                 // Spanish (carta de presentación)
  'lettera', 'presentazione',              // Italian (lettera di presentazione)
  'carta-apresentacao'                     // Portuguese
];

/** Cover letter keywords for question text detection */
const COVER_LETTER_TEXT_KEYWORDS = [
  'cover letter', 'coverletter',                   // English
  'lettre de motivation', 'lettre motivation',     // French
  'anschreiben', 'motivationsschreiben',           // German
  'carta de presentación', 'carta presentación',   // Spanish
  'lettera di presentazione',                      // Italian
  'carta de apresentação'                          // Portuguese
];

/** Resume keywords for question text detection */
const RESUME_TEXT_KEYWORDS = [
  'resume', 'cv', 'lebenslauf', 'curriculum'
];

/**
 * Detect document type from file input element
 */
export async function detectDocumentType(
  fileInput: Locator,
  questionText: string
): Promise<DocumentTypeResult> {
  const result: DocumentTypeResult = {
    isResumeUpload: true,
    isCoverLetterUpload: false,
    detectedBy: 'default'
  };

  try {
    if (await fileInput.count() > 0) {
      // Try URN pattern first (most reliable)
      const urnResult = await detectByUrnPattern(fileInput);
      if (urnResult) return urnResult;

      // Try HTML attribute keywords
      const attrResult = await detectByAttributes(fileInput);
      if (attrResult) return attrResult;
    }
  } catch {
    // Fall through to question text detection
  }

  // Try question text as secondary signal
  const textResult = detectByQuestionText(questionText);
  if (textResult) return textResult;

  return result;
}

/**
 * Detect document type from URN pattern in input ID
 * 
 * LinkedIn IDs follow: jobs-document-upload-file-input-upload-{type}-urn:li:...
 * Example: upload-resume-urn:li:... → RESUME
 * Example: upload-cover-letter-urn:li:... → COVER LETTER
 * 
 * IMPORTANT: When there's NO "upload-{type}" pattern, it's typically an
 * additional/optional document field (cover letter, portfolio, etc.)
 * Example: jobs-document-upload-file-input-urn:li:... → NOT resume (no upload-resume)
 */
async function detectByUrnPattern(fileInput: Locator): Promise<DocumentTypeResult | null> {
  try {
    const inputId = ((await fileInput.getAttribute('id')) || '').toLowerCase();
    log.debug(`File input id: "${inputId}"`);
    
    // Check for explicit upload-{type}-urn pattern
    const idMatch = inputId.match(/upload-([a-z-]+)-urn/);
    
    if (idMatch) {
      const docType = idMatch[1];
      log.debug(`Detected document type from URN: "${docType}"`);

      if (docType.includes('cover') || docType.includes('letter')) {
        return { isResumeUpload: false, isCoverLetterUpload: true, detectedBy: 'urn-pattern' };
      }
      
      if (docType.includes('resume') || docType.includes('cv')) {
        return { isResumeUpload: true, isCoverLetterUpload: false, detectedBy: 'urn-pattern' };
      }
    }
    
    // CRITICAL: If the ID contains "jobs-document-upload-file-input-urn" but NOT "upload-resume",
    // this is likely a secondary document field (cover letter, portfolio, etc.)
    // Resume fields ALWAYS have "upload-resume" in the ID!
    if (inputId.includes('jobs-document-upload-file-input-urn') && !inputId.includes('upload-resume')) {
      log.debug('No "upload-resume" in ID - treating as cover letter/additional document');
      return { isResumeUpload: false, isCoverLetterUpload: true, detectedBy: 'urn-pattern' };
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Detect document type from HTML attributes (id, name, aria-label)
 */
async function detectByAttributes(fileInput: Locator): Promise<DocumentTypeResult | null> {
  try {
    const inputId = ((await fileInput.getAttribute('id')) || '').toLowerCase();
    const inputName = ((await fileInput.getAttribute('name')) || '').toLowerCase();
    const ariaLabel = ((await fileInput.getAttribute('aria-label')) || '').toLowerCase();

    log.debug(`File input - id: "${inputId}", name: "${inputName}", aria-label: "${ariaLabel}"`);

    const combined = `${inputId} ${inputName} ${ariaLabel}`;
    
    if (COVER_LETTER_ID_KEYWORDS.some(k => combined.includes(k))) {
      return { isResumeUpload: false, isCoverLetterUpload: true, detectedBy: 'attribute' };
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Detect document type from question text
 */
function detectByQuestionText(questionText: string): DocumentTypeResult | null {
  const lowerQuestion = questionText.toLowerCase();

  if (COVER_LETTER_TEXT_KEYWORDS.some(k => lowerQuestion.includes(k))) {
    return { isResumeUpload: false, isCoverLetterUpload: true, detectedBy: 'question-text' };
  }

  if (RESUME_TEXT_KEYWORDS.some(k => lowerQuestion.includes(k))) {
    return { isResumeUpload: true, isCoverLetterUpload: false, detectedBy: 'question-text' };
  }

  return null;
}
