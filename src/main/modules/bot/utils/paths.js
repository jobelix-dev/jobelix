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
    console.warn("[paths] PLAYWRIGHT_BROWSERS_PATH not set - Playwright will use system browser or download one");
    return undefined;
  }
  if (!fs.existsSync(browsersPath)) {
    console.warn(`[paths] Playwright browsers directory does not exist: ${browsersPath}`);
    return undefined;
  }
  let entries;
  try {
    entries = fs.readdirSync(browsersPath);
  } catch (error) {
    console.warn(`[paths] Failed to read browsers directory: ${error}`);
    return undefined;
  }
  const chromiumDir = entries.find((e) => e.startsWith("chromium-"));
  if (!chromiumDir) {
    console.warn(`[paths] No Chromium installation found in: ${browsersPath}`);
    return undefined;
  }
  const platform = process.platform;
  const arch = process.arch;
  const chromiumBase = path.join(browsersPath, chromiumDir);
  const pathCandidates = [];
  if (platform === "darwin") {
    if (arch === "arm64") {
      pathCandidates.push(path.join(chromiumBase, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"));
    }
    pathCandidates.push(path.join(chromiumBase, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"));
  } else if (platform === "win32") {
    if (arch === "x64") {
      pathCandidates.push(path.join(chromiumBase, "chrome-win64", "chrome.exe"));
    }
    pathCandidates.push(path.join(chromiumBase, "chrome-win", "chrome.exe"));
  } else {
    if (arch === "x64") {
      pathCandidates.push(path.join(chromiumBase, "chrome-linux64", "chrome"));
    }
    pathCandidates.push(path.join(chromiumBase, "chrome-linux", "chrome"));
  }
  for (const execPath of pathCandidates) {
    if (fs.existsSync(execPath)) {
      return execPath;
    }
  }
  console.warn(`[paths] Chromium executable not found. Checked paths: ${pathCandidates.join(", ")}`);
  return undefined;
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
