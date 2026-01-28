import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
const log = createLogger("FileUploadHandler");
class FileUploadHandler extends BaseFieldHandler {
  constructor(page, gptAnswerer, formUtils, resumePath = null, coverLetterPath = null) {
    super(page, gptAnswerer, formUtils);
    this.resumePath = resumePath;
    this.coverLetterPath = coverLetterPath;
  }
  /**
   * Check if this element is a file upload field
   */
  async canHandle(element) {
    try {
      const fileInput = element.locator('input[type="file"]');
      if (await fileInput.count() > 0) return true;
      const uploadLabel = element.locator("text=/upload|attach|document/i");
      if (await uploadLabel.count() > 0) return true;
      const resumeSection = element.locator("[data-test-document-upload]");
      if (await resumeSection.count() > 0) return true;
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
      const questionText = await this.extractQuestionText(element);
      const lowerQuestion = questionText.toLowerCase();
      const hasUploadedFile = await this.checkExistingUpload(element);
      if (hasUploadedFile) {
        log.debug("File already uploaded");
        return true;
      }
      const usedPrevious = await this.tryUsePreviousUpload(element);
      if (usedPrevious) {
        log.info("\u2705 Selected previously uploaded file");
        return true;
      }
      let filePath = null;
      if (lowerQuestion.includes("resume") || lowerQuestion.includes("cv")) {
        filePath = this.resumePath;
        log.debug("Uploading resume");
      } else if (lowerQuestion.includes("cover letter") || lowerQuestion.includes("coverletter")) {
        filePath = this.coverLetterPath;
        log.debug("Uploading cover letter");
      } else {
        filePath = this.resumePath;
        log.debug("Uploading resume (default)");
      }
      if (!filePath) {
        log.warn(`No file available for upload: "${questionText}"`);
        return true;
      }
      const success = await this.uploadFile(element, filePath);
      if (success) {
        log.info(`\u2705 Uploaded file: ${filePath}`);
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
  async checkExistingUpload(element) {
    try {
      const uploadedFile = element.locator(".jobs-document-upload__filename");
      if (await uploadedFile.count() > 0) {
        return true;
      }
      const successIndicator = element.locator("[data-test-document-upload-success]");
      if (await successIndicator.count() > 0) {
        return true;
      }
      const fileDisplay = element.locator(".jobs-document-upload-redesign-card__file-name");
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
  async tryUsePreviousUpload(element) {
    try {
      const previousUploadOption = element.locator("[data-test-document-upload-file-card]").first();
      if (await previousUploadOption.count() > 0) {
        await previousUploadOption.click();
        await this.page.waitForTimeout(500);
        return true;
      }
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
  async uploadFile(element, filePath) {
    try {
      const fileInput = element.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(filePath);
        await this.page.waitForTimeout(2e3);
        return true;
      }
      const uploadButton = element.locator('button:has-text("Upload"), label:has-text("Upload")').first();
      if (await uploadButton.count() > 0) {
        const [fileChooser] = await Promise.all([
          this.page.waitForEvent("filechooser", { timeout: 5e3 }),
          uploadButton.click()
        ]);
        await fileChooser.setFiles(filePath);
        await this.page.waitForTimeout(2e3);
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
   * Set the resume path for uploads
   */
  setResumePath(path) {
    this.resumePath = path;
  }
  /**
   * Set the cover letter path for uploads
   */
  setCoverLetterPath(path) {
    this.coverLetterPath = path;
  }
}
export {
  FileUploadHandler
};
//# sourceMappingURL=file-upload-handler.js.map
