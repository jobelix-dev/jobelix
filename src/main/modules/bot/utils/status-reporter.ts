/**
 * Status Reporter - Direct IPC communication with Electron renderer
 * 
 * Replaces the Python stdout-based IPC with direct Electron IPC.
 * Sends status updates to the renderer process in real-time.
 */

import { BrowserWindow } from 'electron';
import type { BotStats, BotActivity, BotStatusMessage } from '../types';
import { createLogger } from './logger';

const log = createLogger('StatusReporter');

export class StatusReporter {
  private mainWindow: BrowserWindow | null = null;
  private stopped = false;
  private stats: BotStats = {
    jobsFound: 0,
    jobsApplied: 0,
    jobsFailed: 0,
    creditsUsed: 0,
  };

  /**
   * Set the main window for IPC communication
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    log.debug('Main window set for IPC');
  }

  /**
   * Emit a status message to the renderer
   */
  private emit(message: BotStatusMessage): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      log.warn('Cannot emit status - no main window');
      return;
    }

    try {
      this.mainWindow.webContents.send('bot-status', message);
      log.debug(`Emitted: ${message.type} - ${message.activity || ''}`);
    } catch (error) {
      log.error('Failed to emit status', error as Error);
    }
  }

  /**
   * Signal session start
   */
  startSession(botVersion: string, platform: string): void {
    log.info(`Starting session - v${botVersion} on ${platform}`);
    this.stopped = false;
    this.stats = { jobsFound: 0, jobsApplied: 0, jobsFailed: 0, creditsUsed: 0 };
    
    this.emit({
      type: 'session_start',
      details: { botVersion, platform },
      stats: this.stats,
    });
  }

  /**
   * Send a heartbeat with current activity
   * Returns false if the session was stopped
   */
  sendHeartbeat(activity: BotActivity, details?: Record<string, unknown>): boolean {
    if (this.stopped) {
      log.debug('Skipping heartbeat - session stopped');
      return false;
    }

    this.emit({
      type: 'heartbeat',
      activity,
      details,
      stats: this.stats,
    });

    return true;
  }

  /**
   * Signal session completion
   */
  completeSession(success: boolean, errorMessage?: string): void {
    log.info(`Session complete: ${success ? 'success' : 'failed'}`);
    
    this.emit({
      type: 'session_complete',
      success,
      errorMessage,
      stats: this.stats,
    });
  }

  /**
   * Mark session as stopped (called on SIGTERM or user stop)
   */
  markStopped(): void {
    this.stopped = true;
    log.info('Session marked as stopped');
    
    this.emit({
      type: 'stopped',
      details: { reason: 'User requested stop' },
      stats: this.stats,
    });
  }

  /**
   * Check if session was stopped
   */
  isStopped(): boolean {
    return this.stopped;
  }

  // =========================================================================
  // Statistics Methods
  // =========================================================================

  incrementJobsFound(count = 1): void {
    this.stats.jobsFound += count;
    log.debug(`Jobs found: +${count} (total: ${this.stats.jobsFound})`);
  }

  incrementJobsApplied(count = 1): void {
    this.stats.jobsApplied += count;
    log.debug(`Jobs applied: +${count} (total: ${this.stats.jobsApplied})`);
  }

  incrementJobsFailed(count = 1): void {
    this.stats.jobsFailed += count;
    log.debug(`Jobs failed: +${count} (total: ${this.stats.jobsFailed})`);
  }

  incrementCreditsUsed(count = 1): void {
    this.stats.creditsUsed += count;
    log.debug(`Credits used: +${count} (total: ${this.stats.creditsUsed})`);
  }

  getStats(): BotStats {
    return { ...this.stats };
  }
}

// Singleton instance
export const statusReporter = new StatusReporter();
