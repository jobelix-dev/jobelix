/**
 * Bot Worker Thread Entry Point
 *
 * Runs the LinkedIn bot inside a Node.js worker thread so that Playwright /
 * Chromium work is fully isolated from the Electron main process.
 *
 * Benefits:
 * - A Playwright hang or crash cannot freeze the app UI
 * - The bot can be force-terminated with worker.terminate() without touching
 *   the main process
 * - No Electron APIs needed here — all context is passed via workerData
 *
 * Communication protocol:
 *   Main → Worker  { type: 'stop' } | { type: 'force-stop' }
 *   Worker → Main  { type: 'status', payload: StatusPayload }
 *                  { type: 'done' }
 *                  { type: 'error', error: string }
 */

import { workerData, parentPort, isMainThread } from 'worker_threads';
import { setUserDataPath } from './utils/paths';
import { statusReporter } from './utils/status-reporter';
import { LinkedInBot } from './index';
import type { BotOptions } from './index';
import type { StatusPayload } from './utils/status-reporter';

if (isMainThread) {
  throw new Error('bot-worker.ts must be run as a worker thread, not as the main thread');
}

// ---------------------------------------------------------------------------
// Bootstrap: inject context that normally comes from Electron's `app` module
// ---------------------------------------------------------------------------

const { userDataPath, token, apiUrl, configPath, resumePath, chromiumPath, verbose } =
  workerData as BotOptions & { userDataPath: string };

setUserDataPath(userDataPath);

statusReporter.setEmitter((payload: StatusPayload) => {
  parentPort!.postMessage({ type: 'status', payload });
});

// ---------------------------------------------------------------------------
// Handle stop/force-stop commands from the main thread
// ---------------------------------------------------------------------------

let bot: LinkedInBot | null = null;

parentPort!.on('message', async (msg: { type: string }) => {
  if (msg.type === 'stop' && bot) {
    await bot.stop();
  } else if (msg.type === 'force-stop') {
    process.exit(0);
  }
});

// ---------------------------------------------------------------------------
// Run the bot
// ---------------------------------------------------------------------------

async function run() {
  bot = new LinkedInBot();

  await bot.initialize({
    token,
    apiUrl,
    configPath,
    resumePath,
    chromiumPath,
    verbose,
  });

  await bot.start();

  parentPort!.postMessage({ type: 'done' });
}

run().catch((err: Error) => {
  parentPort!.postMessage({ type: 'error', error: err.message });
});
