import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { createLogger } from "../../../utils/logger.js";
const log = createLogger("CoverLetterGenerator");
const MIN_COVER_LETTER_LENGTH = 100;
let generatedPath = null;
async function generateCoverLetterPdf(page, answerFn) {
  try {
    log.debug("[COVER LETTER] Generating cover letter with GPT");
    const coverLetterText = await answerFn("Write a cover letter for this job application");
    if (!coverLetterText || coverLetterText.length < MIN_COVER_LETTER_LENGTH) {
      log.warn("[COVER LETTER] Failed to generate cover letter text");
      return null;
    }
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const pdfPath = path.join(tempDir, `cover_letter_${timestamp}.pdf`);
    const htmlContent = formatCoverLetterHtml(coverLetterText);
    const context = page.context();
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
      generatedPath = pdfPath;
      return pdfPath;
    } finally {
      await pdfPage.close();
    }
  } catch (error) {
    log.error(`[COVER LETTER] Failed to generate PDF: ${error}`);
    return null;
  }
}
function formatCoverLetterHtml(text) {
  const paragraphs = text.split("\n\n").filter((p) => p.trim());
  return `<!DOCTYPE html>
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
}
function cleanupGeneratedCoverLetter() {
  if (generatedPath && fs.existsSync(generatedPath)) {
    try {
      fs.unlinkSync(generatedPath);
      log.debug(`Cleaned up generated cover letter: ${generatedPath}`);
    } catch {
    }
    generatedPath = null;
  }
}
function getGeneratedCoverLetterPath() {
  return generatedPath;
}
export {
  cleanupGeneratedCoverLetter,
  generateCoverLetterPdf,
  getGeneratedCoverLetterPath
};
//# sourceMappingURL=cover-letter-generator.js.map
