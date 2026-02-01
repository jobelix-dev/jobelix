import * as path from "path";
import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
import { detectDocumentType } from "../utils/document-type-detector.js";
import { generateCoverLetterPdf, cleanupGeneratedCoverLetter } from "../utils/cover-letter-generator.js";
import { TIMEOUTS } from "../selectors.js";
const log = createLogger("FileUploadHandler");
class FileUploadHandler extends BaseFieldHandler {
  constructor(page, gptAnswerer, formUtils, resumePath = null, coverLetterPath = null) {
    super(page, gptAnswerer, formUtils);
    this.pendingTailoredResume = null;
    this.resumePath = resumePath;
    this.coverLetterPath = coverLetterPath;
  }
  /**
   * Check if this element is a file upload field
   */
  async canHandle(element) {
    try {
      if (await element.locator('input[type="file"]').count() > 0) return true;
      if (await element.locator("text=/upload|attach|document/i").count() > 0) return true;
      if (await element.locator("[data-test-document-upload]").count() > 0) return true;
      return false;
    } catch {
      return false;
    }
  }
  /**
   * Handle a file upload field
   */
  async handle(element) {
    try {
      const fileInput = element.locator('input[type="file"]').first();
      const questionText = await this.extractQuestionText(element);
      log.debug(`Question text: "${questionText}"`);
      const docType = await detectDocumentType(fileInput, questionText);
      log.debug(`Upload type: resume=${docType.isResumeUpload}, coverLetter=${docType.isCoverLetterUpload}, by=${docType.detectedBy}`);
      if (docType.isResumeUpload) {
        await this.awaitPendingResume();
      }
      if (await this.hasExistingUpload(element)) {
        log.debug("File already uploaded");
        if (docType.isResumeUpload && this.resumePath) {
          await this.ensureCorrectResumeSelected(element);
        }
        return true;
      }
      if (await this.tryUsePreviousUpload(element)) {
        log.info("\u2705 Selected previously uploaded file");
        if (docType.isResumeUpload && this.resumePath) {
          await this.ensureCorrectResumeSelected(element);
        }
        return true;
      }
      const filePath = await this.getFileToUpload(docType);
      if (!filePath) {
        log.warn(`No file available for upload: "${questionText}"`);
        return true;
      }
      const success = await this.uploadFile(element, filePath);
      if (success) {
        log.info(`\u2705 Uploaded file: ${path.basename(filePath)}`);
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
  async getFileToUpload(docType) {
    if (docType.isCoverLetterUpload) {
      if (this.coverLetterPath) return this.coverLetterPath;
      log.info("\u{1F4DD} No cover letter provided, generating one with AI...");
      return generateCoverLetterPdf(this.page, (q) => this.gptAnswerer.answerTextual(q));
    }
    return this.resumePath;
  }
  /**
   * Check if a file is already uploaded
   */
  async hasExistingUpload(element) {
    const selectors = [
      ".jobs-document-upload__filename",
      "[data-test-document-upload-success]",
      ".jobs-document-upload-redesign-card__file-name"
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
  async tryUsePreviousUpload(element) {
    const selectors = [
      "[data-test-document-upload-file-card]",
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
  async uploadFile(element, filePath) {
    try {
      const fileInput = element.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        try {
          await fileInput.evaluate((el) => el.classList.remove("hidden"));
        } catch {
        }
        log.info(`Uploading file: ${filePath}`);
        await fileInput.setInputFiles(filePath);
        try {
          for (const evt of ["change", "blur"]) {
            await fileInput.evaluate((el, e) => {
              el.dispatchEvent(new Event(e, { bubbles: true }));
            }, evt);
          }
        } catch {
        }
        await this.page.waitForTimeout(TIMEOUTS.long);
        return true;
      }
      const uploadButton = element.locator('button:has-text("Upload"), label:has-text("Upload")').first();
      if (await uploadButton.count() > 0) {
        const [fileChooser] = await Promise.all([
          this.page.waitForEvent("filechooser", { timeout: 5e3 }),
          uploadButton.click()
        ]);
        await fileChooser.setFiles(filePath);
        await this.page.waitForTimeout(TIMEOUTS.long);
        return true;
      }
      log.warn("Could not find file input or upload button");
      return false;
    } catch (error) {
      log.debug(`Upload error: ${error}`);
      return false;
    }
  }
  /**
   * Ensure the correct resume is selected in LinkedIn's UI
   */
  async ensureCorrectResumeSelected(element) {
    if (!this.resumePath) return;
    try {
      const expectedFilename = path.basename(this.resumePath);
      log.debug(`Ensuring resume is selected: ${expectedFilename}`);
      await this.page.waitForTimeout(TIMEOUTS.medium);
      const resumeCards = await element.locator("div.jobs-document-upload-redesign-card__container").all();
      if (resumeCards.length === 0) {
        log.debug("No resume selection cards found");
        return;
      }
      log.debug(`Found ${resumeCards.length} resume cards`);
      for (const card of resumeCards) {
        try {
          const filenameEl = card.locator("h3.jobs-document-upload-redesign-card__file-name").first();
          if (await filenameEl.count() === 0) continue;
          const cardFilename = await filenameEl.textContent();
          if (cardFilename?.trim() !== expectedFilename) continue;
          log.info(`Found matching resume card: ${cardFilename?.trim()}`);
          const cardClasses = await card.getAttribute("class") || "";
          if (cardClasses.includes("--selected")) {
            log.info("\u2705 Correct resume already selected");
            return;
          }
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
  async selectResumeCard(card, filename) {
    try {
      const radioLabel = card.locator("label.jobs-document-upload-redesign-card__toggle-label").first();
      const radioInput = card.locator('input[type="radio"]').first();
      if (await radioLabel.count() > 0) {
        const handle = await radioLabel.elementHandle();
        if (handle) {
          await this.page.evaluate((el) => el.click(), handle);
        }
      } else if (await radioInput.count() > 0) {
        await radioInput.click();
      } else {
        const handle = await card.elementHandle();
        if (handle) {
          await this.page.evaluate((el) => el.click(), handle);
        }
      }
      log.info(`\u2705 Selected resume: ${filename}`);
      await this.page.waitForTimeout(TIMEOUTS.short);
    } catch (e) {
      log.warn(`Failed to select resume: ${e}`);
    }
  }
  /**
   * Await any pending tailored resume generation
   */
  async awaitPendingResume() {
    if (!this.pendingTailoredResume) return;
    log.info("\u23F3 Waiting for tailored resume to complete...");
    try {
      const tailoredPath = await this.pendingTailoredResume;
      this.pendingTailoredResume = null;
      if (tailoredPath) {
        this.resumePath = tailoredPath;
        log.info(`\u2705 Tailored resume ready: ${tailoredPath}`);
      } else {
        log.warn("Tailored resume generation failed, using original");
      }
    } catch (error) {
      log.error(`Error awaiting tailored resume: ${error}`);
      this.pendingTailoredResume = null;
    }
  }
  // Public API for setting paths
  setResumePath(newPath) {
    this.resumePath = newPath;
    this.pendingTailoredResume = null;
    log.debug(`Resume path updated: ${newPath}`);
  }
  setPendingTailoredResume(promise) {
    this.pendingTailoredResume = promise;
    log.debug("Pending tailored resume Promise set");
  }
  setCoverLetterPath(newPath) {
    this.coverLetterPath = newPath;
  }
  cleanup() {
    cleanupGeneratedCoverLetter();
  }
}
export {
  FileUploadHandler
};
//# sourceMappingURL=file-upload-handler.js.map
