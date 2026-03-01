import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkDualWindowLimit,
  checkSingleWindowLimit,
  createRateLimitStore,
} from '../proxyRateLimits';

describe('proxyRateLimits', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkSingleWindowLimit', () => {
    it('allows requests up to limit and blocks the next one', () => {
      const store = createRateLimitStore();

      const first = checkSingleWindowLimit(store, '1.2.3.4', 2, 60_000);
      const second = checkSingleWindowLimit(store, '1.2.3.4', 2, 60_000);
      const third = checkSingleWindowLimit(store, '1.2.3.4', 2, 60_000);

      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(1);
      expect(second.allowed).toBe(true);
      expect(second.remaining).toBe(0);
      expect(third.allowed).toBe(false);
      expect(third.remaining).toBe(0);
    });

    it('resets counts after window expires', () => {
      const store = createRateLimitStore();

      checkSingleWindowLimit(store, '1.2.3.4', 1, 60_000);
      const blocked = checkSingleWindowLimit(store, '1.2.3.4', 1, 60_000);
      expect(blocked.allowed).toBe(false);

      vi.setSystemTime(new Date('2026-01-01T00:01:01.000Z'));
      const afterReset = checkSingleWindowLimit(store, '1.2.3.4', 1, 60_000);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(0);
    });
  });

  describe('checkDualWindowLimit', () => {
    it('blocks when hourly limit is exceeded', () => {
      const hourlyStore = createRateLimitStore();
      const dailyStore = createRateLimitStore();

      const first = checkDualWindowLimit(hourlyStore, dailyStore, 'key', 1, 10);
      const second = checkDualWindowLimit(hourlyStore, dailyStore, 'key', 1, 10);

      expect(first.allowed).toBe(true);
      expect(first.hourlyRemaining).toBe(0);
      expect(second.allowed).toBe(false);
      expect(second.hourlyRemaining).toBe(0);
    });

    it('blocks when daily limit is exceeded even if hourly allows it', () => {
      const hourlyStore = createRateLimitStore();
      const dailyStore = createRateLimitStore();

      checkDualWindowLimit(hourlyStore, dailyStore, 'key', 10, 1);
      const second = checkDualWindowLimit(hourlyStore, dailyStore, 'key', 10, 1);

      expect(second.allowed).toBe(false);
      expect(second.dailyRemaining).toBe(0);
    });
  });
});
