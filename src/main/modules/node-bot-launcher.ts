/**
 * Node.js Bot Launcher — Worker-Thread Edition
 *
 * Spawns the LinkedIn bot inside a Node.js worker thread so that Playwright /
 * Chromium execution is fully isolated from the Electron main process.
 *
 * Before this change the bot ran directly in the main thread.  A Playwright
 * hang or an unhandled rejection would freeze the entire Electron UI.
 * With a Worker the worst-case recovery is `worker.terminate()`.
 *
 * Interface (matches what ipc-handlers.js expects):
 *   launchNodeBot(token, sendStatus, apiUrl)
 *   stopNodeBot()
 *   forceStopBot()
 *   getBotStatus()  →  { running, pid, startedAt, stats }
 *   getBotLogPath() →  string | null
 *   isBotRunning()  →  boolean
 */

import { app } from 'electron';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import { sanitizeBotApiUrl, getDefaultBotApiUrl } from './bot-api-url.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let worker: Worker | null = null;
let isRunning = false;
let startedAt: number | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBotWorkerPath(): string {
  return path.join(app.getAppPath(), 'build', 'bot-runtime', 'bot-worker.js');
}

function getDataFolderPath(): string {
  return path.join(app.getPath('userData'), 'data_folder');
}

function resolveApiUrl(rawApiUrl?: string): string | null {
  if (rawApiUrl) {
    return sanitizeBotApiUrl(rawApiUrl);
  }
  return getDefaultBotApiUrl(app.isPackaged);
}

function getBotLogPath(): string | null {
  const dateStr = new Date().toISOString().split('T')[0];
  return path.join(app.getPath('userData'), 'logs', `bot-${dateStr}.log`);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export async function launchNodeBot(
  token: string,
  sendBotStatus: (payload: unknown) => void,
  rawApiUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  if (isRunning || worker) {
    return { success: false, error: 'Bot is already running' };
  }

  if (!token || token.length !== 64 || !/^[0-9a-fA-F]+$/.test(token)) {
    return { success: false, error: 'Invalid token format' };
  }

  const apiUrl = resolveApiUrl(rawApiUrl);
  if (!apiUrl) {
    return { success: false, error: 'Invalid or untrusted API URL' };
  }

  const workerPath = getBotWorkerPath();
  if (!fs.existsSync(workerPath)) {
    return {
      success: false,
      error: 'Bot runtime not found. Run: npm run build:bot',
    };
  }

  const userDataPath = app.getPath('userData');
  const dataFolder = getDataFolderPath();
  const configPath = path.join(dataFolder, 'config.yaml');
  const resumePath = path.join(dataFolder, 'resume.yaml');

  if (!fs.existsSync(configPath)) {
    return { success: false, error: `Config file not found: ${configPath}` };
  }
  if (!fs.existsSync(resumePath)) {
    return { success: false, error: `Resume file not found: ${resumePath}` };
  }

  logger.info('🚀 Launching bot worker...');

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

  worker.on('message', (msg: { type: string; payload?: unknown; error?: string }) => {
    if (msg.type === 'status') {
      try { sendBotStatus(msg.payload); } catch { /* renderer may be gone */ }
    } else if (msg.type === 'done') {
      logger.info('✅ Bot worker completed');
      cleanup();
    } else if (msg.type === 'error') {
      logger.error('Bot worker error:', msg.error);
      try { sendBotStatus({ stage: 'failed', message: msg.error }); } catch { /* ignore */ }
      cleanup();
    }
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err.message);
    try { sendBotStatus({ stage: 'failed', message: err.message }); } catch { /* ignore */ }
    cleanup();
  });

  worker.on('exit', (code) => {
    if (code !== 0) logger.warn(`Bot worker exited with code ${code}`);
    cleanup();
  });

  return { success: true };
}

export async function stopNodeBot(): Promise<{ success: boolean; error?: string }> {
  if (!worker) return { success: true };
  logger.info('🛑 Requesting bot stop...');
  worker.postMessage({ type: 'stop' });
  return { success: true };
}

export async function forceStopBot(): Promise<{ success: boolean; error?: string }> {
  if (!worker) return { success: true };
  logger.info('🛑 Force-terminating bot worker...');
  try {
    await worker.terminate();
    cleanup();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Force stop failed:', msg);
    return { success: false, error: msg };
  }
}

export function isBotRunning(): boolean {
  return isRunning;
}

export function getBotStatus(): { running: boolean; pid: null; startedAt: number | null; stats: null } {
  return { running: isRunning, pid: null, startedAt, stats: null };
}

export { getBotLogPath };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function cleanup() {
  worker = null;
  isRunning = false;
  startedAt = null;
}
