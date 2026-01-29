/**
 * File Upload Handler - Handles file upload fields (resume, cover letter, etc.)
 * 
 * LinkedIn file uploads can include:
 * - Resume upload
 * - Cover letter upload (AI-generated on-the-fly if not provided)
 * - Portfolio documents
 * - Previously uploaded file selection
 * 
 * Supports parallel resume tailoring:
 * - Resume generation can start in background while form filling begins
 * - Handler will await the pending resume Promise when upload is needed
 */

import type { Locator } from 'playwright';
import type { Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { BaseFieldHandler } from './base-handler';
import { createLogger } from '../../../utils/logger';

const log = createLogger('FileUploadHandler');

export class FileUploadHandler extends BaseFieldHandler {
  private resumePath: string | null;
  private coverLetterPath: string | null;
  private generatedCoverLetterPath: string | null = null;
  
  /** Pending tailored resume generation (for parallel processing) */
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
      // MATCHES PYTHON: Check input id attribute first (more reliable than question text)
      let isResumeUpload = true;
      let isCoverLetterUpload = false;
      
      const fileInput = element.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        try {
          const inputId = ((await fileInput.getAttribute('id')) || '').toLowerCase();
          log.debug(`File input id: "${inputId}"`);
          
          isCoverLetterUpload = ['cover', 'motivation'].some(k => inputId.includes(k));
          isResumeUpload = !isCoverLetterUpload;
        } catch {
          // Fallback to question text detection
        }
      }
      
      // Also check question text as secondary signal
      const questionText = await this.extractQuestionText(element);
      const lowerQuestion = questionText.toLowerCase();
      
      if (lowerQuestion.includes('cover letter') || lowerQuestion.includes('coverletter') || lowerQuestion.includes('motivation')) {
        isCoverLetterUpload = true;
        isResumeUpload = false;
      } else if (lowerQuestion.includes('resume') || lowerQuestion.includes('cv')) {
        isResumeUpload = true;
        isCoverLetterUpload = false;
      }
      
      log.debug(`Upload type: resume=${isResumeUpload}, coverLetter=${isCoverLetterUpload}`);

      // If this is a resume upload, await any pending tailored resume first
      // This is where parallel resume generation syncs back
      if (isResumeUpload) {
        await this.getResumePath(); // This awaits pending tailored resume if any
      }

      // Check if file is already uploaded (LinkedIn shows a green checkmark or filename)
      const hasUploadedFile = await this.checkExistingUpload(element);
      if (hasUploadedFile) {
        log.debug('File already uploaded');
        // Even if already uploaded, ensure correct one is selected (CRITICAL - matches Python)
        if (isResumeUpload && this.resumePath) {
          await this.ensureCorrectResumeSelected(element);
        }
        return true;
      }

      // Check for "Use previous resume" option first
      const usedPrevious = await this.tryUsePreviousUpload(element);
      if (usedPrevious) {
        log.info('✅ Selected previously uploaded file');
        // Ensure the correct one is selected after choosing "use previous"
        if (isResumeUpload && this.resumePath) {
          await this.ensureCorrectResumeSelected(element);
        }
        return true;
      }

      // Determine which file to upload (uses detection from earlier)
      let filePath: string | null = null;
      
      if (isResumeUpload) {
        filePath = this.resumePath;
        log.debug('Uploading resume');
      } else if (isCoverLetterUpload) {
        // Try existing cover letter first, then generate one
        filePath = this.coverLetterPath;
        if (!filePath) {
          log.info('📝 No cover letter provided, generating one with AI...');
          filePath = await this.generateCoverLetterPdf();
        }
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
        
        // CRITICAL: Ensure the newly uploaded resume is selected (matches Python bot)
        // LinkedIn may auto-select an older resume from the list
        if (isResumeUpload) {
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
        // MATCHES PYTHON: Make the input interactable by removing 'hidden' class
        try {
          await fileInput.evaluate((el) => el.classList.remove('hidden'));
        } catch {
          log.debug('Could not remove hidden class (may already be visible)');
        }
        
        // Set file using Playwright's setInputFiles
        log.info(`Uploading file: ${filePath}`);
        await fileInput.setInputFiles(filePath);
        
        // MATCHES PYTHON: Dispatch change/blur events to trigger LinkedIn's UI update
        try {
          for (const eventType of ['change', 'blur']) {
            await fileInput.evaluate((el, evt) => {
              el.dispatchEvent(new Event(evt, { bubbles: true }));
            }, eventType);
          }
        } catch {
          log.debug('Could not dispatch events on file input');
        }
        
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
   * Ensure the correct (newly uploaded) resume is selected in LinkedIn's UI.
   * 
   * LinkedIn shows a list of previously uploaded resumes and may auto-select
   * an older one. This method finds the card matching our resume filename
   * and clicks its radio button to select it.
   * 
   * CRITICAL: This matches the Python bot's _ensure_correct_resume_selected() method
   */
  private async ensureCorrectResumeSelected(element: Locator): Promise<void> {
    if (!this.resumePath) {
      return;
    }

    try {
      // Extract just the filename from the path
      const expectedFilename = path.basename(this.resumePath);
      log.debug(`Ensuring resume is selected: ${expectedFilename}`);

      // Wait a moment for LinkedIn to update the UI after upload
      await this.page.waitForTimeout(500);

      // Find all resume cards in the document upload section
      const resumeCards = await element.locator('div.jobs-document-upload-redesign-card__container').all();

      if (resumeCards.length === 0) {
        log.debug('No resume selection cards found, upload likely direct');
        return;
      }

      log.debug(`Found ${resumeCards.length} resume cards`);

      // Find the card with our resume filename
      let targetCard: Locator | null = null;
      for (const card of resumeCards) {
        try {
          const filenameElement = card.locator('h3.jobs-document-upload-redesign-card__file-name').first();
          if (await filenameElement.count() === 0) continue;

          const cardFilename = await filenameElement.textContent();
          log.debug(`Checking card: ${cardFilename?.trim()}`);

          if (cardFilename?.trim() === expectedFilename) {
            targetCard = card;
            log.info(`Found matching resume card: ${cardFilename?.trim()}`);
            break;
          }
        } catch {
          continue;
        }
      }

      if (!targetCard) {
        log.warn(`Could not find card for ${expectedFilename}`);
        return;
      }

      // Check if it's already selected
      try {
        const cardClasses = await targetCard.getAttribute('class') || '';
        if (cardClasses.includes('jobs-document-upload-redesign-card__container--selected')) {
          log.info('✅ Correct resume already selected');
          return;
        }
      } catch (e) {
        log.debug(`Could not check selection status: ${e}`);
      }

      // Find and click the radio button or the card itself to select it
      try {
        // Try clicking the radio label first (more reliable than hidden input)
        const radioLabel = targetCard.locator('label.jobs-document-upload-redesign-card__toggle-label').first();
        const radioInput = targetCard.locator('input[type="radio"]').first();

        if (await radioLabel.count() > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await this.page.evaluate((el: any) => el.click(), await radioLabel.elementHandle());
          log.info(`✅ Selected resume: ${expectedFilename}`);
          await this.page.waitForTimeout(300);
        } else if (await radioInput.count() > 0) {
          await radioInput.click();
          log.info(`✅ Selected resume: ${expectedFilename}`);
          await this.page.waitForTimeout(300);
        } else {
          // If no radio button, try clicking the card itself
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await this.page.evaluate((el: any) => el.click(), await targetCard.elementHandle());
          log.info(`✅ Clicked resume card: ${expectedFilename}`);
          await this.page.waitForTimeout(300);
        }
      } catch (e) {
        log.warn(`Failed to select resume: ${e}`);
      }

    } catch (error) {
      log.warn(`Error ensuring correct resume selection: ${error}`);
    }
  }

  /**
   * Generate a cover letter PDF using AI
   * 
   * MATCHES PYTHON: Creates a temporary PDF file containing an AI-generated cover letter.
   * Uses Playwright to generate the PDF from HTML for proper formatting.
   * 
   * @returns Path to generated PDF, or null if generation fails
   */
  private async generateCoverLetterPdf(): Promise<string | null> {
    try {
      log.debug('[COVER LETTER] Generating cover letter with GPT');
      
      // Generate cover letter text using GPT
      const coverLetterText = await this.gptAnswerer.answerTextual(
        'Write a cover letter for this job application'
      );
      
      if (!coverLetterText || coverLetterText.length < 100) {
        log.warn('[COVER LETTER] Failed to generate cover letter text');
        return null;
      }
      
      // Create temporary PDF file path
      const tempDir = os.tmpdir();
      const timestamp = Date.now();
      const pdfPath = path.join(tempDir, `cover_letter_${timestamp}.pdf`);
      
      // Format the cover letter as HTML for PDF generation
      const paragraphs = coverLetterText.split('\n\n').filter((p: string) => p.trim());
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      margin: 1in;
      color: #333;
    }
    p {
      margin-bottom: 12pt;
      text-align: justify;
    }
  </style>
</head>
<body>
  ${paragraphs.map((p: string) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n')}
</body>
</html>`;

      // Use Playwright to generate PDF from HTML
      // Create a new page to render the HTML
      const context = this.page.context();
      const pdfPage = await context.newPage();
      
      try {
        await pdfPage.setContent(htmlContent, { waitUntil: 'networkidle' });
        await pdfPage.pdf({
          path: pdfPath,
          format: 'Letter',
          margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
          printBackground: true,
        });
        
        log.info(`[COVER LETTER] ✅ Created PDF at: ${pdfPath}`);
        this.generatedCoverLetterPath = pdfPath;
        
        return pdfPath;
      } finally {
        await pdfPage.close();
      }
      
    } catch (error) {
      log.error(`[COVER LETTER] Failed to generate PDF: ${error}`);
      return null;
    }
  }

  /**
   * Clean up generated cover letter file
   */
  cleanup(): void {
    if (this.generatedCoverLetterPath && fs.existsSync(this.generatedCoverLetterPath)) {
      try {
        fs.unlinkSync(this.generatedCoverLetterPath);
        log.debug(`Cleaned up generated cover letter: ${this.generatedCoverLetterPath}`);
      } catch {
        // Ignore cleanup errors
      }
      this.generatedCoverLetterPath = null;
    }
  }

  /**
   * Set the resume path for uploads (immediate, synchronous)
   */
  setResumePath(newPath: string): void {
    this.resumePath = newPath;
    this.pendingTailoredResume = null; // Clear any pending promise
    log.debug(`Resume path updated: ${newPath}`);
  }

  /**
   * Set a pending tailored resume Promise (for parallel processing)
   * 
   * This allows resume tailoring to run in the background while
   * the Easy Apply modal opens and early form fields are filled.
   * The handler will await this Promise when it encounters a resume upload field.
   * 
   * @param promise - Promise that resolves to tailored resume path, or null on failure
   */
  setPendingTailoredResume(promise: Promise<string | null>): void {
    this.pendingTailoredResume = promise;
    log.debug('Pending tailored resume Promise set (will await when needed)');
  }

  /**
   * Get the resume path, awaiting any pending tailored resume first
   * 
   * If a tailored resume is being generated in the background,
   * this will wait for it to complete before returning.
   * 
   * @returns The resume path (tailored if available, original otherwise)
   */
  private async getResumePath(): Promise<string | null> {
    // If there's a pending tailored resume, await it
    if (this.pendingTailoredResume) {
      log.info('⏳ Waiting for tailored resume to complete...');
      try {
        const tailoredPath = await this.pendingTailoredResume;
        this.pendingTailoredResume = null; // Clear the promise after awaiting
        
        if (tailoredPath) {
          this.resumePath = tailoredPath;
          log.info(`✅ Tailored resume ready: ${tailoredPath}`);
        } else {
          log.warn('Tailored resume generation failed, using original resume');
        }
      } catch (error) {
        log.error(`Error awaiting tailored resume: ${error}`);
        this.pendingTailoredResume = null;
        // Fall back to original resume
      }
    }
    
    return this.resumePath;
  }

  /**
   * Set the cover letter path for uploads
   */
  setCoverLetterPath(path: string): void {
    this.coverLetterPath = path;
  }
}
