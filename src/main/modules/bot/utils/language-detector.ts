/**
 * Language Detection Utility
 * 
 * Uses franc-min for lightweight language detection of job descriptions.
 * Detects ISO 639-3 codes and converts to ISO 639-1 for matching.
 */

import { francAll } from 'franc-min';
import { createLogger } from './logger';

const log = createLogger('LanguageDetector');

/**
 * Mapping from ISO 639-3 (franc output) to ISO 639-1 (our config)
 * Only includes languages we support
 */
const ISO_639_3_TO_1: Record<string, string> = {
  eng: 'en',  // English
  fra: 'fr',  // French
  deu: 'de',  // German
  spa: 'es',  // Spanish
  ita: 'it',  // Italian
  por: 'pt',  // Portuguese
  nld: 'nl',  // Dutch
  pol: 'pl',  // Polish
  swe: 'sv',  // Swedish
  dan: 'da',  // Danish
  nor: 'no',  // Norwegian
  nob: 'no',  // Norwegian Bokmal
  nno: 'no',  // Norwegian Nynorsk
  fin: 'fi',  // Finnish
};

/**
 * Minimum text length for reliable detection
 */
const MIN_TEXT_LENGTH = 100;

/**
 * Minimum confidence score to trust the detection
 * Lower values are riskier (may skip valid jobs)
 */
const MIN_CONFIDENCE = 0.8;

export interface LanguageDetectionResult {
  /** ISO 639-1 language code, or null if detection failed */
  code: string | null;
  /** Raw ISO 639-3 code from franc */
  rawCode: string | null;
  /** Confidence score (0-1), higher is better */
  confidence: number;
  /** Reason for failure if code is null */
  reason?: 'text_too_short' | 'unknown_language' | 'low_confidence' | 'detection_failed';
}

/**
 * Detect the language of a text string.
 * 
 * @param text - The text to analyze (ideally job description)
 * @returns Detection result with ISO 639-1 code and confidence
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.length < MIN_TEXT_LENGTH) {
    return {
      code: null,
      rawCode: null,
      confidence: 0,
      reason: 'text_too_short',
    };
  }

  try {
    // Get all language predictions with scores
    const results = francAll(text);
    
    if (results.length === 0) {
      return {
        code: null,
        rawCode: null,
        confidence: 0,
        reason: 'detection_failed',
      };
    }

    const [topResult] = results;
    const [rawCode, score] = topResult;

    // franc returns 'und' for undetermined
    if (rawCode === 'und') {
      return {
        code: null,
        rawCode: 'und',
        confidence: 0,
        reason: 'detection_failed',
      };
    }

    // Convert score to confidence (franc scores are between 0 and 1)
    const confidence = score;

    // Convert to ISO 639-1
    const iso1Code = ISO_639_3_TO_1[rawCode] || null;

    if (!iso1Code) {
      log.debug(`Unknown language code: ${rawCode} (not in our supported list)`);
      return {
        code: null,
        rawCode,
        confidence,
        reason: 'unknown_language',
      };
    }

    if (confidence < MIN_CONFIDENCE) {
      log.debug(`Low confidence for ${rawCode}: ${confidence.toFixed(2)}`);
      return {
        code: iso1Code,
        rawCode,
        confidence,
        reason: 'low_confidence',
      };
    }

    return {
      code: iso1Code,
      rawCode,
      confidence,
    };
  } catch (error) {
    log.error(`Language detection error: ${error}`);
    return {
      code: null,
      rawCode: null,
      confidence: 0,
      reason: 'detection_failed',
    };
  }
}

/**
 * Check if a detected language is in the list of accepted languages.
 * 
 * @param detectedLang - ISO 639-1 code from detectLanguage, or null
 * @param acceptedLanguages - Array of ISO 639-1 codes the user accepts
 * @returns true if the job should be processed, false if it should be skipped
 */
export function isLanguageAccepted(
  detectedLang: string | null,
  acceptedLanguages: string[]
): boolean {
  // If we couldn't detect the language, be permissive and allow it
  // This avoids false negatives on jobs with short descriptions
  if (detectedLang === null) {
    return true;
  }

  // If no languages configured, default to English only
  const languages = acceptedLanguages.length > 0 ? acceptedLanguages : ['en'];

  return languages.includes(detectedLang);
}

/**
 * Get the human-readable name for a language code
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    pl: 'Polish',
    sv: 'Swedish',
    da: 'Danish',
    no: 'Norwegian',
    fi: 'Finnish',
  };
  return names[code] || code.toUpperCase();
}
