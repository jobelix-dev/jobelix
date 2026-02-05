/**
 * Smart Field Matcher - Language-independent field detection and value matching
 * 
 * Consolidates duplicate smart matching logic from handlers.
 * Uses HTML element attributes (IDs, names, data-* attributes) to detect field types
 * and extract appropriate values from the resume.
 * 
 * This matches the Python smart_text_match() logic in playwright_form_utils.py
 */

import type { Locator } from 'playwright-core';
import type { Resume, PersonalInformation, Education } from '../../../types';
import { createLogger } from '../../../utils/logger';

const log = createLogger('SmartFieldMatcher');

/** Result of a smart field match */
export interface FieldMatchResult {
  /** Field type that was detected */
  fieldType: string;
  /** Value to use for the field */
  value: string;
  /** How the match was made (for logging) */
  matchedBy: 'element-id' | 'question-text' | 'option-match';
}

/**
 * Smart field matcher that uses HTML structure instead of keyword detection
 */
export class SmartFieldMatcher {
  private personalInfo: PersonalInformation | undefined;
  private educationDetails: Education[] | undefined;

  constructor(resume?: Resume) {
    this.personalInfo = resume?.personalInformation;
    this.educationDetails = resume?.educationDetails;
  }

  /**
   * Update resume data (e.g., when a new resume is loaded)
   */
  updateResume(resume: Resume): void {
    this.personalInfo = resume.personalInformation;
    this.educationDetails = resume.educationDetails;
  }

  /**
   * Match a text/typeahead field by examining HTML element attributes
   * 
   * Detects:
   * - Location/City fields (geo-location pattern in ID)
   * - Phone number fields (phonenumber-nationalnumber pattern)
   * - Email fields
   * - Name fields
   */
  async matchByElementId(input: Locator): Promise<FieldMatchResult | null> {
    if (!this.personalInfo) {
      log.debug('[SMART MATCH] No personal info available');
      return null;
    }

    try {
      if (await input.count() === 0) return null;

      const elementId = (await input.getAttribute('id') || '').toLowerCase();
      const elementName = (await input.getAttribute('name') || '').toLowerCase();
      
      log.debug(`[SMART MATCH] Element ID: ${elementId}, Name: ${elementName}`);

      // Location/City detection
      // Pattern: id contains "geo-location" or "location-geo"
      if (elementId.includes('geo-location') || elementId.includes('location-geo') ||
          elementName.includes('location')) {
        const city = this.personalInfo.city;
        if (city) {
          log.info(`[SMART MATCH] ✅ City field detected: ${city}`);
          return { fieldType: 'city', value: city, matchedBy: 'element-id' };
        }
      }

      // Phone number detection
      // LinkedIn uses different patterns:
      // - "phonenumber-nationalnumber" or "phone-national" = national number only (prefix in dropdown)
      // - Other "phone" patterns = full phone number with prefix
      if (elementId.includes('phonenumber-nationalnumber') || 
          elementId.includes('phone-national')) {
        // This is the national number input (prefix is in a separate dropdown)
        const phoneNational = this.getPhoneNational();
        if (phoneNational) {
          log.info(`[SMART MATCH] ✅ Phone national field detected: ${phoneNational}`);
          return { fieldType: 'phone-national', value: phoneNational, matchedBy: 'element-id' };
        }
      } else if (elementName.includes('phone')) {
        // Generic phone field - use full formatted number
        const phone = this.formatPhone();
        if (phone) {
          log.info(`[SMART MATCH] ✅ Phone field detected: ${phone}`);
          return { fieldType: 'phone', value: phone, matchedBy: 'element-id' };
        }
      }

      // Email detection
      if (elementId.includes('email') || elementName.includes('email')) {
        const email = this.personalInfo.email;
        if (email) {
          log.info(`[SMART MATCH] ✅ Email field detected: ${email}`);
          return { fieldType: 'email', value: email, matchedBy: 'element-id' };
        }
      }

      return null;
    } catch (error) {
      log.debug(`[SMART MATCH] Error: ${error}`);
      return null;
    }
  }

  /**
   * Match a field by analyzing the question text
   * 
   * Fallback when HTML structure doesn't help.
   * Detects URLs, phone numbers, city, etc. by keywords.
   */
  matchByQuestionText(questionText: string): FieldMatchResult | null {
    if (!this.personalInfo) return null;

    const questionLower = questionText.toLowerCase();

    // Website/URL detection
    if (this.isUrlField(questionLower)) {
      const url = this.getUrlForQuestion(questionLower);
      if (url) {
        return { fieldType: 'url', value: url, matchedBy: 'question-text' };
      }
    }

    // Phone number by question text
    if (questionLower.includes('phone') && !questionLower.includes('prefix')) {
      const phone = this.formatPhone();
      if (phone) {
        log.info(`[SMART MATCH] ✅ Phone (by question): ${phone}`);
        return { fieldType: 'phone', value: phone, matchedBy: 'question-text' };
      }
    }

    // City by question text
    if (questionLower.includes('city') || questionLower.includes('location')) {
      const city = this.personalInfo.city;
      if (city) {
        log.info(`[SMART MATCH] ✅ City (by question): ${city}`);
        return { fieldType: 'city', value: city, matchedBy: 'question-text' };
      }
    }

    return null;
  }

  /**
   * Match a school/university from dropdown options
   * 
   * Uses resume education data to find matching institution
   */
  matchSchool(options: string[]): string | null {
    if (!this.educationDetails || this.educationDetails.length === 0) {
      return null;
    }

    log.debug('[SMART MATCH] Attempting school match');

    // Alternative names mapping for common schools
    const alternativeNames: Record<string, string[]> = {
      'université psl': ['Paris Sciences et Lettres', 'PSL University', 'PSL Research University'],
      'psl': ['Paris Sciences et Lettres', 'PSL University'],
      'institut polytechnique de paris': ['IP Paris', 'Polytechnique Paris'],
      'telecom sudparis': ['Télécom SudParis', 'Telecom SudParis', 'TSP'],
      'telecom paris': ['Télécom Paris', 'ENST'],
      'ecole polytechnique': ['Polytechnique', 'X'],
      'hec paris': ['HEC', 'HEC School of Management'],
      'sciences po': ['Sciences Po Paris', 'Institut d\'Études Politiques'],
      'ens': ['École Normale Supérieure', 'ENS Paris', 'Normale Sup'],
      'centrale': ['CentraleSupélec', 'École Centrale'],
      'mines': ['MINES ParisTech', 'École des Mines'],
      'sainte-geneviève': ['Ginette', 'Sainte Geneviève'],
    };

    for (const edu of this.educationDetails) {
      const institution = edu.university;
      if (!institution) continue;

      const instLower = institution.toLowerCase();
      log.debug(`[SMART MATCH] Checking: "${institution}"`);

      // Try exact match
      const exactMatch = options.find(o => o.toLowerCase() === instLower);
      if (exactMatch) {
        log.info(`[SMART MATCH] ✅ Exact school match: "${exactMatch}"`);
        return exactMatch;
      }

      // Try alternative names
      for (const [key, alts] of Object.entries(alternativeNames)) {
        if (instLower.includes(key)) {
          for (const alt of alts) {
            const altMatch = options.find(o =>
              o.toLowerCase().includes(alt.toLowerCase()) ||
              alt.toLowerCase().includes(o.toLowerCase())
            );
            if (altMatch) {
              log.info(`[SMART MATCH] ✅ Alternative name match: "${altMatch}"`);
              return altMatch;
            }
          }
        }
      }

      // Try partial match
      const partialMatch = options.find(o =>
        o.toLowerCase().includes(instLower) ||
        instLower.includes(o.toLowerCase())
      );
      if (partialMatch) {
        log.info(`[SMART MATCH] ✅ Partial school match: "${partialMatch}"`);
        return partialMatch;
      }

      // Try significant word matching (>4 chars, excluding common words)
      const skipWords = ['university', 'institut', 'école', 'ecole', 'paris', 'france', 'college'];
      const institutionWords = instLower.split(/[\s\-()]+/).filter(w => 
        w.length > 4 && !skipWords.includes(w)
      );
      
      for (const word of institutionWords) {
        const wordMatch = options.find(o => o.toLowerCase().includes(word));
        if (wordMatch) {
          log.info(`[SMART MATCH] ✅ Word-based school match: "${wordMatch}" (word: "${word}")`);
          return wordMatch;
        }
      }
    }

    log.warn('[SMART MATCH] No school match found');
    return null;
  }

  /**
   * Match phone prefix from dropdown options
   */
  matchPhonePrefix(options: string[]): string | null {
    const phonePrefix = this.personalInfo?.phonePrefix;
    
    // Try exact prefix match
    if (phonePrefix) {
      const match = options.find(o => o.includes(phonePrefix));
      if (match) {
        log.info(`[SMART MATCH] ✅ Phone prefix match: "${match}"`);
        return match;
      }
    }

    // Fallback to common prefixes
    const commonPrefixes = ['+1', '+44', '+33', '+49', '+39', '+34'];
    for (const prefix of commonPrefixes) {
      const match = options.find(o => o.includes(prefix));
      if (match) {
        log.debug(`[SMART MATCH] Using common prefix: "${match}"`);
        return match;
      }
    }

    return null;
  }

  /**
   * Check if a question is asking for a URL field
   */
  private isUrlField(questionLower: string): boolean {
    return (
      questionLower.includes('website') ||
      questionLower.includes('url') ||
      questionLower.includes('portfolio') ||
      questionLower.includes('personal site') ||
      questionLower.includes('github') ||
      questionLower.includes('linkedin')
    );
  }

  /**
   * Get appropriate URL based on question context
   */
  private getUrlForQuestion(questionLower: string): string | null {
    if (!this.personalInfo) return null;

    // Specific platform requested
    if (questionLower.includes('github') && this.personalInfo.github) {
      log.info(`[SMART MATCH] ✅ GitHub URL: ${this.personalInfo.github}`);
      return this.personalInfo.github;
    }

    if (questionLower.includes('linkedin') && this.personalInfo.linkedin) {
      log.info(`[SMART MATCH] ✅ LinkedIn URL: ${this.personalInfo.linkedin}`);
      return this.personalInfo.linkedin;
    }

    // Generic website - try github first (common for dev jobs)
    if (this.personalInfo.github) {
      log.info(`[SMART MATCH] ✅ Website (GitHub): ${this.personalInfo.github}`);
      return this.personalInfo.github;
    }

    if (this.personalInfo.linkedin) {
      log.info(`[SMART MATCH] ✅ Website (LinkedIn): ${this.personalInfo.linkedin}`);
      return this.personalInfo.linkedin;
    }

    return null;
  }

  /**
   * Format phone number for form fields
   * 
   * LinkedIn has two types of phone fields:
   * 1. Single field for full phone (uses formatPhoneFull)
   * 2. Split fields: prefix dropdown + national number input (uses phoneNational)
   * 
   * This method returns the full formatted phone number with prefix.
   */
  private formatPhone(): string | null {
    if (!this.personalInfo?.phone) return null;
    
    const { phonePrefix, phoneNational } = this.personalInfo;
    
    // If we have both prefix and national, combine them
    if (phonePrefix && phoneNational) {
      return `${phonePrefix} ${phoneNational}`;
    }
    
    // Fallback to original phone (already formatted or no parsing happened)
    return this.personalInfo.phone;
  }
  
  /**
   * Get just the national phone number (without prefix)
   * Used when LinkedIn has separate prefix dropdown + number input
   */
  getPhoneNational(): string | null {
    return this.personalInfo?.phoneNational || null;
  }
  
  /**
   * Get just the phone prefix
   * Used for prefix dropdown selection
   */
  getPhonePrefix(): string | null {
    return this.personalInfo?.phonePrefix || null;
  }
}
