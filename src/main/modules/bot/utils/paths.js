import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { app } from "electron";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function getResourcesPath() {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.join(__dirname, "..", "..", "..", "..", "..", "resources");
}
function getBotResourcesPath() {
  const platform = process.platform === "darwin" ? "mac" : process.platform === "win32" ? "win" : "linux";
  return path.join(getResourcesPath(), platform);
}
function getDataFolderPath() {
  return path.join(getBotResourcesPath(), "main", "data_folder");
}
function getOutputFolderPath() {
  const outputPath = path.join(getDataFolderPath(), "output");
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  return outputPath;
}
function getTailoredResumesPath() {
  const resumesPath = path.join(getBotResourcesPath(), "main", "tailored_resumes");
  if (!fs.existsSync(resumesPath)) {
    fs.mkdirSync(resumesPath, { recursive: true });
  }
  return resumesPath;
}
function getDebugHtmlPath() {
  const debugPath = path.join(getBotResourcesPath(), "main", "debug_html");
  if (!fs.existsSync(debugPath)) {
    fs.mkdirSync(debugPath, { recursive: true });
  }
  return debugPath;
}
function getChromeProfilePath() {
  return path.join(getBotResourcesPath(), "main", "chrome_profile");
}
function getConfigPath() {
  return path.join(getDataFolderPath(), "config.yaml");
}
function getResumePath() {
  return path.join(getDataFolderPath(), "resume.yaml");
}
function getOldQuestionsPath() {
  return path.join(getOutputFolderPath(), "old_Questions.csv");
}
function ensureDirectories() {
  getOutputFolderPath();
  getTailoredResumesPath();
  getDebugHtmlPath();
}
function getChromiumPath() {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath) {
    throw new Error("PLAYWRIGHT_BROWSERS_PATH is not set. The Electron app must provide the Playwright browsers path.");
  }
  const entries = fs.readdirSync(browsersPath);
  const chromiumDir = entries.find((e) => e.startsWith("chromium-"));
  if (!chromiumDir) {
    throw new Error(`No Chromium installation found in: ${browsersPath}`);
  }
  const platform = process.platform;
  let execPath;
  if (platform === "darwin") {
    execPath = path.join(browsersPath, chromiumDir, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium");
  } else if (platform === "win32") {
    execPath = path.join(browsersPath, chromiumDir, "chrome-win", "chrome.exe");
  } else {
    execPath = path.join(browsersPath, chromiumDir, "chrome-linux", "chrome");
  }
  if (!fs.existsSync(execPath)) {
    throw new Error(`Chromium executable not found at: ${execPath}`);
  }
  return execPath;
}
export {
  ensureDirectories,
  getBotResourcesPath,
  getChromeProfilePath,
  getChromiumPath,
  getConfigPath,
  getDataFolderPath,
  getDebugHtmlPath,
  getOldQuestionsPath,
  getOutputFolderPath,
  getResourcesPath,
  getResumePath,
  getTailoredResumesPath
};
//# sourceMappingURL=paths.js.map
