/**
 * Tests for Logger Utility
 *
 * Verifies log formatting: prefix, level label, timestamp, message content,
 * and that debug messages are suppressed at the default log level.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger, logger } from '../logger';

describe('Logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should include the prefix and level label in log messages', () => {
      const log = createLogger('MyModule');
      log.info('Test message');

      expect(consoleSpy.info).toHaveBeenCalled();
      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain('MyModule');
      expect(logCall).toContain('INFO');
    });
  });

  describe('log levels', () => {
    it('should not log debug messages by default (log level is info)', () => {
      const log = createLogger('Debug');
      log.debug('Debug message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it.each([
      ['warn', 'WARN', 'warn'] as const,
      ['error', 'ERROR', 'error'] as const,
    ])('should log %s messages with correct label', (method, label, spy) => {
      const log = createLogger('Test');
      log[method](`${method} message`);

      expect(consoleSpy[spy]).toHaveBeenCalled();
      const logCall = consoleSpy[spy].mock.calls[0][0];
      expect(logCall).toContain(label);
    });
  });

  describe('message formatting', () => {
    it('should include an ISO timestamp in log messages', () => {
      const log = createLogger('Time');
      log.info('Test');

      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include the actual message content', () => {
      const log = createLogger('Content');
      log.info('The actual test message');

      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain('The actual test message');
    });
  });

  describe('global logger', () => {
    it('should forward messages through the global logger instance', () => {
      logger.warn('Global log message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });
});
