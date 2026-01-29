import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { BaseFieldHandler } from "./base-handler.js";
import { createLogger } from "../../../utils/logger.js";
const log = createLogger("FileUploadHandler");
class FileUploadHandler extends BaseFieldHandler {
  constructor(page, gptAnswerer, formUtils, resumePath = null, coverLetterPath = null) {
    super(page, gptAnswerer, formUtils);
    this.generatedCoverLetterPath = null;
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
      let isResumeUpload = true;
      let isCoverLetterUpload = false;
      const fileInput = element.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        try {
          const inputId = (await fileInput.getAttribute("id") || "").toLowerCase();
          log.debug(`File input id: "${inputId}"`);
          isCoverLetterUpload = ["cover", "motivation"].some((k) => inputId.includes(k));
          isResumeUpload = !isCoverLetterUpload;
        } catch {
        }
      }
      const questionText = await this.extractQuestionText(element);
      const lowerQuestion = questionText.toLowerCase();
      if (lowerQuestion.includes("cover letter") || lowerQuestion.includes("coverletter") || lowerQuestion.includes("motivation")) {
        isCoverLetterUpload = true;
        isResumeUpload = false;
      } else if (lowerQuestion.includes("resume") || lowerQuestion.includes("cv")) {
        isResumeUpload = true;
        isCoverLetterUpload = false;
      }
      log.debug(`Upload type: resume=${isResumeUpload}, coverLetter=${isCoverLetterUpload}`);
      const hasUploadedFile = await this.checkExistingUpload(element);
      if (hasUploadedFile) {
        log.debug("File already uploaded");
        if (isResumeUpload && this.resumePath) {
          await this.ensureCorrectResumeSelected(element);
        }
        return true;
      }
      const usedPrevious = await this.tryUsePreviousUpload(element);
      if (usedPrevious) {
        log.info("\u2705 Selected previously uploaded file");
        if (isResumeUpload && this.resumePath) {
          await this.ensureCorrectResumeSelected(element);
        }
        return true;
      }
      let filePath = null;
      if (isResumeUpload) {
        filePath = this.resumePath;
        log.debug("Uploading resume");
      } else if (isCoverLetterUpload) {
        filePath = this.coverLetterPath;
        if (!filePath) {
          log.info("\u{1F4DD} No cover letter provided, generating one with AI...");
          filePath = await this.generateCoverLetterPdf();
        }
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
        try {
          await fileInput.evaluate((el) => el.classList.remove("hidden"));
        } catch {
          log.debug("Could not remove hidden class (may already be visible)");
        }
        log.info(`Uploading file: ${filePath}`);
        await fileInput.setInputFiles(filePath);
        try {
          for (const eventType of ["change", "blur"]) {
            await fileInput.evaluate((el, evt) => {
              el.dispatchEvent(new Event(evt, { bubbles: true }));
            }, eventType);
          }
        } catch {
          log.debug("Could not dispatch events on file input");
        }
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
   * Ensure the correct (newly uploaded) resume is selected in LinkedIn's UI.
   * 
   * LinkedIn shows a list of previously uploaded resumes and may auto-select
   * an older one. This method finds the card matching our resume filename
   * and clicks its radio button to select it.
   * 
   * CRITICAL: This matches the Python bot's _ensure_correct_resume_selected() method
   */
  async ensureCorrectResumeSelected(element) {
    if (!this.resumePath) {
      return;
    }
    try {
      const expectedFilename = path.basename(this.resumePath);
      log.debug(`Ensuring resume is selected: ${expectedFilename}`);
      await this.page.waitForTimeout(500);
      const resumeCards = await element.locator("div.jobs-document-upload-redesign-card__container").all();
      if (resumeCards.length === 0) {
        log.debug("No resume selection cards found, upload likely direct");
        return;
      }
      log.debug(`Found ${resumeCards.length} resume cards`);
      let targetCard = null;
      for (const card of resumeCards) {
        try {
          const filenameElement = card.locator("h3.jobs-document-upload-redesign-card__file-name").first();
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
      try {
        const cardClasses = await targetCard.getAttribute("class") || "";
        if (cardClasses.includes("jobs-document-upload-redesign-card__container--selected")) {
          log.info("\u2705 Correct resume already selected");
          return;
        }
      } catch (e) {
        log.debug(`Could not check selection status: ${e}`);
      }
      try {
        const radioLabel = targetCard.locator("label.jobs-document-upload-redesign-card__toggle-label").first();
        const radioInput = targetCard.locator('input[type="radio"]').first();
        if (await radioLabel.count() > 0) {
          await this.page.evaluate((el) => el.click(), await radioLabel.elementHandle());
          log.info(`\u2705 Selected resume: ${expectedFilename}`);
          await this.page.waitForTimeout(300);
        } else if (await radioInput.count() > 0) {
          await radioInput.click();
          log.info(`\u2705 Selected resume: ${expectedFilename}`);
          await this.page.waitForTimeout(300);
        } else {
          await this.page.evaluate((el) => el.click(), await targetCard.elementHandle());
          log.info(`\u2705 Clicked resume card: ${expectedFilename}`);
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
  async generateCoverLetterPdf() {
    try {
      log.debug("[COVER LETTER] Generating cover letter with GPT");
      const coverLetterText = await this.gptAnswerer.answerTextual(
        "Write a cover letter for this job application"
      );
      if (!coverLetterText || coverLetterText.length < 100) {
        log.warn("[COVER LETTER] Failed to generate cover letter text");
        return null;
      }
      const tempDir = os.tmpdir();
      const timestamp = Date.now();
      const pdfPath = path.join(tempDir, `cover_letter_${timestamp}.pdf`);
      const paragraphs = coverLetterText.split("\n\n").filter((p) => p.trim());
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
  ${paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n")}
</body>
</html>`;
      const context = this.page.context();
      const pdfPage = await context.newPage();
      try {
        await pdfPage.setContent(htmlContent, { waitUntil: "networkidle" });
        await pdfPage.pdf({
          path: pdfPath,
          format: "Letter",
          margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
          printBackground: true
        });
        log.info(`[COVER LETTER] \u2705 Created PDF at: ${pdfPath}`);
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
  cleanup() {
    if (this.generatedCoverLetterPath && fs.existsSync(this.generatedCoverLetterPath)) {
      try {
        fs.unlinkSync(this.generatedCoverLetterPath);
        log.debug(`Cleaned up generated cover letter: ${this.generatedCoverLetterPath}`);
      } catch {
      }
      this.generatedCoverLetterPath = null;
    }
  }
  /**
   * Set the resume path for uploads
   */
  setResumePath(newPath) {
    this.resumePath = newPath;
    log.debug(`Resume path updated: ${newPath}`);
  }
  /**
   * Set the cover letter path for uploads
   */
  setCoverLetterPath(path2) {
    this.coverLetterPath = path2;
  }
}
export {
  FileUploadHandler
};
//# sourceMappingURL=file-upload-handler.js.map
