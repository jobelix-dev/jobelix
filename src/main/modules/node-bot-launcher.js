import { app } from "electron";
import { Worker } from "worker_threads";
import * as path from "path";
import * as fs from "fs";
import { sanitizeBotApiUrl, getDefaultBotApiUrl } from "./bot-api-url.js";
import logger from "../utils/logger.js";
let worker = null;
let isRunning = false;
let startedAt = null;
function getBotWorkerPath() {
  return path.join(app.getAppPath(), "build", "bot-runtime", "bot-worker.js");
}
function getDataFolderPath() {
  return path.join(app.getPath("userData"), "data_folder");
}
function resolveApiUrl(rawApiUrl) {
  if (rawApiUrl) {
    return sanitizeBotApiUrl(rawApiUrl);
  }
  return getDefaultBotApiUrl(app.isPackaged);
}
function getBotLogPath() {
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return path.join(app.getPath("userData"), "logs", `bot-${dateStr}.log`);
}
async function launchNodeBot(token, sendBotStatus, rawApiUrl) {
  if (isRunning || worker) {
    return { success: false, error: "Bot is already running" };
  }
  if (!token || token.length !== 64 || !/^[0-9a-fA-F]+$/.test(token)) {
    return { success: false, error: "Invalid token format" };
  }
  const apiUrl = resolveApiUrl(rawApiUrl);
  if (!apiUrl) {
    return { success: false, error: "Invalid or untrusted API URL" };
  }
  const workerPath = getBotWorkerPath();
  if (!fs.existsSync(workerPath)) {
    return {
      success: false,
      error: "Bot runtime not found. Run: npm run build:bot"
    };
  }
  const userDataPath = app.getPath("userData");
  const dataFolder = getDataFolderPath();
  const configPath = path.join(dataFolder, "config.yaml");
  const resumePath = path.join(dataFolder, "resume.yaml");
  if (!fs.existsSync(configPath)) {
    return { success: false, error: `Config file not found: ${configPath}` };
  }
  if (!fs.existsSync(resumePath)) {
    return { success: false, error: `Resume file not found: ${resumePath}` };
  }
  logger.info("\u{1F680} Launching bot worker...");
  worker = new Worker(workerPath, {
    workerData: {
      userDataPath,
      token,
      apiUrl,
      configPath,
      resumePath,
      verbose: !app.isPackaged
    }
  });
  isRunning = true;
  startedAt = Date.now();
  worker.on("message", (msg) => {
    if (msg.type === "status") {
      try {
        sendBotStatus(msg.payload);
      } catch {
      }
    } else if (msg.type === "done") {
      logger.info("\u2705 Bot worker completed");
      cleanup();
    } else if (msg.type === "error") {
      logger.error("Bot worker error:", msg.error);
      try {
        sendBotStatus({ stage: "failed", message: msg.error });
      } catch {
      }
      cleanup();
    }
  });
  worker.on("error", (err) => {
    logger.error("Worker error:", err.message);
    try {
      sendBotStatus({ stage: "failed", message: err.message });
    } catch {
    }
    cleanup();
  });
  worker.on("exit", (code) => {
    if (code !== 0) logger.warn(`Bot worker exited with code ${code}`);
    cleanup();
  });
  return { success: true };
}
async function stopNodeBot() {
  if (!worker) return { success: true };
  logger.info("\u{1F6D1} Requesting bot stop...");
  worker.postMessage({ type: "stop" });
  return { success: true };
}
async function forceStopBot() {
  if (!worker) return { success: true };
  logger.info("\u{1F6D1} Force-terminating bot worker...");
  try {
    await worker.terminate();
    cleanup();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Force stop failed:", msg);
    return { success: false, error: msg };
  }
}
function isBotRunning() {
  return isRunning;
}
function getBotStatus() {
  return { running: isRunning, pid: null, startedAt, stats: null };
}
function cleanup() {
  worker = null;
  isRunning = false;
  startedAt = null;
}
export {
  forceStopBot,
  getBotLogPath,
  getBotStatus,
  isBotRunning,
  launchNodeBot,
  stopNodeBot
};
