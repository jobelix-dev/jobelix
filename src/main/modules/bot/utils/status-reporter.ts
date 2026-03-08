/**
 * Status Reporter - Transport-agnostic status updates for the bot.
 *
 * Decoupled from Electron so the bot can run in a worker thread.
 * The caller (main process or worker entry) configures the emitter:
 *   - Main process: statusReporter.setEmitter(payload => window.webContents.send('bot-status', payload))
 *   - Worker thread: statusReporter.setEmitter(payload => parentPort.postMessage({ type: 'status', payload }))
 *
 * PAYLOAD FORMAT (must match useBot.ts expectations):
 * {
 *   stage: 'checking' | 'installing' | 'launching' | 'running' | 'completed' | 'failed' | 'stopped',
 *   message?: string,
 *   activity?: string,
 *   details?: Record<string, unknown>,
 *   stats?: { jobs_found, jobs_applied, jobs_failed, credits_used }  // snake_case!
 * }
 */

import type { BotStats, BotActivity } from '../types';
import { createLogger } from './logger';

const log = createLogger('StatusReporter');

// Stage type matching frontend expectations
type BotStage = 'checking' | 'installing' | 'launching' | 'running' | 'completed' | 'failed' | 'stopped';

// Payload format matching useBot.ts expectations (snake_case stats)
export interface StatusPayload {
  stage: BotStage;
  message?: string;
  activity?: string;
  details?: Record<string, unknown>;
  stats?: {
    jobs_found: number;
    jobs_applied: number;
    jobs_failed: number;
    credits_used: number;
  };
}

export class StatusReporter {
  private emitFn: ((payload: StatusPayload) => void) | null = null;
  private stopped = false;
  private stats: BotStats = {
    jobsFound: 0,
    jobsApplied: 0,
    jobsFailed: 0,
    creditsUsed: 0,
  };

  /** Configure the transport used to deliver status payloads. Must be called before starting the bot. */
  setEmitter(fn: (payload: StatusPayload) => void): void {
    this.emitFn = fn;
  }

  private getSnakeCaseStats() {
    return {
      jobs_found: this.stats.jobsFound,
      jobs_applied: this.stats.jobsApplied,
      jobs_failed: this.stats.jobsFailed,
      credits_used: this.stats.creditsUsed,
    };
  }

  private emit(payload: StatusPayload): void {
    if (!this.emitFn) {
      log.warn('Cannot emit status - no emitter configured');
      return;
    }
    try {
      this.emitFn(payload);
      log.debug(`Emitted: stage=${payload.stage} activity=${payload.activity || ''}`);
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
      stage: 'running',
      message: 'Bot session started',
      activity: 'initializing',
      details: { botVersion, platform },
      stats: this.getSnakeCaseStats(),
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
      stage: 'running',
      activity,
      details,
      stats: this.getSnakeCaseStats(),
    });

    return true;
  }

  /**
   * Signal session completion
   */
  completeSession(success: boolean, errorMessage?: string): void {
    log.info(`Session complete: ${success ? 'success' : 'failed'}`);
    
    this.emit({
      stage: success ? 'completed' : 'failed',
      message: errorMessage || (success ? 'Session completed successfully' : 'Session failed'),
      stats: this.getSnakeCaseStats(),
    });
  }

  /**
   * Mark session as stopped (called on SIGTERM or user stop)
   */
  markStopped(): void {
    this.stopped = true;
    log.info('Session marked as stopped');
    
    this.emit({
      stage: 'stopped',
      message: 'User requested stop',
      details: { reason: 'User requested stop' },
      stats: this.getSnakeCaseStats(),
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

  /**
   * Emit a stats-only update to keep UI in sync
   * Called after each stat increment for real-time updates
   */
  private emitStatsUpdate(): void {
    if (this.stopped) return;
    
    this.emit({
      stage: 'running',
      activity: 'stats_update',
      stats: this.getSnakeCaseStats(),
    });
  }

  incrementJobsFound(count = 1): void {
    this.stats.jobsFound += count;
    log.debug(`Jobs found: +${count} (total: ${this.stats.jobsFound})`);
    this.emitStatsUpdate();
  }

  incrementJobsApplied(count = 1): void {
    this.stats.jobsApplied += count;
    log.debug(`Jobs applied: +${count} (total: ${this.stats.jobsApplied})`);
    this.emitStatsUpdate();
  }

  incrementJobsFailed(count = 1): void {
    this.stats.jobsFailed += count;
    log.debug(`Jobs failed: +${count} (total: ${this.stats.jobsFailed})`);
    this.emitStatsUpdate();
  }

  incrementCreditsUsed(count = 1): void {
    this.stats.creditsUsed += count;
    log.debug(`Credits used: +${count} (total: ${this.stats.creditsUsed})`);
    this.emitStatsUpdate();
  }

  getStats(): BotStats {
    return { ...this.stats };
  }
}

// Singleton instance
export const statusReporter = new StatusReporter();
