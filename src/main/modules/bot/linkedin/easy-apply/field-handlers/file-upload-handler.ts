/**
 * File Upload Handler - Handles file upload fields (resume, cover letter, etc.)
 * 
 * LinkedIn file uploads can include:
 * - Resume upload
 * - Cover letter upload
 * - Portfolio documents
 * - Previously uploaded file selection
 */

import type { Locator } from 'playwright';
import type { Page } from 'playwright';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';

const log = createLogger('FileUploadHandler');

export class FileUploadHandler extends BaseFieldHandler {
  private resumePath: string | null;
  private coverLetterPath: string | null;

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
      // Check for file input
      const fileInput = element.locator('input[type="file"]');
      if (await fileInput.count() > 0) return true;

      // Check for upload button/label
      const uploadLabel = element.locator('text=/upload|attach|document/i');
      if (await uploadLabel.count() > 0) return true;

      // Check for resume-specific attributes
      const resumeSection = element.locator('[data-test-document-upload]');
      if (await resumeSection.count() > 0) return true;

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
      // Determine the type of document being requested
      const questionText = await this.extractQuestionText(element);
      const lowerQuestion = questionText.toLowerCase();

      // Check if file is already uploaded (LinkedIn shows a green checkmark or filename)
      const hasUploadedFile = await this.checkExistingUpload(element);
      if (hasUploadedFile) {
        log.debug('File already uploaded');
        return true;
      }

      // Check for "Use previous resume" option first
      const usedPrevious = await this.tryUsePreviousUpload(element);
      if (usedPrevious) {
        log.info('✅ Selected previously uploaded file');
        return true;
      }

      // Determine which file to upload
      let filePath: string | null = null;
      
      if (lowerQuestion.includes('resume') || lowerQuestion.includes('cv')) {
        filePath = this.resumePath;
        log.debug('Uploading resume');
      } else if (lowerQuestion.includes('cover letter') || lowerQuestion.includes('coverletter')) {
        filePath = this.coverLetterPath;
        log.debug('Uploading cover letter');
      } else {
        // Default to resume for generic document requests
        filePath = this.resumePath;
        log.debug('Uploading resume (default)');
      }

      if (!filePath) {
        log.warn(`No file available for upload: "${questionText}"`);
        // Return true to not block the application - LinkedIn often allows skipping
        return true;
      }

      // Upload the file
      const success = await this.uploadFile(element, filePath);
      
      if (success) {
        log.info(`✅ Uploaded file: ${filePath}`);
      }

      return success;

    } catch (error) {
      log.error(`Error handling file upload: ${error}`);
      return false;
    }
  }

  /**
   * Check if a file is already uploaded
   */
  private async checkExistingUpload(element: Locator): Promise<boolean> {
    try {
      // LinkedIn shows uploaded files with specific classes
      const uploadedFile = element.locator('.jobs-document-upload__filename');
      if (await uploadedFile.count() > 0) {
        return true;
      }

      // Check for success indicator
      const successIndicator = element.locator('[data-test-document-upload-success]');
      if (await successIndicator.count() > 0) {
        return true;
      }

      // Check for file display container
      const fileDisplay = element.locator('.jobs-document-upload-redesign-card__file-name');
      if (await fileDisplay.count() > 0) {
        const fileName = await fileDisplay.textContent();
        if (fileName?.trim()) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Try to use a previously uploaded file
   */
  private async tryUsePreviousUpload(element: Locator): Promise<boolean> {
    try {
      // Look for "Be sure to include..." option with existing files
      const previousUploadOption = element.locator('[data-test-document-upload-file-card]').first();
      
      if (await previousUploadOption.count() > 0) {
        await previousUploadOption.click();
        await this.page.waitForTimeout(500);
        return true;
      }

      // Alternative: Radio button to select existing file
      const existingFileRadio = element.locator('input[type="radio"][data-test-resume-radio]').first();
      if (await existingFileRadio.count() > 0) {
        await existingFileRadio.click();
        await this.page.waitForTimeout(500);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Upload a file to the input
   */
  private async uploadFile(element: Locator, filePath: string): Promise<boolean> {
    try {
      // Find the file input
      const fileInput = element.locator('input[type="file"]').first();
      
      if (await fileInput.count() > 0) {
        // Set file using Playwright's setInputFiles
        await fileInput.setInputFiles(filePath);
        
        // Wait for upload to process
        await this.page.waitForTimeout(2000);
        
        return true;
      }

      // If no file input, try clicking an upload button
      const uploadButton = element.locator('button:has-text("Upload"), label:has-text("Upload")').first();
      
      if (await uploadButton.count() > 0) {
        // This might open a file dialog - need to handle with fileChooser
        const [fileChooser] = await Promise.all([
          this.page.waitForEvent('filechooser', { timeout: 5000 }),
          uploadButton.click()
        ]);
        
        await fileChooser.setFiles(filePath);
        await this.page.waitForTimeout(2000);
        
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
   * Set the resume path for uploads
   */
  setResumePath(path: string): void {
    this.resumePath = path;
  }

  /**
   * Set the cover letter path for uploads
   */
  setCoverLetterPath(path: string): void {
    this.coverLetterPath = path;
  }
}
