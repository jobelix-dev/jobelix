/**
 * Security Tests: Rate Limiting Bypass Attempts
 *
 * Tests for:
 * - Endpoints protected by checkRateLimit (gpt4, credits/claim, referral/apply)
 * - IP-based rate limiting on signup
 * - Correct ordering of auth vs rate limit checks
 * - Fail-open vs fail-closed behavior on RPC errors
 * - Non-rate-limited endpoints accepting rapid requests (login, newsletter, feedback)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Auth mock
const mockAuthenticateRequest = vi.fn();
vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

// Rate limiting mock
const mockCheckRateLimit = vi.fn();
const mockLogApiCall = vi.fn();
vi.mock('@/lib/server/rateLimiting', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  logApiCall: (...args: unknown[]) => mockLogApiCall(...args),
  rateLimitExceededResponse: vi.fn((config, result) =>
    NextResponse.json({ error: 'Rate limit exceeded', ...result }, { status: 429 }),
  ),
  addRateLimitHeaders: vi.fn((response) => response),
}));

// Service supabase mock (for signup IP rate limiting + gpt4 token lookup)
const mockServiceRpc = vi.fn();
const mockServiceFrom = vi.fn();
const mockServiceSignUp = vi.fn();
vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({
    rpc: mockServiceRpc,
    from: mockServiceFrom,
    auth: { signUp: mockServiceSignUp },
  })),
}));

// Supabase server mock (for feedback/newsletter routes)
const mockGetUser = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSignInWithPassword = vi.fn();
vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser, signInWithPassword: mockSignInWithPassword },
    from: mockSupabaseFrom,
  })),
}));

// OpenAI mock (for gpt4 route)
vi.mock('openai', () => ({
  default: function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'test' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
            model: 'gpt-4o-mini',
          }),
        },
      },
    };
  },
}));

// Resend mock (for newsletter/feedback)
vi.mock('resend', () => ({
  Resend: function MockResend() {
    return {
      contacts: { create: vi.fn().mockResolvedValue({}) },
      emails: { send: vi.fn().mockResolvedValue({}) },
    };
  },
}));

// Email templates mock
vi.mock('@/lib/server/emailTemplates', () => ({
  generateFeedbackEmail: vi.fn().mockReturnValue('<html>feedback</html>'),
  getFeedbackEmailSubject: vi.fn().mockReturnValue('Feedback: test'),
}));

// Newsletter unsubscribe route mock (imported as relative path in newsletter/route.ts)
vi.mock('@/app/api/newsletter/unsubscribe/route', () => ({
  generateUnsubscribeUrl: vi.fn().mockReturnValue('https://example.com/unsubscribe'),
}));

// Validation mock — use real implementation
vi.mock('@/lib/server/validation', async () => {
  const actual = await vi.importActual('@/lib/server/validation');
  return actual;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(
  url: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> },
): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: options?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

/**
 * Set up mockAuthenticateRequest to return a successful auth result
 * with a chainable supabase mock.
 */
function authSuccess(userId = 'user-123') {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({
      data: [{ success: true, credits_granted: 100, new_balance: 200 }],
      error: null,
    }),
    storage: {
      from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) }),
    },
  };
  mockAuthenticateRequest.mockResolvedValue({
    user: { id: userId, email: `${userId}@test.com` },
    supabase: mockChain,
    error: null,
  });
  return mockChain;
}

/**
 * Helper to set checkRateLimit to return allowed: true with default counts.
 */
function rateLimitAllowed() {
  mockCheckRateLimit.mockResolvedValue({
    data: {
      allowed: true,
      hourly_count: 1,
      daily_count: 1,
      hourly_remaining: 99,
      daily_remaining: 499,
    },
    error: null,
  });
}

/**
 * Helper to set checkRateLimit to return allowed: false (rate limit exceeded).
 */
function rateLimitExceeded() {
  mockCheckRateLimit.mockResolvedValue({
    data: {
      allowed: false,
      hourly_count: 200,
      daily_count: 1000,
      hourly_remaining: 0,
      daily_remaining: 0,
    },
    error: null,
  });
}

/**
 * Helper to set checkRateLimit to return an error (RPC failure).
 */
function rateLimitError() {
  mockCheckRateLimit.mockResolvedValue({
    data: null,
    error: NextResponse.json({ error: 'Internal error' }, { status: 500 }),
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Required env vars for route module-level checks
process.env.OPENAI_API_KEY = 'test-key';
process.env.RESEND_API_KEY = 'test-key';

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. Rate-limited endpoints return 429 when checkRateLimit returns allowed:false
// ===========================================================================

describe('Rate-limited endpoints return 429 when rate limit exceeded', () => {
  it('GPT4 route returns 429 when rate limit exceeded', async () => {
    // Token lookup succeeds
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { user_id: 'user-123' },
            error: null,
          }),
        }),
      }),
    });

    rateLimitExceeded();

    const { POST } = await import('@/app/api/autoapply/gpt4/route');
    const req = createRequest('/api/autoapply/gpt4', {
      method: 'POST',
      body: {
        token: 'valid-token',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toBe('Rate limit exceeded');
  });

  it('Credits claim route returns 429 when rate limit exceeded', async () => {
    authSuccess();
    rateLimitExceeded();

    const { POST } = await import('@/app/api/student/credits/claim/route');
    const res = await POST();
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toBe('Rate limit exceeded');
  });

  it('Referral apply route returns 429 when rate limit exceeded', async () => {
    authSuccess();
    rateLimitExceeded();

    const { POST } = await import('@/app/api/student/referral/apply/route');
    const req = createRequest('/api/student/referral/apply', {
      method: 'POST',
      body: { code: 'abc12345' },
    });

    const res = await POST(req);
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toBe('Rate limit exceeded');
  });
});

// ===========================================================================
// 2. Rate-limited endpoints return 500 when checkRateLimit returns an error
// ===========================================================================

describe('Rate-limited endpoints return 500 when rate limit check errors', () => {
  it('GPT4 route returns 500 on rate limit RPC error', async () => {
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { user_id: 'user-123' },
            error: null,
          }),
        }),
      }),
    });

    rateLimitError();

    const { POST } = await import('@/app/api/autoapply/gpt4/route');
    const req = createRequest('/api/autoapply/gpt4', {
      method: 'POST',
      body: {
        token: 'valid-token',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('Credits claim route returns 500 on rate limit RPC error', async () => {
    authSuccess();
    rateLimitError();

    const { POST } = await import('@/app/api/student/credits/claim/route');
    const res = await POST();
    expect(res.status).toBe(500);
  });

  it('Referral apply route returns 500 on rate limit RPC error', async () => {
    authSuccess();
    rateLimitError();

    const { POST } = await import('@/app/api/student/referral/apply/route');
    const req = createRequest('/api/student/referral/apply', {
      method: 'POST',
      body: { code: 'abc12345' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ===========================================================================
// 3. GPT4 route: rate limit check happens AFTER token validation
// ===========================================================================

describe('GPT4 route: auth before rate limit ordering', () => {
  it('rejects invalid token with 401 WITHOUT calling checkRateLimit', async () => {
    // Token lookup fails (no matching token)
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    });

    const { POST } = await import('@/app/api/autoapply/gpt4/route');
    const req = createRequest('/api/autoapply/gpt4', {
      method: 'POST',
      body: {
        token: 'invalid-token',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    // Rate limit should NOT have been called — auth failed first
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it('rejects missing token with 400 WITHOUT calling checkRateLimit', async () => {
    const { POST } = await import('@/app/api/autoapply/gpt4/route');
    const req = createRequest('/api/autoapply/gpt4', {
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it('calls checkRateLimit with correct user_id after successful token lookup', async () => {
    const userId = 'user-from-token-456';
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { user_id: userId },
            error: null,
          }),
        }),
      }),
    });

    rateLimitAllowed();

    // Mock use_credits RPC
    mockServiceRpc.mockResolvedValue({
      data: [{ success: true }],
      error: null,
    });

    const { POST } = await import('@/app/api/autoapply/gpt4/route');
    const req = createRequest('/api/autoapply/gpt4', {
      method: 'POST',
      body: {
        token: 'valid-token',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });

    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith(userId, {
      endpoint: 'gpt4',
      hourlyLimit: 200,
      dailyLimit: 1000,
    });
  });
});

// ===========================================================================
// 4. Credits claim: rate limit response includes helpful info
// ===========================================================================

describe('Credits claim: rate limit response details', () => {
  it('includes rate limit counts in 429 response', async () => {
    authSuccess();

    mockCheckRateLimit.mockResolvedValue({
      data: {
        allowed: false,
        hourly_count: 10,
        daily_count: 50,
        hourly_remaining: 0,
        daily_remaining: 0,
      },
      error: null,
    });

    const { POST } = await import('@/app/api/student/credits/claim/route');
    const res = await POST();
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toBe('Rate limit exceeded');
    // The rateLimitExceededResponse mock spreads the result data into the body
    expect(json.hourly_count).toBe(10);
    expect(json.daily_count).toBe(50);
    expect(json.hourly_remaining).toBe(0);
    expect(json.daily_remaining).toBe(0);
  });

  it('passes correct config (hourly=10, daily=50) to checkRateLimit', async () => {
    authSuccess();
    rateLimitAllowed();
    mockLogApiCall.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/student/credits/claim/route');
    await POST();

    expect(mockCheckRateLimit).toHaveBeenCalledWith('user-123', {
      endpoint: 'credits-claim',
      hourlyLimit: 10,
      dailyLimit: 50,
    });
  });
});

// ===========================================================================
// 5. Referral apply: logs API call even on rate limit scenarios
// ===========================================================================

describe('Referral apply: logs API call for accurate counting', () => {
  it('logs API call even when code validation fails (missing code)', async () => {
    authSuccess();
    rateLimitAllowed();

    const { POST } = await import('@/app/api/student/referral/apply/route');
    const req = createRequest('/api/student/referral/apply', {
      method: 'POST',
      body: {},
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    // The route logs the attempt for rate limiting even on missing code
    expect(mockLogApiCall).toHaveBeenCalledWith('user-123', 'referral-apply');
  });

  it('logs API call even when code format is invalid', async () => {
    authSuccess();
    rateLimitAllowed();

    const { POST } = await import('@/app/api/student/referral/apply/route');
    const req = createRequest('/api/student/referral/apply', {
      method: 'POST',
      body: { code: 'invalid!' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    expect(mockLogApiCall).toHaveBeenCalledWith('user-123', 'referral-apply');
  });

  it('logs API call after successful referral code application', async () => {
    const mockChain = authSuccess();
    rateLimitAllowed();

    // Mock the apply_referral_code RPC on the auth supabase chain
    mockChain.rpc.mockResolvedValue({
      data: [{ success: true }],
      error: null,
    });

    const { POST } = await import('@/app/api/student/referral/apply/route');
    const req = createRequest('/api/student/referral/apply', {
      method: 'POST',
      body: { code: 'abc12345' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockLogApiCall).toHaveBeenCalledWith('user-123', 'referral-apply');
  });

  it('passes correct rate limit config (hourly=5, daily=20)', async () => {
    authSuccess();
    rateLimitAllowed();

    const { POST } = await import('@/app/api/student/referral/apply/route');
    const req = createRequest('/api/student/referral/apply', {
      method: 'POST',
      body: { code: 'abc12345' },
    });

    await POST(req);

    expect(mockCheckRateLimit).toHaveBeenCalledWith('user-123', {
      endpoint: 'referral-apply',
      hourlyLimit: 5,
      dailyLimit: 20,
    });
  });
});

// ===========================================================================
// 6. Signup IP rate limiting: returns 429 when count >= 10
// ===========================================================================

describe('Signup IP rate limiting: blocks when limit exceeded', () => {
  it('returns 429 when count_recent_signups_from_ip returns >= 10', async () => {
    // IP count returns 10 (at or above the limit)
    mockServiceRpc.mockResolvedValue({ data: 10, error: null });

    const { POST } = await import('@/app/api/auth/signup/route');
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'securePassword123',
        role: 'student',
      },
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    const res = await POST(req);
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(json.error).toContain('Too many signups');
  });

  it('returns 429 when count significantly exceeds limit', async () => {
    mockServiceRpc.mockResolvedValue({ data: 50, error: null });

    const { POST } = await import('@/app/api/auth/signup/route');
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'securePassword123',
        role: 'student',
      },
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('does NOT call checkRateLimit (uses custom IP-based RPC instead)', async () => {
    mockServiceRpc.mockResolvedValue({ data: 10, error: null });

    const { POST } = await import('@/app/api/auth/signup/route');
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'securePassword123',
        role: 'student',
      },
    });

    await POST(req);

    // Signup uses its own IP-based rate limiting, not the generic checkRateLimit
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it('passes correct parameters to count_recent_signups_from_ip', async () => {
    mockServiceRpc.mockResolvedValue({ data: 10, error: null });

    const { POST } = await import('@/app/api/auth/signup/route');
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'securePassword123',
        role: 'student',
      },
      headers: { 'x-forwarded-for': '192.168.1.100' },
    });

    await POST(req);

    expect(mockServiceRpc).toHaveBeenCalledWith('count_recent_signups_from_ip', {
      p_ip_address: '192.168.1.100',
      p_hours_ago: 48,
    });
  });
});

// ===========================================================================
// 7. Signup IP rate limiting: allows when count < 10
// ===========================================================================

describe('Signup IP rate limiting: allows when under limit', () => {
  it('allows signup when count is 0', async () => {
    // IP count returns 0
    mockServiceRpc.mockResolvedValue({ data: 0, error: null });

    // signUp succeeds
    mockServiceSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-1' }, session: null },
      error: null,
    });

    // IP tracking insert
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { POST } = await import('@/app/api/auth/signup/route');
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'newuser@example.com',
        password: 'securePassword123',
        role: 'student',
      },
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });

    const res = await POST(req);
    // Should not be 429
    expect(res.status).not.toBe(429);
  });

  it('allows signup when count is 9 (just under limit)', async () => {
    mockServiceRpc.mockResolvedValue({ data: 9, error: null });

    mockServiceSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-2' }, session: null },
      error: null,
    });

    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { POST } = await import('@/app/api/auth/signup/route');
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'another@example.com',
        password: 'securePassword123',
        role: 'company',
      },
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });

    const res = await POST(req);
    expect(res.status).not.toBe(429);
    // Verify signUp was actually called (not blocked)
    expect(mockServiceSignUp).toHaveBeenCalled();
  });
});

// ===========================================================================
// 8. Signup IP rate limiting: fails open when RPC errors
// ===========================================================================

describe('Signup IP rate limiting: fails open on RPC error', () => {
  it('allows signup when count_recent_signups_from_ip RPC returns an error', async () => {
    // RPC fails
    mockServiceRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection error', code: '500' },
    });

    // signUp should still proceed
    mockServiceSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-3' }, session: null },
      error: null,
    });

    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { POST } = await import('@/app/api/auth/signup/route');
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'failopen@example.com',
        password: 'securePassword123',
        role: 'student',
      },
      headers: { 'x-forwarded-for': '10.0.0.3' },
    });

    const res = await POST(req);
    // Should NOT be 429 or 500 — fail-open means signup proceeds
    expect(res.status).not.toBe(429);
    // signUp was called, proving we failed open
    expect(mockServiceSignUp).toHaveBeenCalled();
  });

  it('logs the error when rate limit check fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockServiceRpc.mockResolvedValue({
      data: null,
      error: { message: 'Connection timeout' },
    });

    mockServiceSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-4' }, session: null },
      error: null,
    });

    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { POST } = await import('@/app/api/auth/signup/route');
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        email: 'logtest@example.com',
        password: 'securePassword123',
        role: 'student',
      },
    });

    await POST(req);

    // Verify the error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Signup] Error checking IP rate limit:'),
      expect.objectContaining({ message: 'Connection timeout' }),
    );

    consoleSpy.mockRestore();
  });
});

// ===========================================================================
// 9. Non-rate-limited endpoints work without rate limit mocks
// ===========================================================================

describe('Non-rate-limited endpoints accept requests without rate limiting', () => {
  describe('Login route (no rate limiting)', () => {
    it('processes login without any rate limit check', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });

      const { POST } = await import('@/app/api/auth/login/route');
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'user@example.com', password: 'password123' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      // No rate limiting functions should have been called
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
      expect(mockLogApiCall).not.toHaveBeenCalled();
    });

    it('handles multiple rapid login attempts without blocking', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });

      const { POST } = await import('@/app/api/auth/login/route');

      // Simulate 5 rapid requests
      const results = await Promise.all(
        Array.from({ length: 5 }, () => {
          const req = createRequest('/api/auth/login', {
            method: 'POST',
            body: { email: 'user@example.com', password: 'password123' },
          });
          return POST(req);
        }),
      );

      // All should succeed (no 429s)
      for (const res of results) {
        expect(res.status).toBe(200);
      }

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });
  });

  describe('Newsletter route (no rate limiting)', () => {
    it('processes subscription without any rate limit check', async () => {
      const { POST } = await import('@/app/api/newsletter/route');
      const req = createRequest('/api/newsletter', {
        method: 'POST',
        body: { email: 'subscriber@example.com' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
      expect(mockLogApiCall).not.toHaveBeenCalled();
    });

    it('handles multiple rapid subscriptions without blocking', async () => {
      const { POST } = await import('@/app/api/newsletter/route');

      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) => {
          const req = createRequest('/api/newsletter', {
            method: 'POST',
            body: { email: `sub${i}@example.com` },
          });
          return POST(req);
        }),
      );

      for (const res of results) {
        expect(res.status).toBe(200);
      }

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });
  });

  describe('Feedback route (no rate limiting)', () => {
    /**
     * The feedback route calls getServiceSupabase().from() for:
     * 1. 'student' — .select('email').eq(...).maybeSingle()
     * 2. 'company' — .select('email').eq(...).maybeSingle()  (if student lookup returns null)
     * 3. 'user_feedback' — .insert({...}).select().single()
     *
     * We need mockServiceFrom to handle all three table names.
     */
    function setupFeedbackMocks() {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-456' } },
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'student' || table === 'company') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'user_feedback') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'feedback-1', created_at: '2026-01-01T00:00:00Z' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });
    }

    it('processes feedback without any rate limit check', async () => {
      setupFeedbackMocks();

      const { POST } = await import('@/app/api/feedback/route');
      const req = createRequest('/api/feedback', {
        method: 'POST',
        body: {
          feedback_type: 'bug',
          subject: 'Test bug report',
          description: 'This is a test bug report with enough characters.',
        },
        headers: {
          'user-agent': 'TestAgent/1.0',
          referer: 'https://jobelix.fr/dashboard',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
      expect(mockLogApiCall).not.toHaveBeenCalled();
    });

    it('handles multiple rapid feedback submissions without blocking', async () => {
      setupFeedbackMocks();

      const { POST } = await import('@/app/api/feedback/route');

      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) => {
          const req = createRequest('/api/feedback', {
            method: 'POST',
            body: {
              feedback_type: 'feature',
              subject: `Feature request ${i}`,
              description: `This is feature request number ${i} with enough characters.`,
            },
            headers: {
              'user-agent': 'TestAgent/1.0',
              referer: 'https://jobelix.fr/dashboard',
            },
          });
          return POST(req);
        }),
      );

      for (const res of results) {
        expect(res.status).toBe(200);
      }

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });
  });
});
