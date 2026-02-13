/**
 * Tests for lib/server/rateLimiting.ts
 *
 * Tests cover:
 * - checkRateLimit: RPC error, empty data, success, correct params
 * - logApiCall: correct params, no-throw on error
 * - addRateLimitHeaders: sets all 6 headers, returns same response
 * - rateLimitExceededResponse: 429 status, body fields, endpoint-specific messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRpc = vi.fn();

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({ rpc: mockRpc })),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  checkRateLimit,
  logApiCall,
  addRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/server/rateLimiting';
import type { RateLimitConfig, RateLimitResult } from '@/lib/server/rateLimiting';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const defaultConfig: RateLimitConfig = {
  hourlyLimit: 10,
  dailyLimit: 50,
  endpoint: 'test-endpoint',
};

const defaultResult: RateLimitResult = {
  allowed: true,
  hourly_count: 3,
  daily_count: 12,
  hourly_remaining: 7,
  daily_remaining: 38,
};

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// checkRateLimit
// ===========================================================================

describe('checkRateLimit', () => {
  it('returns error response when RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC failure' },
    });

    const result = await checkRateLimit('user-1', defaultConfig);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(NextResponse);
    expect(result.error!.status).toBe(500);

    const body = await result.error!.json();
    expect(body.error).toBe('Internal error');
  });

  it('returns error response when RPC returns null data', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await checkRateLimit('user-1', defaultConfig);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(NextResponse);
    expect(result.error!.status).toBe(500);
  });

  it('returns error response when RPC returns empty array', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await checkRateLimit('user-1', defaultConfig);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(NextResponse);
    expect(result.error!.status).toBe(500);
  });

  it('returns data on success', async () => {
    mockRpc.mockResolvedValueOnce({ data: [defaultResult], error: null });

    const result = await checkRateLimit('user-1', defaultConfig);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(defaultResult);
  });

  it('passes correct params to the RPC call', async () => {
    mockRpc.mockResolvedValueOnce({ data: [defaultResult], error: null });

    const config: RateLimitConfig = {
      hourlyLimit: 100,
      dailyLimit: 500,
      endpoint: 'gpt4',
    };

    await checkRateLimit('user-abc', config);

    expect(mockRpc).toHaveBeenCalledWith('check_api_rate_limit', {
      p_user_id: 'user-abc',
      p_endpoint: 'gpt4',
      p_hourly_limit: 100,
      p_daily_limit: 500,
    });
  });

  it('returns the first element of the data array as the result', async () => {
    const secondResult = { ...defaultResult, hourly_count: 99 };
    mockRpc.mockResolvedValueOnce({ data: [defaultResult, secondResult], error: null });

    const result = await checkRateLimit('user-1', defaultConfig);

    expect(result.data).toEqual(defaultResult);
  });
});

// ===========================================================================
// logApiCall
// ===========================================================================

describe('logApiCall', () => {
  it('calls RPC with correct params', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });

    await logApiCall('user-xyz', 'resume-extraction');

    expect(mockRpc).toHaveBeenCalledWith('log_api_call', {
      p_user_id: 'user-xyz',
      p_endpoint: 'resume-extraction',
    });
  });

  it('does not throw when RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'logging failed' } });

    // Should resolve without throwing
    await expect(logApiCall('user-xyz', 'test')).resolves.toBeUndefined();
  });

  it('logs error to console when RPC fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc.mockResolvedValueOnce({ error: { message: 'logging failed' } });

    await logApiCall('user-xyz', 'test');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Rate Limit] Failed to log API call'),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });

  it('returns void on success', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });

    const result = await logApiCall('user-1', 'endpoint');

    expect(result).toBeUndefined();
  });
});

// ===========================================================================
// addRateLimitHeaders
// ===========================================================================

describe('addRateLimitHeaders', () => {
  it('sets all 6 rate limit headers correctly', () => {
    const response = NextResponse.json({ ok: true });

    addRateLimitHeaders(response, defaultConfig, defaultResult);

    expect(response.headers.get('X-RateLimit-Hourly-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Daily-Limit')).toBe('50');
    expect(response.headers.get('X-RateLimit-Hourly-Remaining')).toBe('7');
    expect(response.headers.get('X-RateLimit-Daily-Remaining')).toBe('38');
    expect(response.headers.get('X-RateLimit-Hourly-Used')).toBe('3');
    expect(response.headers.get('X-RateLimit-Daily-Used')).toBe('12');
  });

  it('returns the same response object (not a copy)', () => {
    const response = NextResponse.json({ ok: true });

    const returned = addRateLimitHeaders(response, defaultConfig, defaultResult);

    expect(returned).toBe(response);
  });

  it('works with zero values', () => {
    const zeroResult: RateLimitResult = {
      allowed: true,
      hourly_count: 0,
      daily_count: 0,
      hourly_remaining: 10,
      daily_remaining: 50,
    };
    const response = NextResponse.json({ ok: true });

    addRateLimitHeaders(response, defaultConfig, zeroResult);

    expect(response.headers.get('X-RateLimit-Hourly-Used')).toBe('0');
    expect(response.headers.get('X-RateLimit-Daily-Used')).toBe('0');
  });
});

// ===========================================================================
// rateLimitExceededResponse
// ===========================================================================

describe('rateLimitExceededResponse', () => {
  it('returns a 429 status response', () => {
    const response = rateLimitExceededResponse(defaultConfig, defaultResult);

    expect(response.status).toBe(429);
  });

  it('includes correct body fields', async () => {
    const response = rateLimitExceededResponse(defaultConfig, defaultResult);
    const body = await response.json();

    expect(body.error).toBe('Rate limit exceeded');
    expect(body.hourly_limit).toBe(defaultConfig.hourlyLimit);
    expect(body.daily_limit).toBe(defaultConfig.dailyLimit);
    expect(body.hourly_remaining).toBe(defaultResult.hourly_remaining);
    expect(body.daily_remaining).toBe(defaultResult.daily_remaining);
    expect(body.hourly_used).toBe(defaultResult.hourly_count);
    expect(body.daily_used).toBe(defaultResult.daily_count);
    expect(body.detail).toBe(`Hourly: ${defaultResult.hourly_count}/${defaultConfig.hourlyLimit}, Daily: ${defaultResult.daily_count}/${defaultConfig.dailyLimit}`);
  });

  it('uses resume-extraction specific message', async () => {
    const config: RateLimitConfig = { ...defaultConfig, endpoint: 'resume-extraction' };
    const response = rateLimitExceededResponse(config, defaultResult);
    const body = await response.json();

    expect(body.message).toBe('Resume parsing is limited to avoid overload. Please try again in about an hour.');
  });

  it('uses github-import specific message', async () => {
    const config: RateLimitConfig = { ...defaultConfig, endpoint: 'github-import' };
    const response = rateLimitExceededResponse(config, defaultResult);
    const body = await response.json();

    expect(body.message).toBe('GitHub import is limited to avoid overload. Please try again in about an hour.');
  });

  it('uses work-preferences specific message', async () => {
    const config: RateLimitConfig = { ...defaultConfig, endpoint: 'work-preferences' };
    const response = rateLimitExceededResponse(config, defaultResult);
    const body = await response.json();

    expect(body.message).toBe('Too many updates. Please try again later.');
  });

  it('uses default fallback message for unknown endpoint', async () => {
    const config: RateLimitConfig = { ...defaultConfig, endpoint: 'some-unknown-endpoint' };
    const response = rateLimitExceededResponse(config, defaultResult);
    const body = await response.json();

    expect(body.message).toBe("You've reached the usage limit. Please try again later.");
  });

  it('is a NextResponse instance', () => {
    const response = rateLimitExceededResponse(defaultConfig, defaultResult);

    expect(response).toBeInstanceOf(NextResponse);
  });
});
