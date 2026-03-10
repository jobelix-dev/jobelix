import { app } from "electron";
import { Worker } from "worker_threads";
import * as path from "path";
import * as fs from "fs";
import { sanitizeBotApiUrl, getDefaultBotApiUrl } from "./bot-api-url.js";
import { getConfigPath, getResumePath } from "../utils/file-system.js";
import logger from "../utils/logger.js";

// Module-level state
let worker = null;
let isRunning = false;
let startedAt = null;

// Monotonic launch counter — used to detect and discard stale worker events.
// Whenever a new worker is created this counter increments. Every event handler
// captures the counter value at launch time and ignores events from old workers.
let currentLaunchId = 0;

function getBotWorkerPath() {
  return path.join(app.getAppPath(), "build", "bot-runtime", "bot-worker.js");
}

function resolveApiUrl(rawApiUrl) {
  if (rawApiUrl) {
    return sanitizeBotApiUrl(rawApiUrl);
  }
  return getDefaultBotApiUrl(app.isPackaged);
}

function getBotLogPath() {
  const dateStr = new Date().toISOString().split("T")[0];
  return path.join(app.getPath("userData"), "logs", `bot-${dateStr}.log`);
}

function cleanup() {
  worker = null;
  isRunning = false;
  startedAt = null;
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
    return { success: false, error: "Bot runtime not found. Run: npm run build:bot" };
  }

  const userDataPath = app.getPath("userData");
  const configPath = getConfigPath();
  const resumePath = getResumePath();

  if (!fs.existsSync(configPath)) {
    return { success: false, error: `Config file not found: ${configPath}` };
  }
  if (!fs.existsSync(resumePath)) {
    return { success: false, error: `Resume file not found: ${resumePath}` };
  }

  // Assign a launch ID before creating the worker.
  // All event handlers close over this value and return early if it no longer
  // matches currentLaunchId — preventing a terminated worker's events from
  // corrupting state after a rapid stop-then-restart.
  const launchId = ++currentLaunchId;

  logger.info("🚀 Launching bot worker...");

  worker = new Worker(workerPath, {
    workerData: {
      userDataPath,
      token,
      apiUrl,
      configPath,
      resumePath,
      verbose: !app.isPackaged,
    },
  });

  isRunning = true;
  startedAt = Date.now();

  worker.on("message", (msg) => {
    if (currentLaunchId !== launchId) return; // Stale event — ignore

    if (msg.type === "status") {
      try {
        sendBotStatus(msg.payload);
      } catch { /* sender may be destroyed */ }
    } else if (msg.type === "done") {
      logger.info("✅ Bot worker completed");
      cleanup();
    } else if (msg.type === "error") {
      logger.error("Bot worker error:", msg.error);
      try {
        sendBotStatus({ stage: "failed", message: msg.error });
      } catch { /* sender may be destroyed */ }
      cleanup();
    }
  });

  worker.on("error", (err) => {
    if (currentLaunchId !== launchId) return; // Stale event — ignore
    logger.error("Worker error:", err.message);
    try {
      sendBotStatus({ stage: "failed", message: err.message });
    } catch { /* sender may be destroyed */ }
    cleanup();
  });

  worker.on("exit", (code) => {
    if (currentLaunchId !== launchId) return; // Stale exit from a previous launch — ignore
    if (code !== 0) logger.warn(`Bot worker exited with code ${code}`);
    // Notify the renderer immediately so the UI doesn't have to wait for the
    // next polling cycle (2 s) to discover the bot has stopped.
    try {
      sendBotStatus({ stage: "stopped", message: "Bot process exited" });
    } catch { /* sender may be destroyed */ }
    cleanup();
  });

  return { success: true };
}

async function stopNodeBot() {
  if (!worker) return { success: true };
  logger.info("🛑 Requesting bot stop...");
  worker.postMessage({ type: "stop" });
  return { success: true };
}

async function forceStopBot() {
  if (!worker) return { success: true };
  logger.info("🛑 Force-terminating bot worker...");
  try {
    await worker.terminate();
    // cleanup() will also be called from the 'exit' event handler (idempotent).
    // Call it here too so getBotStatus() reflects the stop immediately.
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

export {
  forceStopBot,
  getBotLogPath,
  getBotStatus,
  isBotRunning,
  launchNodeBot,
  stopNodeBot,
};
