/**
 * In-memory rate limiting utilities for proxy middleware.
 *
 * Design goals:
 * - No background timers (safe for serverless/dev hot reload)
 * - Lazy cleanup on demand
 * - Reusable single-window and dual-window counters
 */

export interface SingleWindowResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface DualWindowResult {
  allowed: boolean;
  hourlyRemaining: number;
  dailyRemaining: number;
  reset: number;
}

interface CounterEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitStore {
  entries: Map<string, CounterEntry>;
  lastCleanupAt: number;
}

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export function createRateLimitStore(): RateLimitStore {
  return {
    entries: new Map<string, CounterEntry>(),
    lastCleanupAt: 0,
  };
}

function maybeCleanup(store: RateLimitStore, now: number): void {
  if (now - store.lastCleanupAt < CLEANUP_INTERVAL_MS) return;

  for (const [key, entry] of store.entries.entries()) {
    if (entry.resetTime < now) {
      store.entries.delete(key);
    }
  }

  store.lastCleanupAt = now;
}

export function checkSingleWindowLimit(
  store: RateLimitStore,
  key: string,
  limit: number,
  windowMs: number
): SingleWindowResult {
  const now = Date.now();
  maybeCleanup(store, now);

  const existing = store.entries.get(key);
  if (!existing || existing.resetTime < now) {
    const reset = now + windowMs;
    store.entries.set(key, { count: 1, resetTime: reset });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      reset,
    };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset: existing.resetTime,
    };
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    reset: existing.resetTime,
  };
}

export function checkDualWindowLimit(
  hourlyStore: RateLimitStore,
  dailyStore: RateLimitStore,
  key: string,
  hourlyLimit: number,
  dailyLimit: number,
  now: number = Date.now()
): DualWindowResult {
  maybeCleanup(hourlyStore, now);
  maybeCleanup(dailyStore, now);

  const hourlyWindowMs = 60 * 60 * 1000;
  const dailyWindowMs = 24 * 60 * 60 * 1000;

  const hourlyExisting = hourlyStore.entries.get(key);
  let hourlyCount: number;
  let hourlyReset: number;

  if (!hourlyExisting || hourlyExisting.resetTime < now) {
    hourlyCount = 1;
    hourlyReset = now + hourlyWindowMs;
    hourlyStore.entries.set(key, { count: hourlyCount, resetTime: hourlyReset });
  } else {
    hourlyExisting.count += 1;
    hourlyCount = hourlyExisting.count;
    hourlyReset = hourlyExisting.resetTime;
  }

  const dailyExisting = dailyStore.entries.get(key);
  let dailyCount: number;
  let dailyReset: number;

  if (!dailyExisting || dailyExisting.resetTime < now) {
    dailyCount = 1;
    dailyReset = now + dailyWindowMs;
    dailyStore.entries.set(key, { count: dailyCount, resetTime: dailyReset });
  } else {
    dailyExisting.count += 1;
    dailyCount = dailyExisting.count;
    dailyReset = dailyExisting.resetTime;
  }

  const hourlyExceeded = hourlyCount > hourlyLimit;
  const dailyExceeded = dailyCount > dailyLimit;

  return {
    allowed: !hourlyExceeded && !dailyExceeded,
    hourlyRemaining: Math.max(0, hourlyLimit - hourlyCount),
    dailyRemaining: Math.max(0, dailyLimit - dailyCount),
    reset: hourlyExceeded ? hourlyReset : dailyReset,
  };
}
