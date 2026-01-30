import { createLogger } from "../../../utils/logger.js";
const log = createLogger("DocumentTypeDetector");
const COVER_LETTER_ID_KEYWORDS = [
  "cover",
  "coverletter",
  "cover-letter",
  // English
  "lettre",
  "motivation",
  // French (lettre de motivation)
  "anschreiben",
  "bewerbung",
  // German
  "carta",
  "presentacion",
  // Spanish (carta de presentación)
  "lettera",
  "presentazione",
  // Italian (lettera di presentazione)
  "carta-apresentacao"
  // Portuguese
];
const COVER_LETTER_TEXT_KEYWORDS = [
  "cover letter",
  "coverletter",
  // English
  "lettre de motivation",
  "lettre motivation",
  // French
  "anschreiben",
  "motivationsschreiben",
  // German
  "carta de presentaci\xF3n",
  "carta presentaci\xF3n",
  // Spanish
  "lettera di presentazione",
  // Italian
  "carta de apresenta\xE7\xE3o"
  // Portuguese
];
const RESUME_TEXT_KEYWORDS = [
  "resume",
  "cv",
  "lebenslauf",
  "curriculum"
];
async function detectDocumentType(fileInput, questionText) {
  let result = {
    isResumeUpload: true,
    isCoverLetterUpload: false,
    detectedBy: "default"
  };
  try {
    if (await fileInput.count() > 0) {
      const urnResult = await detectByUrnPattern(fileInput);
      if (urnResult) return urnResult;
      const attrResult = await detectByAttributes(fileInput);
      if (attrResult) return attrResult;
    }
  } catch {
  }
  const textResult = detectByQuestionText(questionText);
  if (textResult) return textResult;
  return result;
}
async function detectByUrnPattern(fileInput) {
  try {
    const inputId = (await fileInput.getAttribute("id") || "").toLowerCase();
    log.debug(`File input id: "${inputId}"`);
    const idMatch = inputId.match(/upload-([a-z-]+)-urn/);
    if (idMatch) {
      const docType = idMatch[1];
      log.debug(`Detected document type from URN: "${docType}"`);
      if (docType.includes("cover") || docType.includes("letter")) {
        return { isResumeUpload: false, isCoverLetterUpload: true, detectedBy: "urn-pattern" };
      }
      if (docType.includes("resume") || docType.includes("cv")) {
        return { isResumeUpload: true, isCoverLetterUpload: false, detectedBy: "urn-pattern" };
      }
    }
    if (inputId.includes("jobs-document-upload-file-input-urn") && !inputId.includes("upload-resume")) {
      log.debug('No "upload-resume" in ID - treating as cover letter/additional document');
      return { isResumeUpload: false, isCoverLetterUpload: true, detectedBy: "urn-pattern" };
    }
  } catch {
  }
  return null;
}
async function detectByAttributes(fileInput) {
  try {
    const inputId = (await fileInput.getAttribute("id") || "").toLowerCase();
    const inputName = (await fileInput.getAttribute("name") || "").toLowerCase();
    const ariaLabel = (await fileInput.getAttribute("aria-label") || "").toLowerCase();
    log.debug(`File input - id: "${inputId}", name: "${inputName}", aria-label: "${ariaLabel}"`);
    const combined = `${inputId} ${inputName} ${ariaLabel}`;
    if (COVER_LETTER_ID_KEYWORDS.some((k) => combined.includes(k))) {
      return { isResumeUpload: false, isCoverLetterUpload: true, detectedBy: "attribute" };
    }
  } catch {
  }
  return null;
}
function detectByQuestionText(questionText) {
  const lowerQuestion = questionText.toLowerCase();
  if (COVER_LETTER_TEXT_KEYWORDS.some((k) => lowerQuestion.includes(k))) {
    return { isResumeUpload: false, isCoverLetterUpload: true, detectedBy: "question-text" };
  }
  if (RESUME_TEXT_KEYWORDS.some((k) => lowerQuestion.includes(k))) {
    return { isResumeUpload: true, isCoverLetterUpload: false, detectedBy: "question-text" };
  }
  return null;
}
export {
  detectDocumentType
};
//# sourceMappingURL=document-type-detector.js.map
