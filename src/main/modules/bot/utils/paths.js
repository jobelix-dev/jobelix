import * as path from "path";
import * as fs from "fs";
import { app } from "electron";
function getUserDataPath() {
  return app.getPath("userData");
}
function getDataFolderPath() {
  const dataPath = path.join(getUserDataPath(), "data");
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
}
function getOutputFolderPath() {
  const outputPath = path.join(getUserDataPath(), "output");
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  return outputPath;
}
function getTailoredResumesPath() {
  const resumesPath = path.join(getUserDataPath(), "tailored_resumes");
  if (!fs.existsSync(resumesPath)) {
    fs.mkdirSync(resumesPath, { recursive: true });
  }
  return resumesPath;
}
function getDebugHtmlPath() {
  const debugPath = path.join(getUserDataPath(), "debug_html");
  if (!fs.existsSync(debugPath)) {
    fs.mkdirSync(debugPath, { recursive: true });
  }
  return debugPath;
}
function getChromeProfilePath() {
  const chromePath = path.join(getUserDataPath(), "chrome_profile");
  if (!fs.existsSync(chromePath)) {
    fs.mkdirSync(chromePath, { recursive: true });
  }
  return chromePath;
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
  getDataFolderPath();
  getOutputFolderPath();
  getTailoredResumesPath();
  getDebugHtmlPath();
  getChromeProfilePath();
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
  getChromeProfilePath,
  getChromiumPath,
  getConfigPath,
  getDataFolderPath,
  getDebugHtmlPath,
  getOldQuestionsPath,
  getOutputFolderPath,
  getResumePath,
  getTailoredResumesPath,
  getUserDataPath
};
//# sourceMappingURL=paths.js.map
