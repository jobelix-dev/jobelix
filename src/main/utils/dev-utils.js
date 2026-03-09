/**
 * Development utilities
 * Helper functions for development mode
 */

import net from 'net';
import { URLS, TIMING } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Probe a TCP port once. Resolves true if connected, false on error/timeout.
 */
function probePort(port, host, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}

/**
 * Wait for Next.js development server to accept TCP connections.
 *
 * Uses a raw TCP probe instead of HTTP fetch so we don't block on page
 * compilation (~2-3s). Once the port is open, Electron loads the window
 * immediately — compilation happens while the user sees the loading screen.
 */
export async function waitForNextJs(
  url = URLS.DEVELOPMENT,
  maxAttempts = TIMING.NEXT_JS_WAIT.MAX_ATTEMPTS,
  delayMs = TIMING.NEXT_JS_WAIT.DELAY_MS
) {
  const parsed = new URL(url);
  const port = Number(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80);
  const host = parsed.hostname;

  logger.info(`Waiting for Next.js server at ${url}...`);

  for (let i = 0; i < maxAttempts; i++) {
    if (await probePort(port, host)) {
      logger.success(`Next.js is ready after ${i * delayMs}ms`);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  logger.error('Next.js failed to start in time');
  return false;
}
