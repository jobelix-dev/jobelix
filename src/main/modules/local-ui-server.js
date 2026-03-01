/**
 * Local UI Server - starts bundled Next.js standalone server for packaged app
 */

import { app } from 'electron';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { spawn } from 'child_process';
import logger from '../utils/logger.js';
import { URLS } from '../config/constants.js';

const LOCAL_HOST = '127.0.0.1';
const PORT_START = 43100;
const PORT_END = 43199;
const DEV_STARTUP_TIMEOUT_MS = 20000;
const PACKAGED_STARTUP_TIMEOUT_MS = 45000;
const HEALTH_POLL_MS = 200;
const STARTUP_ATTEMPTS = 2;
const OUTPUT_TAIL_LIMIT = 40;

let localServerProcess = null;
let localUiUrl = null;
let startupPromise = null;
let lastSuccessfulPort = PORT_START;

function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'next', 'standalone');
  }
  return path.join(process.cwd(), '.next', 'standalone');
}

function getStandaloneEntry() {
  return path.join(getStandaloneDir(), 'server.js');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStartupTimeoutMs() {
  return app.isPackaged ? PACKAGED_STARTUP_TIMEOUT_MS : DEV_STARTUP_TIMEOUT_MS;
}

function rememberOutputLine(outputTail, line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return;

  outputTail.push(trimmed);
  if (outputTail.length > OUTPUT_TAIL_LIMIT) {
    outputTail.splice(0, outputTail.length - OUTPUT_TAIL_LIMIT);
  }
}

function captureProcessOutput(outputTail, chunk) {
  const lines = String(chunk || '').split(/\r?\n/g);
  for (const line of lines) {
    rememberOutputLine(outputTail, line);
  }
}

function describeStartupFailure(reason, outputTail) {
  if (!outputTail.length) {
    return reason;
  }

  return `${reason}\nRecent local UI output:\n${outputTail.join('\n')}`;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.on('error', () => resolve(false));
    server.listen(port, LOCAL_HOST, () => {
      server.close(() => resolve(true));
    });
  });
}

function isPortInRange(port) {
  return Number.isInteger(port) && port >= PORT_START && port <= PORT_END;
}

async function findOpenPort(preferredPort) {
  if (isPortInRange(preferredPort)) {
    if (await isPortAvailable(preferredPort)) return preferredPort;
  }

  for (let port = PORT_START; port <= PORT_END; port += 1) {
    if (port === preferredPort) continue;
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found in range ${PORT_START}-${PORT_END}`);
}

// Use a raw TCP probe instead of fetch(). This keeps startup independent from
// page render timing and from any Electron/Chromium networking quirks.
async function waitForServerListening(url, childProcess) {
  const parsed = new URL(url);
  const port = Number.parseInt(parsed.port, 10);
  const deadline = Date.now() + getStartupTimeoutMs();

  return new Promise((resolve, reject) => {
    let settled = false;
    let retryTimer = null;

    const cleanup = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      if (childProcess) {
        childProcess.off('exit', handleExit);
        childProcess.off('error', handleError);
      }
    };

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };

    const handleExit = (code, signal) => {
      finish(
        reject,
        new Error(`Local UI server exited before it became ready (code=${code}, signal=${signal ?? 'none'})`)
      );
    };

    const handleError = (error) => {
      finish(reject, error instanceof Error ? error : new Error(String(error)));
    };

    const probe = () => {
      if (settled) return;

      if (Date.now() >= deadline) {
        finish(reject, new Error(`Timed out waiting for local UI server to accept connections at ${url}`));
        return;
      }

      const socket = net.createConnection({
        host: parsed.hostname,
        port,
      });

      let socketDone = false;
      const closeSocket = () => {
        if (socketDone) return false;
        socketDone = true;
        socket.destroy();
        return true;
      };

      const scheduleRetry = () => {
        if (!closeSocket()) return;
        if (settled) return;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          probe();
        }, HEALTH_POLL_MS);
      };

      socket.once('connect', () => {
        if (!closeSocket()) return;
        finish(resolve);
      });
      socket.once('error', scheduleRetry);
      socket.setTimeout(HEALTH_POLL_MS, scheduleRetry);
    };

    if (childProcess) {
      childProcess.once('exit', handleExit);
      childProcess.once('error', handleError);
    }

    probe();
  });
}

function stopProcessIfRunning(processRef) {
  if (!processRef || processRef.killed) {
    return;
  }

  try {
    processRef.kill();
  } catch {
    // Best-effort shutdown.
  }
}

export async function startLocalUiServer() {
  if (localUiUrl) {
    return localUiUrl;
  }

  if (startupPromise) {
    return startupPromise;
  }

  startupPromise = (async () => {
    const standaloneDir = getStandaloneDir();
    const entryPath = getStandaloneEntry();
    let nextPreferredPort = lastSuccessfulPort;
    let lastError = null;

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Bundled UI entry not found: ${entryPath}`);
    }

    for (let attempt = 1; attempt <= STARTUP_ATTEMPTS; attempt += 1) {
      const port = await findOpenPort(nextPreferredPort);
      const url = `http://${LOCAL_HOST}:${port}/desktop`;
      const backendOrigin = URLS.PRODUCTION_ORIGIN || URLS.PRODUCTION.replace(/\/desktop$/, '');
      const outputTail = [];

      logger.info(
        `Starting local UI server from: ${standaloneDir} ` +
        `(attempt ${attempt}/${STARTUP_ATTEMPTS}, port ${port})`
      );

      const child = spawn(
        process.execPath,
        [entryPath],
        {
          cwd: standaloneDir,
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            NODE_ENV: 'production',
            HOSTNAME: LOCAL_HOST,
            PORT: String(port),
            NEXT_DESKTOP_PROXY_API: '1',
            NEXT_DESKTOP_BACKEND_ORIGIN: backendOrigin,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        }
      );

      localServerProcess = child;

      child.once('exit', (code, signal) => {
        logger.warn(`Local UI server exited (code=${code}, signal=${signal})`);
        if (localServerProcess === child) {
          localServerProcess = null;
          localUiUrl = null;
        }
      });

      child.once('error', (error) => {
        rememberOutputLine(outputTail, `spawn error: ${error.message}`);
        logger.error(`Local UI server process error: ${error.message}`);
      });

      if (child.stdout) {
        child.stdout.on('data', (chunk) => {
          captureProcessOutput(outputTail, chunk);
          if (!app.isPackaged) {
            logger.debug(`[Local UI] ${String(chunk).trim()}`);
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (chunk) => {
          captureProcessOutput(outputTail, chunk);
          logger.warn(`[Local UI] ${String(chunk).trim()}`);
        });
      }

      try {
        await waitForServerListening(url, child);
        localUiUrl = url;
        lastSuccessfulPort = port;
        logger.success(`Local UI server ready at ${url}`);
        return url;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const detailedReason = describeStartupFailure(reason, outputTail);
        lastError = new Error(detailedReason);
        logger.error(`Local UI startup attempt ${attempt} failed: ${detailedReason}`);

        if (localServerProcess === child) {
          stopProcessIfRunning(child);
          localServerProcess = null;
          localUiUrl = null;
        }

        nextPreferredPort = port + 1;
        if (attempt < STARTUP_ATTEMPTS) {
          await wait(250);
        }
      }
    }

    throw lastError || new Error('Failed to start local UI server');
  })();

  try {
    return await startupPromise;
  } finally {
    startupPromise = null;
  }
}

export function stopLocalUiServer() {
  startupPromise = null;

  if (!localServerProcess || localServerProcess.killed) {
    return;
  }

  logger.info('Stopping local UI server...');
  stopProcessIfRunning(localServerProcess);
  localServerProcess = null;
  localUiUrl = null;
}

export async function restartLocalUiServer() {
  stopLocalUiServer();
  await wait(150);
  return startLocalUiServer();
}
