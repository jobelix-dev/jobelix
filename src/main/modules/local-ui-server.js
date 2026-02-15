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
const HEALTH_TIMEOUT_MS = 20000;
const HEALTH_POLL_MS = 200;

let localServerProcess = null;
let localUiUrl = null;
let startupPromise = null;

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

async function findOpenPort() {
  for (let port = PORT_START; port <= PORT_END; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found in range ${PORT_START}-${PORT_END}`);
}

async function waitForServerReady(url) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    // eslint-disable-next-line no-await-in-loop
    await wait(HEALTH_POLL_MS);
  }

  throw new Error(`Timed out waiting for local UI server at ${url}`);
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

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Bundled UI entry not found: ${entryPath}`);
    }

    const port = await findOpenPort();
    const url = `http://${LOCAL_HOST}:${port}/desktop`;
    const backendOrigin = URLS.PRODUCTION_ORIGIN || URLS.PRODUCTION.replace(/\/desktop$/, '');

    logger.info(`Starting local UI server from: ${standaloneDir}`);

    localServerProcess = spawn(
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
        stdio: app.isPackaged ? 'ignore' : 'pipe',
        windowsHide: true,
      }
    );

    localServerProcess.once('exit', (code, signal) => {
      logger.warn(`Local UI server exited (code=${code}, signal=${signal})`);
      localServerProcess = null;
      localUiUrl = null;
    });

    if (!app.isPackaged && localServerProcess.stdout) {
      localServerProcess.stdout.on('data', (chunk) => {
        logger.debug(`[Local UI] ${String(chunk).trim()}`);
      });
    }

    if (!app.isPackaged && localServerProcess.stderr) {
      localServerProcess.stderr.on('data', (chunk) => {
        logger.warn(`[Local UI] ${String(chunk).trim()}`);
      });
    }

    await waitForServerReady(url);
    localUiUrl = url;
    logger.success(`Local UI server ready at ${url}`);
    return url;
  })();

  try {
    return await startupPromise;
  } finally {
    startupPromise = null;
  }
}

export function stopLocalUiServer() {
  if (!localServerProcess || localServerProcess.killed) {
    return;
  }

  logger.info('Stopping local UI server...');
  localServerProcess.kill();
  localServerProcess = null;
  localUiUrl = null;
}
