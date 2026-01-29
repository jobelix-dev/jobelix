/**
 * Text Input Handler - Handles single-line text inputs
 * 
 * Used for fields like:
 * - Name, email, phone number
 * - Years of experience (numeric)
 * - City, company name
 */

import type { Locator } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import type { Resume } from '../../../types';

const log = createLogger('TextHandler');

export class TextInputHandler extends BaseFieldHandler {
  /**
   * Check if this element contains a text input
   * Excludes radio, checkbox, file, and button inputs
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      const inputs = await element.locator('input').all();
      
      for (const input of inputs) {
        const type = await input.getAttribute('type') || 'text';
        // Accept text-like inputs, exclude special types
        if (!['button', 'submit', 'checkbox', 'radio', 'file', 'hidden'].includes(type)) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Handle a text input field
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const input = element.locator('input').first();
      if (await input.count() === 0) return false;

      const inputType = await input.getAttribute('type') || 'text';
      
      // Skip non-text inputs
      if (['button', 'submit', 'checkbox', 'radio', 'file', 'hidden'].includes(inputType)) {
        return false;
      }

      // Get question text
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question: "${questionText}"`);

      // Check if already filled by LinkedIn
      const existingValue = await input.inputValue();
      if (existingValue?.trim()) {
        log.debug(`LinkedIn pre-filled: "${existingValue}" - checking if we should override`);
        // Only override if it looks like a placeholder
        if (!existingValue.toLowerCase().includes('select') && 
            !existingValue.toLowerCase().includes('enter')) {
          log.debug('Keeping pre-filled value');
          return true;
        }
      }

      // Determine if numeric
      const isNumeric = await this.isNumericField(input);
      
      // Get answer
      let answer: string | undefined;
      
      const questionLower = questionText.toLowerCase();
      const isUrlField = questionLower.includes('website') || questionLower.includes('url') || 
                         questionLower.includes('portfolio') || questionLower.includes('github') || 
                         questionLower.includes('linkedin');

      // For URL fields, try smart matching FIRST (saved answers may contain bad text descriptions)
      if (isUrlField) {
        answer = await this.smartMatch(element, questionText);
        if (answer) {
          log.debug(`[URL FIELD] Smart match found URL: ${answer}`);
        }
      }

      // Check saved answers (but skip for URL fields if we already have a smart match)
      if (!answer) {
        const savedAnswer = this.formUtils.getSavedAnswer('text', questionText);
        // For URL fields, only use saved answer if it looks like a URL
        if (isUrlField) {
          if (savedAnswer && (savedAnswer.startsWith('http') || savedAnswer.includes('.com') || savedAnswer.includes('.io'))) {
            answer = savedAnswer;
          } else if (savedAnswer) {
            log.debug(`[URL FIELD] Ignoring non-URL saved answer: "${savedAnswer.substring(0, 50)}..."`); 
          }
        } else {
          answer = savedAnswer;
        }
      }

      // Try smart matching for non-URL fields
      if (!answer && !isUrlField) {
        answer = await this.smartMatch(element, questionText);
      }

      // Ask GPT
      if (!answer) {
        if (isNumeric) {
          log.debug(`Asking GPT (numeric): "${questionText}"`);
          const numAnswer = await this.gptAnswerer.answerNumeric(questionText);
          answer = String(numAnswer);
        } else {
          log.debug(`Asking GPT (textual): "${questionText}"`);
          answer = await this.gptAnswerer.answerTextual(questionText);
        }
      }

      if (!answer?.trim()) {
        log.warn('No answer available for text input');
        return false;
      }

      log.info(`✅ Q: "${questionText}" → "${answer.substring(0, 50)}${answer.length > 50 ? '...' : ''}"`);

      // Fill the input
      await input.click();
      await input.fill(''); // Clear first
      await input.fill(answer);
      await this.page.waitForTimeout(300);

      // Remember answer
      this.formUtils.rememberAnswer('text', questionText, answer);

      // Check for validation errors
      const errorMsg = await this.formUtils.extractFieldErrors(element);
      if (errorMsg) {
        log.warn(`Validation error: ${errorMsg}`);
        
        // Retry with error context
        const retryAnswer = await this.gptAnswerer.answerTextualWithRetry(
          questionText, answer, errorMsg
        );
        
        if (retryAnswer) {
          await input.fill('');
          await input.fill(retryAnswer);
          this.formUtils.rememberAnswer('text', questionText, retryAnswer);
        }
      }

      return true;

    } catch (error) {
      log.error(`Error handling text input: ${error}`);
      return false;
    }
  }

  /**
   * Check if this is a numeric field
   */
  private async isNumericField(input: Locator): Promise<boolean> {
    try {
      const type = await input.getAttribute('type');
      if (type === 'number') return true;

      const inputmode = await input.getAttribute('inputmode');
      if (inputmode && ['numeric', 'decimal'].includes(inputmode)) return true;

      const id = await input.getAttribute('id') || '';
      const name = await input.getAttribute('name') || '';
      
      return (
        id.includes('numeric') ||
        id.includes('number') ||
        name.includes('numeric') ||
        name.includes('number')
      );
    } catch {
      return false;
    }
  }

  /**
   * Smart matching for common text fields
   * 
   * Uses language-independent HTML patterns to identify field types like:
   * - Location/City fields (geo-location pattern in element ID)
   * - Phone number fields
   * 
   * This matches the Python smart_text_match() logic in playwright_form_utils.py
   */
  private async smartMatch(element: Locator, questionText: string): Promise<string | undefined> {
    try {
      const resume = this.gptAnswerer.resume as Resume | undefined;
      if (!resume?.personalInformation) {
        log.debug('[SMART TEXT] No resume or personal info available');
        return undefined;
      }
      
      const personalInfo = resume.personalInformation;
      
      // Find the input element and check its ID
      const input = element.locator('input').first();
      if (await input.count() === 0) {
        return undefined;
      }
      
      const elementId = (await input.getAttribute('id') || '').toLowerCase();
      
      log.debug(`[SMART TEXT] Element ID: ${elementId}`);
      
      // Location/City detection (HTML structure-based)
      // Pattern: id contains "geo-location" or "location-geo" (matches Python exactly)
      if (elementId.includes('geo-location') || elementId.includes('location-geo')) {
        log.debug('[SMART TEXT] Detected location/city field (by HTML structure)');
        const city = personalInfo.city;
        if (city) {
          log.info(`[SMART TEXT] ✅ Using city from resume: ${city}`);
          return city;
        } else {
          log.warn('[SMART TEXT] No city in resume');
        }
        return undefined;
      }
      
      // Phone number detection (HTML structure-based)
      // Pattern: id contains "phonenumber-nationalnumber" or "phone-national" (matches Python)
      if (elementId.includes('phonenumber-nationalnumber') || elementId.includes('phone-national')) {
        log.debug('[SMART TEXT] Detected phone number field (by HTML structure)');
        const phone = personalInfo.phonePrefix && personalInfo.phone 
          ? `${personalInfo.phonePrefix}${personalInfo.phone}`
          : personalInfo.phone;
        if (phone) {
          log.info(`[SMART TEXT] ✅ Using phone from resume: ${phone}`);
          return phone;
        } else {
          log.warn('[SMART TEXT] No phone in resume');
        }
        return undefined;
      }
      
      // Also check question text for common patterns as fallback
      const questionLower = questionText.toLowerCase();
      
      // Website/URL detection - CRITICAL: These often get routed to wrong GPT section
      // Pattern: "website", "url", "portfolio", "linkedin profile", "github"
      if (questionLower.includes('website') || questionLower.includes('url') || 
          questionLower.includes('portfolio') || questionLower.includes('personal site') ||
          questionLower.includes('github') || questionLower.includes('linkedin')) {
        log.debug('[SMART TEXT] Detected URL/Website field (by question text)');
        
        // Check resume profiles for URLs
        const profiles = (resume as any)?.profiles || personalInfo?.profiles || [];
        
        // Try to match specific platform if mentioned
        if (questionLower.includes('github')) {
          const github = profiles.find((p: any) => 
            p.network?.toLowerCase() === 'github' || p.url?.includes('github'));
          if (github?.url) {
            log.info(`[SMART TEXT] ✅ Using GitHub from resume: ${github.url}`);
            return github.url;
          }
        }
        
        if (questionLower.includes('linkedin')) {
          const linkedin = profiles.find((p: any) => 
            p.network?.toLowerCase() === 'linkedin' || p.url?.includes('linkedin'));
          if (linkedin?.url) {
            log.info(`[SMART TEXT] ✅ Using LinkedIn from resume: ${linkedin.url}`);
            return linkedin.url;
          }
        }
        
        // For generic "website" - try portfolio, personal site, or GitHub
        if (questionLower.includes('website') || questionLower.includes('portfolio') || 
            questionLower.includes('personal site') || questionLower.includes('url')) {
          // Priority: portfolio > personal website > github
          const portfolio = profiles.find((p: any) => 
            p.network?.toLowerCase() === 'portfolio' || 
            (p.url && !p.url.includes('linkedin') && !p.url.includes('github')));
          if (portfolio?.url) {
            log.info(`[SMART TEXT] ✅ Using portfolio from resume: ${portfolio.url}`);
            return portfolio.url;
          }
          
          const github = profiles.find((p: any) => 
            p.network?.toLowerCase() === 'github' || p.url?.includes('github'));
          if (github?.url) {
            log.info(`[SMART TEXT] ✅ Using GitHub for website: ${github.url}`);
            return github.url;
          }
          
          // Check if there's a website in personal info
          const personalWebsite = (personalInfo as any)?.website || (personalInfo as any)?.url;
          if (personalWebsite) {
            log.info(`[SMART TEXT] ✅ Using website from personal info: ${personalWebsite}`);
            return personalWebsite;
          }
          
          log.debug('[SMART TEXT] No URL/website found in resume profiles');
        }
      }
      
      // Phone number by question text
      if (questionLower.includes('phone') && !questionLower.includes('prefix')) {
        const phone = personalInfo.phonePrefix && personalInfo.phone 
          ? `${personalInfo.phonePrefix}${personalInfo.phone}`
          : personalInfo.phone;
        if (phone) {
          log.info(`[SMART TEXT] ✅ Using phone from resume (by question): ${phone}`);
          return phone;
        }
      }
      
      // City by question text
      if (questionLower.includes('city') || questionLower.includes('location')) {
        const city = personalInfo.city;
        if (city) {
          log.info(`[SMART TEXT] ✅ Using city from resume (by question): ${city}`);
          return city;
        }
      }
      
      log.debug('[SMART TEXT] No pattern matched');
      return undefined;
      
    } catch (error) {
      log.debug(`[SMART TEXT] Error analyzing element: ${error}`);
      return undefined;
    }
  }
}
