/**
 * Tests for Logger Utility
 * 
 * These tests verify that:
 * 1. Logger creates properly formatted log messages
 * 2. Different log levels work correctly
 * 3. Logger prefixes are applied correctly
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger, logger } from '../logger';

describe('Logger', () => {
  // Spy on console methods - the logger uses these specific methods
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
    it('should create a logger with a prefix', () => {
      const log = createLogger('TestModule');
      expect(log).toBeDefined();
      expect(typeof log.info).toBe('function');
      expect(typeof log.debug).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
    });

    it('should include the prefix in log messages', () => {
      const log = createLogger('MyModule');
      log.info('Test message');
      
      // Check that console.info was called with the prefix
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
      
      // Debug is not logged when log level is info (default)
      // This is expected behavior - debug is filtered out
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should log info messages using console.info', () => {
      const log = createLogger('Info');
      log.info('Info message');
      
      expect(consoleSpy.info).toHaveBeenCalled();
      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain('INFO');
    });

    it('should log warning messages using console.warn', () => {
      const log = createLogger('Warn');
      log.warn('Warning message');
      
      expect(consoleSpy.warn).toHaveBeenCalled();
      const logCall = consoleSpy.warn.mock.calls[0][0];
      expect(logCall).toContain('WARN');
    });

    it('should log error messages using console.error', () => {
      const log = createLogger('Error');
      log.error('Error message');
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toContain('ERROR');
    });
  });

  describe('message formatting', () => {
    it('should include timestamp in log messages', () => {
      const log = createLogger('Time');
      log.info('Test');
      
      const logCall = consoleSpy.info.mock.calls[0][0];
      // ISO timestamp format: 2024-01-28T12:34:56.789Z
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include the actual message content', () => {
      const log = createLogger('Content');
      log.info('The actual test message');
      
      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain('The actual test message');
    });

    it('should handle long messages', () => {
      const log = createLogger('Long');
      const longMessage = 'A'.repeat(200);
      log.info(longMessage);
      
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe('global logger', () => {
    it('should export a default logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should work without a specific prefix', () => {
      logger.info('Global log message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });
});
