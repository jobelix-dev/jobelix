import * as fs from "fs";
import { createLogger } from "./logger.js";
const log = createLogger("CSVUtils");
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}
function escapeCSVValue(value) {
  return `"${value.replace(/"/g, '""')}"`;
}
function formatCSVLine(values) {
  return values.map(escapeCSVValue).join(",") + "\n";
}
function loadSavedAnswers(filePath) {
  const answers = [];
  if (!fs.existsSync(filePath)) {
    log.debug(`No saved answers file found: ${filePath}`);
    return answers;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    for (const line of lines) {
      const parts = parseCSVLine(line);
      if (parts.length >= 3) {
        const [questionType, questionText, answer] = parts;
        if (!answer || answer.length <= 2) continue;
        const answerLower = answer.toLowerCase();
        if (answerLower.startsWith("select") || answerLower.startsWith("choose")) continue;
        if (["option", "n/a", "none", "null"].includes(answerLower)) continue;
        answers.push({ questionType, questionText, answer });
      }
    }
    log.info(`Loaded ${answers.length} saved answers`);
  } catch (error) {
    log.error(`Failed to load saved answers: ${error}`);
  }
  return answers;
}
function saveAnswer(filePath, existing, questionType, questionText, answer) {
  const exists = existing.some(
    (a) => a.questionType.toLowerCase() === questionType.toLowerCase() && a.questionText.toLowerCase() === questionText.toLowerCase()
  );
  if (exists) {
    return false;
  }
  const line = formatCSVLine([questionType, questionText, answer]);
  fs.appendFileSync(filePath, line, "utf-8");
  return true;
}
function appendJobResult(filePath, company, title, link, location) {
  const line = formatCSVLine([company, title, link, location]);
  fs.appendFileSync(filePath, line, "utf-8");
}
export {
  appendJobResult,
  escapeCSVValue,
  formatCSVLine,
  loadSavedAnswers,
  parseCSVLine,
  saveAnswer
};
//# sourceMappingURL=csv-utils.js.map
