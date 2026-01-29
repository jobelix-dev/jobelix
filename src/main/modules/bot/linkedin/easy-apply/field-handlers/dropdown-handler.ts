/**
 * Dropdown Handler - Handles <select> elements in LinkedIn forms
 * 
 * Dropdowns are used for questions like:
 * - "Phone country code" (+1, +44, +33, etc.)
 * - "Years of experience" (0-1, 2-3, 4-5, etc.)
 * - "Education level" (Bachelor's, Master's, etc.)
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { normalizeText } from '../form-utils';

const log = createLogger('DropdownHandler');

export class DropdownHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a select dropdown
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      const count = await element.locator('select').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Handle a dropdown select field
   * 
   * Process flow:
   * 1. Find the select element
   * 2. Extract question text
   * 3. Get all options (skip placeholder)
   * 4. Try saved answer → smart match → GPT
   * 5. Select the matching option
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const select = element.locator('select').first();
      if (await select.count() === 0) return false;

      // Get question text
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Get all options
      const options = await this.extractOptions(select);
      if (options.length === 0) {
        log.warn('No options found for dropdown');
        return false;
      }

      log.debug(`Options: ${options.slice(0, 5).join(', ')}${options.length > 5 ? '...' : ''}`);

      // Try to get answer
      let answer: string | undefined;
      let fromGPT = false;

      // 1. Check saved answers
      answer = this.formUtils.getSavedAnswer('dropdown', questionText);

      // 2. Try smart matching (phone prefix, country, etc.)
      if (!answer) {
        answer = await this.smartMatch(element, questionText, options);
      }

      // 3. Ask GPT (with option truncation for large lists)
      if (!answer) {
        log.debug(`Asking GPT: "${questionText}"`);
        
        // For very large option lists (e.g., thousands of schools), truncate to avoid "message too long"
        const MAX_OPTIONS_FOR_GPT = 100;
        let optionsForGPT = options;
        
        if (options.length > MAX_OPTIONS_FOR_GPT) {
          log.warn(`Large dropdown (${options.length} options) - truncating to ${MAX_OPTIONS_FOR_GPT} for GPT`);
          // Keep first 100 options (they're usually sorted alphabetically)
          optionsForGPT = options.slice(0, MAX_OPTIONS_FOR_GPT);
          
          // If this is a school field and we couldn't match from resume, log a warning
          const questionLower = questionText.toLowerCase();
          if (questionLower.includes('school') || questionLower.includes('university')) {
            log.error(`[SCHOOL] Could not find resume school in ${options.length} options - GPT will only see first ${MAX_OPTIONS_FOR_GPT}`);
          }
        }
        
        answer = await this.gptAnswerer.answerFromOptions(questionText, optionsForGPT);
        fromGPT = true;
      }

      if (!answer?.trim()) {
        log.warn('No answer available for dropdown');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${answer}"`);

      // Select the option
      const selected = await this.selectOption(select, options, answer);
      
      if (!selected) {
        log.warn(`Could not find matching option for: "${answer}"`);
        return false;
      }

      // Save if from smart match or GPT
      if (fromGPT) {
        this.formUtils.rememberAnswer('dropdown', questionText, answer);
      }

      // Check for validation errors
      await this.page.waitForTimeout(500);
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      
      if (errorMsg) {
        log.warn(`Validation error: ${errorMsg}`);
        // Retry with error context
        const retryAnswer = await this.gptAnswerer.answerFromOptionsWithRetry(
          questionText, options, answer, errorMsg
        );
        if (retryAnswer) {
          await this.selectOption(select, options, retryAnswer);
          this.formUtils.rememberAnswer('dropdown', questionText, retryAnswer);
        }
      }

      return true;

    } catch (error) {
      log.error(`Error handling dropdown: ${error}`);
      return false;
    }
  }

  /**
   * Extract options from select element
   * Skips placeholder options (empty value or "Select...")
   */
  private async extractOptions(select: Locator): Promise<string[]> {
    const options: string[] = [];
    const optionElements = await select.locator('option').all();

    for (let i = 0; i < optionElements.length; i++) {
      try {
        const opt = optionElements[i];
        const text = await opt.textContent();
        const value = await opt.getAttribute('value');

        // Skip placeholder options (first with empty value or "Select...")
        if (i === 0 && (!value || text?.toLowerCase().includes('select'))) {
          continue;
        }

        if (text?.trim()) {
          options.push(text.trim());
        }
      } catch {
        // Skip problematic options
      }
    }

    return options;
  }

  /**
   * Smart matching for common dropdown types
   * 
   * Handles special cases where we can infer the answer from context:
   * - Phone prefix → match user's phone number
   * - Country → use resume country
   * - School/University → use resume education
   */
  private async smartMatch(
    element: Locator,
    questionText: string,
    options: string[]
  ): Promise<string | undefined> {
    const questionLower = questionText.toLowerCase();
    const resume = this.gptAnswerer.resume;

    // School/University detection - CRITICAL for large dropdowns
    if (questionLower.includes('school') || questionLower.includes('university') || 
        questionLower.includes('college') || questionLower.includes('institution')) {
      log.debug('[SMART MATCH] Detected school/university field');
      
      // Alternative names mapping for common schools
      // LinkedIn often uses different naming conventions
      const alternativeNames: Record<string, string[]> = {
        'université psl': ['Paris Sciences et Lettres', 'PSL University', 'PSL Research University'],
        'psl': ['Paris Sciences et Lettres', 'PSL University'],
        'institut polytechnique de paris': ['IP Paris', 'Polytechnique Paris', 'Institut Polytechnique'],
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
      
      // Get schools from resume education
      if (resume?.education && resume.education.length > 0) {
        // Try each education institution from resume
        for (const edu of resume.education) {
          const institution = edu.institution || edu.school;
          if (!institution) continue;
          
          const instLower = institution.toLowerCase();
          log.debug(`[SMART MATCH] Checking resume institution: "${institution}"`);
          
          // Try exact match first
          const exactMatch = options.find(o => 
            o.toLowerCase() === instLower
          );
          if (exactMatch) {
            log.info(`[SMART MATCH] ✅ Found exact school match: "${exactMatch}"`);
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
                  log.info(`[SMART MATCH] ✅ Found alternative name match: "${altMatch}" (via "${alt}")`);
                  return altMatch;
                }
              }
            }
          }
          
          // Try partial match (institution name contained in option)
          const partialMatch = options.find(o => 
            o.toLowerCase().includes(instLower) ||
            instLower.includes(o.toLowerCase())
          );
          if (partialMatch) {
            log.info(`[SMART MATCH] ✅ Found partial school match: "${partialMatch}"`);
            return partialMatch;
          }
          
          // Try word-by-word matching for significant words (>4 chars)
          const institutionWords = instLower.split(/[\s\-()]+/).filter(w => w.length > 4);
          for (const word of institutionWords) {
            // Skip common words that would match too broadly
            if (['university', 'institut', 'école', 'ecole', 'paris', 'france'].includes(word)) continue;
            const wordMatch = options.find(o => o.toLowerCase().includes(word));
            if (wordMatch) {
              log.info(`[SMART MATCH] ✅ Found word-based school match: "${wordMatch}" (word: "${word}")`);
              return wordMatch;
            }
          }
        }
        log.warn('[SMART MATCH] No school match found in options - resume schools may not be in dropdown');
      }
    }

    // Phone prefix detection
    if (questionLower.includes('phone') || questionLower.includes('prefix') || questionLower.includes('code')) {
      // Check if element has phone-related ID
      const selectId = await element.locator('select').first().getAttribute('id') || '';
      if (selectId.includes('phonePrefix') || selectId.includes('countryCode')) {
        // Try to find common country codes
        // This would be better with resume data, but for now use common defaults
        const preferredPrefixes = ['+1', '+44', '+33', '+49'];
        for (const prefix of preferredPrefixes) {
          const match = options.find(o => o.includes(prefix));
          if (match) {
            log.debug(`Smart match (phone prefix): "${match}"`);
            return match;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Select option by label (handles minor text differences)
   */
  private async selectOption(select: Locator, options: string[], answer: string): Promise<boolean> {
    const normalizedAnswer = normalizeText(answer);

    for (const option of options) {
      const normalizedOption = normalizeText(option);
      
      if (normalizedOption === normalizedAnswer) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(500);
          return true;
        } catch (error) {
          log.debug(`Failed to select "${option}": ${error}`);
        }
      }
    }

    // Fallback: try partial match
    for (const option of options) {
      if (normalizeText(option).includes(normalizedAnswer) || 
          normalizedAnswer.includes(normalizeText(option))) {
        try {
          await select.selectOption({ label: option });
          await this.page.waitForTimeout(500);
          return true;
        } catch {
          // Continue
        }
      }
    }

    return false;
  }
}
