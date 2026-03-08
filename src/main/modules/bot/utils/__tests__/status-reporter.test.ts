/**
 * Tests for Status Reporter
 * 
 * These tests verify that:
 * 1. StatusReporter initializes correctly
 * 2. Stats tracking works correctly
 * 3. IPC messages are emitted correctly (mocked)
 * 4. Session lifecycle is managed properly
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

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StatusReporter } from '../status-reporter';
import type { StatusPayload } from '../status-reporter';
import type { BotActivity } from '../../types';

const emitted: StatusPayload[] = [];
const mockEmit = vi.fn((payload: StatusPayload) => emitted.push(payload));

describe('StatusReporter', () => {
  let reporter: StatusReporter;

  beforeEach(() => {
    vi.clearAllMocks();
    emitted.length = 0;
    reporter = new StatusReporter();
    reporter.setEmitter(mockEmit);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startSession', () => {
    it('should emit running stage message with initializing activity', () => {
      reporter.startSession('2.0.0', 'darwin');
      
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'running',
        activity: 'initializing',
        details: { botVersion: '2.0.0', platform: 'darwin' },
      }));
    });

    it('should reset stats on session start (snake_case format)', () => {
      // Add some stats first
      reporter.incrementJobsApplied();
      reporter.incrementJobsFailed();
      
      // Start new session
      reporter.startSession('2.0.0', 'darwin');
      
      // Stats should be reset and in snake_case format
      const lastPayload = mockEmit.mock.calls.at(-1)![0] as StatusPayload;
      expect(lastPayload.stats).toEqual({
        jobs_found: 0,
        jobs_applied: 0,
        jobs_failed: 0,
        credits_used: 0,
      });
    });
  });

  describe('sendHeartbeat', () => {
    const activity: BotActivity = 'searching_jobs';
    const applyingActivity: BotActivity = 'applying_jobs';

    beforeEach(() => {
      reporter.startSession('2.0.0', 'darwin');
      vi.clearAllMocks();
    });

    it('should emit running stage with activity', () => {
      reporter.sendHeartbeat(activity);
      
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'running',
        activity: activity,
      }));
    });

    it('should include optional details in heartbeat', () => {
      reporter.sendHeartbeat(applyingActivity, { jobId: '123', company: 'Acme' });
      
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'running',
        activity: applyingActivity,
        details: { jobId: '123', company: 'Acme' },
      }));
    });

    it('should return false when session is stopped', () => {
      reporter.markStopped();
      const result = reporter.sendHeartbeat(activity);
      expect(result).toBe(false);
    });
  });

  describe('stats tracking', () => {
    const activity: BotActivity = 'searching_jobs';

    beforeEach(() => {
      reporter.startSession('2.0.0', 'darwin');
    });

    it.each([
      ['jobs_found', () => { reporter.incrementJobsFound(); reporter.incrementJobsFound(); reporter.incrementJobsFound(); }, 3] as const,
      ['jobs_applied', () => { reporter.incrementJobsApplied(); reporter.incrementJobsApplied(); }, 2] as const,
      ['jobs_failed', () => { reporter.incrementJobsFailed(); }, 1] as const,
      ['credits_used', () => { reporter.incrementCreditsUsed(); reporter.incrementCreditsUsed(); }, 2] as const,
    ])('should increment %s (snake_case in payload)', (statKey, increment, expected) => {
      increment();
      reporter.sendHeartbeat(activity);
      const lastPayload = mockEmit.mock.calls.at(-1)![0] as StatusPayload;
      expect(lastPayload.stats![statKey]).toBe(expected);
    });

    it('should track multiple stat types together (snake_case)', () => {
      reporter.incrementJobsFound();
      reporter.incrementJobsFound();
      reporter.incrementJobsApplied();
      reporter.incrementJobsFailed();
      reporter.incrementCreditsUsed();
      
      reporter.sendHeartbeat(activity);
      const lastPayload = mockEmit.mock.calls.at(-1)![0] as StatusPayload;
      expect(lastPayload.stats).toEqual({
        jobs_found: 2,
        jobs_applied: 1,
        jobs_failed: 1,
        credits_used: 1,
      });
    });

    it('should increment by custom amount', () => {
      reporter.incrementJobsFound(5);
      
      reporter.sendHeartbeat(activity);
      const lastPayload = mockEmit.mock.calls.at(-1)![0] as StatusPayload;
      expect(lastPayload.stats!.jobs_found).toBe(5);
    });

    it('should return current stats via getStats (camelCase internally)', () => {
      reporter.incrementJobsFound(3);
      reporter.incrementJobsApplied(2);
      
      const stats = reporter.getStats();
      expect(stats.jobsFound).toBe(3);
      expect(stats.jobsApplied).toBe(2);
    });
  });

  describe('markStopped', () => {
    it('should emit stopped stage message', () => {
      reporter.startSession('2.0.0', 'darwin');
      vi.clearAllMocks();
      
      reporter.markStopped();
      
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'stopped',
        message: 'User requested stop',
      }));
    });

    it('should prevent further heartbeats after stop', () => {
      const activity: BotActivity = 'searching_jobs';
      reporter.startSession('2.0.0', 'darwin');
      reporter.markStopped();
      vi.clearAllMocks();
      
      reporter.sendHeartbeat(activity);
      
      expect(mockEmit).not.toHaveBeenCalled();
    });

  });

  describe('completeSession', () => {
    beforeEach(() => {
      reporter.startSession('2.0.0', 'darwin');
      vi.clearAllMocks();
    });

    it('should emit completed stage on success', () => {
      reporter.completeSession(true);
      
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'completed',
        message: 'Session completed successfully',
      }));
    });

    it('should emit failed stage with error message on failure', () => {
      reporter.completeSession(false, 'Something went wrong');
      
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'failed',
        message: 'Something went wrong',
      }));
    });

    it('should include final stats in completion message (snake_case)', () => {
      reporter.incrementJobsApplied(5);
      reporter.completeSession(true);
      
      const lastPayload = mockEmit.mock.calls.at(-1)![0] as StatusPayload;
      expect(lastPayload.stats!.jobs_applied).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle missing main window gracefully', () => {
      const noWindowReporter = new StatusReporter();
      // Don't set main window
      const activity: BotActivity = 'searching_jobs';
      
      expect(() => noWindowReporter.sendHeartbeat(activity)).not.toThrow();
    });

    it('should handle emitter errors gracefully', () => {
      const destroyedReporter = new StatusReporter();
      destroyedReporter.setEmitter(() => { throw new Error('renderer gone'); });
      const activity: BotActivity = 'searching_jobs';

      expect(() => destroyedReporter.sendHeartbeat(activity)).not.toThrow();
    });
  });
});
