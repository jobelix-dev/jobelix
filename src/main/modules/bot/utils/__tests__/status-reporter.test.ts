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
import type { BotActivity } from '../../types';

// Mock Electron's BrowserWindow
const mockWebContents = {
  send: vi.fn(),
};

const mockWindow = {
  isDestroyed: () => false,
  webContents: mockWebContents,
};

// We need to mock electron before importing StatusReporter
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(() => mockWindow),
}));

describe('StatusReporter', () => {
  let reporter: StatusReporter;

  beforeEach(() => {
    vi.clearAllMocks();
    reporter = new StatusReporter();
    reporter.setMainWindow(mockWindow as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a new StatusReporter instance', () => {
      const newReporter = new StatusReporter();
      expect(newReporter).toBeInstanceOf(StatusReporter);
    });
  });

  describe('setMainWindow', () => {
    it('should set the main window for IPC', () => {
      const newReporter = new StatusReporter();
      expect(() => newReporter.setMainWindow(mockWindow as any)).not.toThrow();
    });
  });

  describe('startSession', () => {
    it('should emit running stage message with initializing activity', () => {
      reporter.startSession('2.0.0', 'darwin');
      
      expect(mockWebContents.send).toHaveBeenCalledWith('bot-status', expect.objectContaining({
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
      const lastCall = mockWebContents.send.mock.calls.at(-1);
      expect(lastCall?.[1].stats).toEqual({
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
      
      expect(mockWebContents.send).toHaveBeenCalledWith('bot-status', expect.objectContaining({
        stage: 'running',
        activity: activity,
      }));
    });

    it('should include optional details in heartbeat', () => {
      reporter.sendHeartbeat(applyingActivity, { jobId: '123', company: 'Acme' });
      
      expect(mockWebContents.send).toHaveBeenCalledWith('bot-status', expect.objectContaining({
        stage: 'running',
        activity: applyingActivity,
        details: { jobId: '123', company: 'Acme' },
      }));
    });

    it('should return true when session is active', () => {
      const result = reporter.sendHeartbeat(activity);
      expect(result).toBe(true);
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

    it('should increment jobs found (snake_case in payload)', () => {
      reporter.incrementJobsFound();
      reporter.incrementJobsFound();
      reporter.incrementJobsFound();
      
      reporter.sendHeartbeat(activity);
      const lastCall = mockWebContents.send.mock.calls.at(-1);
      expect(lastCall?.[1].stats.jobs_found).toBe(3);
    });

    it('should increment jobs applied (snake_case in payload)', () => {
      reporter.incrementJobsApplied();
      reporter.incrementJobsApplied();
      
      reporter.sendHeartbeat(activity);
      const lastCall = mockWebContents.send.mock.calls.at(-1);
      expect(lastCall?.[1].stats.jobs_applied).toBe(2);
    });

    it('should increment jobs failed (snake_case in payload)', () => {
      reporter.incrementJobsFailed();
      
      reporter.sendHeartbeat(activity);
      const lastCall = mockWebContents.send.mock.calls.at(-1);
      expect(lastCall?.[1].stats.jobs_failed).toBe(1);
    });

    it('should increment credits used (snake_case in payload)', () => {
      reporter.incrementCreditsUsed();
      reporter.incrementCreditsUsed();
      
      reporter.sendHeartbeat(activity);
      const lastCall = mockWebContents.send.mock.calls.at(-1);
      expect(lastCall?.[1].stats.credits_used).toBe(2);
    });

    it('should track multiple stat types together (snake_case)', () => {
      reporter.incrementJobsFound();
      reporter.incrementJobsFound();
      reporter.incrementJobsApplied();
      reporter.incrementJobsFailed();
      reporter.incrementCreditsUsed();
      
      reporter.sendHeartbeat(activity);
      const lastCall = mockWebContents.send.mock.calls.at(-1);
      expect(lastCall?.[1].stats).toEqual({
        jobs_found: 2,
        jobs_applied: 1,
        jobs_failed: 1,
        credits_used: 1,
      });
    });

    it('should increment by custom amount', () => {
      reporter.incrementJobsFound(5);
      
      reporter.sendHeartbeat(activity);
      const lastCall = mockWebContents.send.mock.calls.at(-1);
      expect(lastCall?.[1].stats.jobs_found).toBe(5);
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
      
      expect(mockWebContents.send).toHaveBeenCalledWith('bot-status', expect.objectContaining({
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
      
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });

    it('should set isStopped to true', () => {
      reporter.startSession('2.0.0', 'darwin');
      expect(reporter.isStopped()).toBe(false);
      
      reporter.markStopped();
      expect(reporter.isStopped()).toBe(true);
    });
  });

  describe('completeSession', () => {
    beforeEach(() => {
      reporter.startSession('2.0.0', 'darwin');
      vi.clearAllMocks();
    });

    it('should emit completed stage on success', () => {
      reporter.completeSession(true);
      
      expect(mockWebContents.send).toHaveBeenCalledWith('bot-status', expect.objectContaining({
        stage: 'completed',
        message: 'Session completed successfully',
      }));
    });

    it('should emit failed stage with error message on failure', () => {
      reporter.completeSession(false, 'Something went wrong');
      
      expect(mockWebContents.send).toHaveBeenCalledWith('bot-status', expect.objectContaining({
        stage: 'failed',
        message: 'Something went wrong',
      }));
    });

    it('should include final stats in completion message (snake_case)', () => {
      reporter.incrementJobsApplied(5);
      reporter.completeSession(true);
      
      const lastCall = mockWebContents.send.mock.calls.at(-1);
      expect(lastCall?.[1].stats.jobs_applied).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle missing main window gracefully', () => {
      const noWindowReporter = new StatusReporter();
      // Don't set main window
      const activity: BotActivity = 'searching_jobs';
      
      expect(() => noWindowReporter.sendHeartbeat(activity)).not.toThrow();
    });

    it('should handle destroyed window gracefully', () => {
      const destroyedWindow = {
        isDestroyed: () => true,
        webContents: mockWebContents,
      };
      
      const destroyedReporter = new StatusReporter();
      destroyedReporter.setMainWindow(destroyedWindow as any);
      const activity: BotActivity = 'searching_jobs';
      
      expect(() => destroyedReporter.sendHeartbeat(activity)).not.toThrow();
    });
  });
});
