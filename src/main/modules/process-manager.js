/**
 * Process Manager
 * Manages external bot automation process with local IPC communication
 */

import { spawn } from 'child_process';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import kill from 'tree-kill';
import { 
  getBotPath, 
  getBotWorkingDirectory,
  getPlatformName 
} from './platform-utils.js';
import { ensureDirectoryExists, fileExists } from '../utils/file-system.js';
import { SPAWN_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';

// Track active bot process
let activeBotProcess = null;
let statusEmitter = null;  // Store the emitStatus callback

const PLAYWRIGHT_BROWSER_DIR = 'playwright-browsers';

/**
 * Parse bot status from stdout line
 * Bot sends status as [STATUS]{json} lines
 */
function parseBotStatusLine(line, emitStatus) {
  if (!line.startsWith('[STATUS]')) return false;
  
  try {
    const jsonStr = line.substring(8); // Remove '[STATUS]' prefix
    const status = JSON.parse(jsonStr);
    
    logger.debug(`[Bot IPC] Received status: ${status.type}`);
    
    // Forward to renderer based on message type
    switch (status.type) {
      case 'session_start':
        emitBotStatus(emitStatus, {
          stage: 'running',
          message: `Bot started (v${status.bot_version})`,
          stats: status.stats
        });
        break;
        
      case 'heartbeat':
        emitBotStatus(emitStatus, {
          stage: 'running',
          activity: status.activity,
          details: status.details,
          stats: status.stats
        });
        break;
        
      case 'session_complete':
        emitBotStatus(emitStatus, {
          stage: status.success ? 'completed' : 'failed',
          message: status.success ? 'Bot completed successfully' : (status.error_message || 'Bot failed'),
          stats: status.stats
        });
        break;
        
      case 'stopped':
        emitBotStatus(emitStatus, {
          stage: 'stopped',
          message: 'Bot stopped by user',
          stats: status.stats
        });
        break;
    }
    
    return true;
  } catch (err) {
    logger.debug(`[Bot IPC] Failed to parse status: ${err.message}`);
    return false;
  }
}

function emitBotStatus(emitStatus, payload) {
  if (!emitStatus) return;
  try {
    emitStatus(payload);
  } catch (error) {
    logger.warn('Failed to emit bot status update:', error);
  }
}

function getPlaywrightBrowsersPath() {
  return path.join(app.getPath('userData'), PLAYWRIGHT_BROWSER_DIR);
}

function getChromiumExecutableSubpaths() {
  if (process.platform === 'win32') {
    return [path.join('chrome-win', 'chrome.exe'), path.join('chrome-win64', 'chrome.exe')];
  }
  if (process.platform === 'darwin') {
    return [
      path.join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      path.join('chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    ];
  }
  return [path.join('chrome-linux', 'chrome'), path.join('chrome-linux64', 'chrome')];
}

function findExecutableInDir(rootDir, filenames, maxDepth = 4) {
  const queue = [{ dir: rootDir, depth: 0 }];

  while (queue.length) {
    const { dir, depth } = queue.shift();
    if (depth > maxDepth) continue;

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && filenames.includes(entry.name)) {
        return fullPath;
      }
      if (entry.isDirectory()) {
        queue.push({ dir: fullPath, depth: depth + 1 });
      }
    }
  }

  return null;
}

function findChromiumExecutable(playwrightPath) {
  try {
    if (!fs.existsSync(playwrightPath)) return null;
    const entries = fs.readdirSync(playwrightPath, { withFileTypes: true });
    const chromiumDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
      .map((entry) => entry.name);

    const subpaths = getChromiumExecutableSubpaths();
    for (const dir of chromiumDirs) {
      for (const subpath of subpaths) {
        const candidate = path.join(playwrightPath, dir, subpath);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
      const fallback = findExecutableInDir(
        path.join(playwrightPath, dir),
        process.platform === 'win32' ? ['chrome.exe'] : ['chrome', 'Chromium'],
        5
      );
      if (fallback) {
        return fallback;
      }
    }
  } catch (error) {
    logger.warn('Failed to scan Playwright browser directory:', error);
  }

  return null;
}


function resolvePlaywrightCliPath() {
  const require = createRequire(import.meta.url);
  const candidates = [
    'playwright/cli',
    'playwright/cli.js',
    '@playwright/test/cli',
    '@playwright/test/cli.js',
  ];

  for (const candidate of candidates) {
    try {
      return require.resolve(candidate);
    } catch (_) {
      // Try next candidate
    }
  }

  return null;
}

function parseInstallProgress(line) {
  const match = line.match(/(\\d{1,3})%/);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function runInstallCommand(command, args, env, emitStatus) {
  return new Promise((resolve) => {
    let resolved = false;

    // Spawn with completely silent output - detached and ignored stdio
    const child = spawn(command, args, {
      env,
      stdio: 'ignore', // Completely ignore all stdio (stdin, stdout, stderr)
      shell: false,
      windowsHide: true,
      detached: false, // Keep attached but ignore output
    });

    child.on('error', (error) => {
      if (resolved) return;
      resolved = true;
      resolve({
        success: false,
        error,
        spawnFailed: true,
      });
    });

    child.on('close', (code) => {
      if (resolved) return;
      resolved = true;

      if (code === 0) {
        resolve({ success: true });
        return;
      }

      resolve({
        success: false,
        error: new Error(`Playwright install failed with exit code ${code}`),
        spawnFailed: false,
      });
    });
  });
}

async function installPlaywrightChromium(playwrightPath, emitStatus, bundledCliPath) {
  ensureDirectoryExists(playwrightPath);

  const env = {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: playwrightPath,
    // Suppress Playwright progress bars and verbose output
    CI: '1',
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0',
    // Force non-TTY mode to disable progress bars
    FORCE_COLOR: '0',
    NO_COLOR: '1',
  };

  if (bundledCliPath && fs.existsSync(bundledCliPath)) {
    // Use the bundled Node.js that comes with Playwright (no system Node.js required!)
    // The bundled Playwright includes its own Node.js runtime in the driver directory
    const bundledNodePath = path.join(
      path.dirname(bundledCliPath),
      '..',
      process.platform === 'win32' ? 'node.exe' : 'node'
    );
    
    logger.info(`Attempting Playwright install with bundled CLI: ${bundledCliPath}`);
    logger.info(`Using bundled Node.js: ${bundledNodePath}`);
    
    // Verify bundled Node exists
    if (!fs.existsSync(bundledNodePath)) {
      logger.warn(`Bundled Node.js not found at: ${bundledNodePath}`);
    } else {
      const bundledResult = await runInstallCommand(
        bundledNodePath,
        [bundledCliPath, 'install', 'chromium'],
        env,
        emitStatus
      );

      if (bundledResult.success) {
        logger.info('Playwright install succeeded with bundled Node.js');
        return { success: true };
      }

      logger.warn(`Bundled CLI failed: ${bundledResult.error?.message || 'unknown error'}`);
      
      if (!bundledResult.spawnFailed) {
        return {
          success: false,
          error:
            bundledResult.error instanceof Error
              ? bundledResult.error.message
              : 'Playwright install failed',
        };
      }
    }
  }

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const npxArgs = ['playwright', 'install', 'chromium'];
  const npxResult = await runInstallCommand(npxCommand, npxArgs, env, emitStatus);

  if (npxResult.success) {
    return { success: true };
  }

  if (!npxResult.spawnFailed) {
    return {
      success: false,
      error: npxResult.error instanceof Error ? npxResult.error.message : 'Playwright install failed',
    };
  }

  const cliPath = resolvePlaywrightCliPath();
  if (!cliPath) {
    return {
      success: false,
      error: 'Playwright CLI not found. Please install Playwright in the app environment.',
    };
  }

  const nodeEnv = {
    ...env,
    ELECTRON_RUN_AS_NODE: '1',
  };
  const nodeResult = await runInstallCommand(
    process.execPath,
    [cliPath, 'install', 'chromium'],
    nodeEnv,
    emitStatus
  );

  if (nodeResult.success) {
    return { success: true };
  }

  return {
    success: false,
    error: nodeResult.error instanceof Error ? nodeResult.error.message : 'Playwright install failed',
  };
}

async function ensureChromiumInstalled(emitStatus, bundledCliPath) {
  const playwrightPath = getPlaywrightBrowsersPath();
  logger.info(`Playwright browsers path: ${playwrightPath}`);

  emitBotStatus(emitStatus, {
    stage: 'checking',
    message: 'Checking browser...',
  });

  const existingExecutable = findChromiumExecutable(playwrightPath);
  if (existingExecutable) {
    return { success: true, playwrightPath, executablePath: existingExecutable };
  }

  emitBotStatus(emitStatus, {
    stage: 'installing',
    message: 'Preparing browser for first-time setup.',
  });

  const installResult = await installPlaywrightChromium(playwrightPath, emitStatus, bundledCliPath);
  if (!installResult.success) {
    return { success: false, error: installResult.error || 'Playwright install failed', playwrightPath };
  }

  const installedExecutable = findChromiumExecutable(playwrightPath);
  if (!installedExecutable) {
    return {
      success: false,
      error: 'Playwright install completed, but Chromium executable was not found.',
      playwrightPath,
    };
  }

  return { success: true, playwrightPath, executablePath: installedExecutable };
}

/**
 * Launch the bot automation process
 * Spawns bot with stdio pipes for IPC communication
 * @param {string} token - Authentication token for the bot
 * @param {(payload: {stage: string, message?: string, progress?: number, activity?: string, stats?: object}) => void} [emitStatus]
 * @returns {Promise<{success: boolean, message?: string, pid?: number, platform?: string, error?: string}>}
 */
export async function launchBot(token, emitStatus) {
  try {
    if (!token) {
      logger.error('Bot launch failed: Token is required');
      return { success: false, error: 'Token is required' };
    }

    const botPath = getBotPath();
    const botCwd = getBotWorkingDirectory();
    const bundledCliPath = path.join(
      botCwd,
      '_internal',
      'playwright',
      'driver',
      'package',
      'cli.js'
    );

    logger.info('Bot Configuration:');
    logger.info(`  Path: ${botPath}`);
    logger.info(`  Working Directory: ${botCwd}`);
    logger.info(`  Platform: ${getPlatformName()}`);

    // Verify bot executable exists
    if (!fileExists(botPath)) {
      logger.error('Bot executable not found at:', botPath);
      return { 
        success: false, 
        error: `Bot executable not found at: ${botPath}` 
      };
    }

    const browserCheck = await ensureChromiumInstalled(emitStatus, bundledCliPath);
    if (!browserCheck.success) {
      const message = 'Browser install failed. Check network/proxy, then retry.';
      emitBotStatus(emitStatus, { stage: 'installing', message });
      if (browserCheck.error) {
        emitBotStatus(emitStatus, { stage: 'installing', log: browserCheck.error });
      }
      logger.error('Playwright install failed:', browserCheck.error || message);
      return { success: false, error: message };
    }

    // Get backend API URL from environment or use default
    const public_app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://www.jobelix.fr/';
    
    logger.info(`Public app URL: "${public_app_url}"`);

    emitBotStatus(emitStatus, { stage: 'launching', message: 'Launching bot...' });

    // Prepare environment with library search paths
    const internalLibsPath = path.join(botCwd, '_internal');
    const botEnv = {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browserCheck.playwrightPath,
    };

    // Add library search path for bundled dependencies (macOS/Linux)
    if (process.platform === 'darwin') {
      botEnv.DYLD_LIBRARY_PATH = internalLibsPath + (process.env.DYLD_LIBRARY_PATH ? ':' + process.env.DYLD_LIBRARY_PATH : '');
      botEnv.DYLD_FALLBACK_LIBRARY_PATH = internalLibsPath;
    } else if (process.platform === 'linux') {
      botEnv.LD_LIBRARY_PATH = internalLibsPath + (process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : '');
    }

    // Store emitStatus globally for stdout parsing
    statusEmitter = emitStatus;

    // Spawn the bot process with piped stdio for IPC
    const botProcess = spawn(botPath, ['--token', token, '--public_app_url', public_app_url], {
      cwd: botCwd,
      env: botEnv,
      stdio: ['ignore', 'pipe', 'pipe'],  // stdin ignored, stdout/stderr piped for IPC
      detached: false,  // Keep attached for IPC
      windowsHide: true,
    });

    // Track the active bot process
    activeBotProcess = botProcess;

    // Buffer for incomplete lines
    let stdoutBuffer = '';

    // Parse stdout for status messages
    botProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdoutBuffer += chunk;
      
      // Process complete lines
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Try to parse as status message
        if (!parseBotStatusLine(trimmed, emitStatus)) {
          // Regular log line - log it
          logger.info(`[Bot] ${trimmed}`);
        }
      }
    });
    
    // Capture stderr for errors
    botProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        logger.error(`[Bot stderr] ${msg}`);
      }
    });

    botProcess.on('error', (error) => {
      logger.error('[Bot process error]', error);
      emitBotStatus(emitStatus, {
        stage: 'failed',
        message: `Bot error: ${error.message}`
      });
    });

    botProcess.on('exit', (code, signal) => {
      logger.info(`[Bot process exited] Code: ${code}, Signal: ${signal}`);
      
      // Clear active process reference when it exits
      if (activeBotProcess && activeBotProcess.pid === botProcess.pid) {
        activeBotProcess = null;
        statusEmitter = null;
      }
      
      // Emit final status based on exit code
      if (code === 0) {
        emitBotStatus(emitStatus, {
          stage: 'completed',
          message: 'Bot completed successfully'
        });
      } else if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        emitBotStatus(emitStatus, {
          stage: 'stopped',
          message: 'Bot stopped by user'
        });
      } else {
        emitBotStatus(emitStatus, {
          stage: 'failed',
          message: `Bot exited with code ${code}`
        });
      }
    });

    logger.success('Bot process launched successfully');
    logger.info(`  PID: ${botProcess.pid}`);

    emitBotStatus(emitStatus, { stage: 'running', message: 'Bot running.' });

    return {
      success: true,
      message: 'Bot launched successfully',
      pid: botProcess.pid,
      platform: process.platform
    };
  } catch (error) {
    logger.error('Error launching bot:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error launching bot' 
    };
  }
}

/**
 * Stop the currently running bot process
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function stopBot() {
  return new Promise((resolve) => {
    try {
      if (!activeBotProcess || !activeBotProcess.pid) {
        logger.warn('No active bot process to stop');
        logger.info('Debug: activeBotProcess state:', activeBotProcess ? 'exists but no PID' : 'null');
        resolve({ success: false, error: 'No active bot process' });
        return;
      }

      const pid = activeBotProcess.pid;
      logger.info(`Stopping bot process tree with PID: ${pid}`);

      // First try graceful shutdown with SIGTERM
      kill(pid, 'SIGTERM', (error) => {
        if (error) {
          if (error.code === 'ESRCH') {
            logger.warn(`Process ${pid} not found (already stopped)`);
            activeBotProcess = null;
            resolve({ success: true, message: 'Bot process already stopped' });
            return;
          }
          
          logger.warn(`SIGTERM failed for PID ${pid}, trying SIGKILL immediately: ${error.message}`);
          
          // Force kill with SIGKILL immediately if SIGTERM fails
          kill(pid, 'SIGKILL', (killError) => {
            if (killError && killError.code !== 'ESRCH') {
              logger.error(`Failed to kill process tree ${pid}:`, killError);
              resolve({
                success: false,
                error: killError.message || 'Failed to stop bot process'
              });
            } else {
              logger.success(`Bot process tree ${pid} force-killed successfully`);
              activeBotProcess = null;
              resolve({ success: true, message: 'Bot stopped successfully (force killed)' });
            }
          });
          return;
        }

        // SIGTERM was sent successfully - wait 2 seconds then force kill if still alive
        logger.info(`SIGTERM sent to process tree ${pid}, waiting 2 seconds for graceful shutdown...`);
        
        setTimeout(() => {
          try {
            // Check if process is still alive
            process.kill(pid, 0);
            
            // Process is still alive after 2 seconds, force kill it
            logger.warn(`Process ${pid} still alive after SIGTERM, sending SIGKILL`);
            
            kill(pid, 'SIGKILL', (killError) => {
              if (killError && killError.code !== 'ESRCH') {
                logger.error(`Failed to force kill process tree ${pid}:`, killError);
                resolve({
                  success: false,
                  error: killError.message || 'Failed to stop bot process'
                });
              } else {
                logger.success(`Bot process tree ${pid} force-killed after timeout`);
                activeBotProcess = null;
                resolve({ success: true, message: 'Bot stopped successfully (force killed after timeout)' });
              }
            });
          } catch (checkError) {
            // Process already died from SIGTERM
            if (checkError.code === 'ESRCH') {
              logger.success(`Bot process tree ${pid} stopped gracefully with SIGTERM`);
              activeBotProcess = null;
              resolve({ success: true, message: 'Bot stopped successfully' });
            } else {
              // Unknown error checking process status
              logger.warn(`Could not check process status: ${checkError.message}, assuming stopped`);
              activeBotProcess = null;
              resolve({ success: true, message: 'Bot stopped (status uncertain)' });
            }
          }
        }, 2000); // Wait 2 seconds before force killing
      });
    } catch (error) {
      logger.error('Error stopping bot:', error);
      resolve({
        success: false,
        error: error.message || 'Failed to stop bot process'
      });
    }
  });
}
