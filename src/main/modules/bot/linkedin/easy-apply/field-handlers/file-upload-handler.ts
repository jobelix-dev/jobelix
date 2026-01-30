/**
 * File Upload Handler - Handles file upload fields (resume, cover letter, etc.)
 * 
 * Supports:
 * - Resume upload (with parallel tailoring support)
 * - Cover letter upload (AI-generated on-the-fly if not provided)
 * - Previously uploaded file selection
 */

import type { Locator, Page } from 'playwright-core';
import * as path from 'path';
import * as fs from 'fs';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';
import { detectDocumentType } from '../utils/document-type-detector';
import { generateCoverLetterPdf, cleanupGeneratedCoverLetter } from '../utils/cover-letter-generator';
import { TIMEOUTS } from '../selectors';

const log = createLogger('FileUploadHandler');

export class FileUploadHandler extends BaseFieldHandler {
  private resumePath: string | null;
  private coverLetterPath: string | null;
  private pendingTailoredResume: Promise<string | null> | null = null;

  constructor(
    page: Page,
    gptAnswerer: any,
    formUtils: any,
    resumePath: string | null = null,
    coverLetterPath: string | null = null
  ) {
    super(page, gptAnswerer, formUtils);
    this.resumePath = resumePath;
    this.coverLetterPath = coverLetterPath;
  }

  /**
   * Check if this element is a file upload field
   */
  async canHandle(element: Locator): Promise<boolean> {
    try {
      if (await element.locator('input[type="file"]').count() > 0) return true;
      if (await element.locator('text=/upload|attach|document/i').count() > 0) return true;
      if (await element.locator('[data-test-document-upload]').count() > 0) return true;
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Handle a file upload field
   */
  async handle(element: Locator): Promise<boolean> {
    try {
      const fileInput = element.locator('input[type="file"]').first();
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question text: "${questionText}"`);

      // Detect document type (resume vs cover letter)
      const docType = await detectDocumentType(fileInput, questionText);
      log.debug(`Upload type: resume=${docType.isResumeUpload}, coverLetter=${docType.isCoverLetterUpload}, by=${docType.detectedBy}`);

      // Await pending tailored resume if this is a resume upload
      if (docType.isResumeUpload) {
        await this.awaitPendingResume();
      }

      // Check if file is already uploaded
      if (await this.hasExistingUpload(element)) {
        log.debug('File already uploaded');
        if (docType.isResumeUpload && this.resumePath) {
          await this.ensureCorrectResumeSelected(element);
        }
        return true;
      }

      // Try to use previously uploaded file
      if (await this.tryUsePreviousUpload(element)) {
        log.info('✅ Selected previously uploaded file');
        if (docType.isResumeUpload && this.resumePath) {
          await this.ensureCorrectResumeSelected(element);
        }
        return true;
      }

      // Determine which file to upload
      const filePath = await this.getFileToUpload(docType);
      if (!filePath) {
        log.warn(`No file available for upload: "${questionText}"`);
        return true; // Don't block - LinkedIn often allows skipping
      }

      // Upload the file
      const success = await this.uploadFile(element, filePath);
      if (success) {
        log.info(`✅ Uploaded file: ${path.basename(filePath)}`);
        if (docType.isResumeUpload) {
          await this.ensureCorrectResumeSelected(element);
        }
      }

      return success;
    } catch (error) {
      log.error(`Error handling file upload: ${error}`);
      return false;
    }
  }

  /**
   * Get the file path to upload based on document type
   */
  private async getFileToUpload(docType: { isResumeUpload: boolean; isCoverLetterUpload: boolean }): Promise<string | null> {
    if (docType.isCoverLetterUpload) {
      if (this.coverLetterPath) return this.coverLetterPath;
      
      log.info('📝 No cover letter provided, generating one with AI...');
      return generateCoverLetterPdf(this.page, (q) => this.gptAnswerer.answerTextual(q));
    }

    // Default to resume
    return this.resumePath;
  }

  /**
   * Check if a file is already uploaded
   */
  private async hasExistingUpload(element: Locator): Promise<boolean> {
    const selectors = [
      '.jobs-document-upload__filename',
      '[data-test-document-upload-success]',
      '.jobs-document-upload-redesign-card__file-name'
    ];

    for (const selector of selectors) {
      try {
        const el = element.locator(selector).first();
        if (await el.count() > 0) {
          const text = await el.textContent();
          if (text?.trim()) return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  /**
   * Try to use a previously uploaded file
   */
  private async tryUsePreviousUpload(element: Locator): Promise<boolean> {
    const selectors = [
      '[data-test-document-upload-file-card]',
      'input[type="radio"][data-test-resume-radio]'
    ];

    for (const selector of selectors) {
      try {
        const el = element.locator(selector).first();
        if (await el.count() > 0) {
          await el.click();
          await this.page.waitForTimeout(TIMEOUTS.medium);
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  /**
   * Upload a file to the input
   */
  private async uploadFile(element: Locator, filePath: string): Promise<boolean> {
    try {
      const fileInput = element.locator('input[type="file"]').first();

      if (await fileInput.count() > 0) {
        // Make input interactable
        try {
          await fileInput.evaluate((el) => (el as HTMLElement).classList.remove('hidden'));
        } catch {
          // May already be visible
        }

        log.info(`Uploading file: ${filePath}`);
        await fileInput.setInputFiles(filePath);

        // Dispatch events to trigger LinkedIn's UI update
        try {
          for (const evt of ['change', 'blur']) {
            await fileInput.evaluate((el, e) => {
              (el as HTMLElement).dispatchEvent(new Event(e, { bubbles: true }));
            }, evt);
          }
        } catch {
          // Ignore event dispatch errors
        }

        await this.page.waitForTimeout(TIMEOUTS.long);
        return true;
      }

      // Fallback: Try clicking upload button and using file chooser
      const uploadButton = element.locator('button:has-text("Upload"), label:has-text("Upload")').first();
      if (await uploadButton.count() > 0) {
        const [fileChooser] = await Promise.all([
          this.page.waitForEvent('filechooser', { timeout: 5000 }),
          uploadButton.click()
        ]);
        await fileChooser.setFiles(filePath);
        await this.page.waitForTimeout(TIMEOUTS.long);
        return true;
      }

      log.warn('Could not find file input or upload button');
      return false;
    } catch (error) {
      log.debug(`Upload error: ${error}`);
      return false;
    }
  }

  /**
   * Ensure the correct resume is selected in LinkedIn's UI
   */
  private async ensureCorrectResumeSelected(element: Locator): Promise<void> {
    if (!this.resumePath) return;

    try {
      const expectedFilename = path.basename(this.resumePath);
      log.debug(`Ensuring resume is selected: ${expectedFilename}`);

      await this.page.waitForTimeout(TIMEOUTS.medium);

      const resumeCards = await element.locator('div.jobs-document-upload-redesign-card__container').all();
      if (resumeCards.length === 0) {
        log.debug('No resume selection cards found');
        return;
      }

      log.debug(`Found ${resumeCards.length} resume cards`);

      // Find the card with our resume filename
      for (const card of resumeCards) {
        try {
          const filenameEl = card.locator('h3.jobs-document-upload-redesign-card__file-name').first();
          if (await filenameEl.count() === 0) continue;

          const cardFilename = await filenameEl.textContent();
          if (cardFilename?.trim() !== expectedFilename) continue;

          log.info(`Found matching resume card: ${cardFilename?.trim()}`);

          // Check if already selected
          const cardClasses = await card.getAttribute('class') || '';
          if (cardClasses.includes('--selected')) {
            log.info('✅ Correct resume already selected');
            return;
          }

          // Select the card
          await this.selectResumeCard(card, expectedFilename);
          return;
        } catch {
          continue;
        }
      }

      log.warn(`Could not find card for ${expectedFilename}`);
    } catch (error) {
      log.warn(`Error ensuring correct resume selection: ${error}`);
    }
  }

  /**
   * Select a resume card by clicking its radio or the card itself
   */
  private async selectResumeCard(card: Locator, filename: string): Promise<void> {
    try {
      const radioLabel = card.locator('label.jobs-document-upload-redesign-card__toggle-label').first();
      const radioInput = card.locator('input[type="radio"]').first();

      if (await radioLabel.count() > 0) {
        await this.page.evaluate((el: any) => el.click(), await radioLabel.elementHandle());
      } else if (await radioInput.count() > 0) {
        await radioInput.click();
      } else {
        await this.page.evaluate((el: any) => el.click(), await card.elementHandle());
      }

      log.info(`✅ Selected resume: ${filename}`);
      await this.page.waitForTimeout(TIMEOUTS.short);
    } catch (e) {
      log.warn(`Failed to select resume: ${e}`);
    }
  }

  /**
   * Await any pending tailored resume generation
   */
  private async awaitPendingResume(): Promise<void> {
    if (!this.pendingTailoredResume) return;

    log.info('⏳ Waiting for tailored resume to complete...');
    try {
      const tailoredPath = await this.pendingTailoredResume;
      this.pendingTailoredResume = null;

      if (tailoredPath) {
        this.resumePath = tailoredPath;
        log.info(`✅ Tailored resume ready: ${tailoredPath}`);
      } else {
        log.warn('Tailored resume generation failed, using original');
      }
    } catch (error) {
      log.error(`Error awaiting tailored resume: ${error}`);
      this.pendingTailoredResume = null;
    }
  }

  // Public API for setting paths
  setResumePath(newPath: string): void {
    this.resumePath = newPath;
    this.pendingTailoredResume = null;
    log.debug(`Resume path updated: ${newPath}`);
  }

  setPendingTailoredResume(promise: Promise<string | null>): void {
    this.pendingTailoredResume = promise;
    log.debug('Pending tailored resume Promise set');
  }

  setCoverLetterPath(newPath: string): void {
    this.coverLetterPath = newPath;
  }

  cleanup(): void {
    cleanupGeneratedCoverLetter();
  }
}
