/**
 * Security Tests: Referral System & Credits System
 *
 * Tests for:
 * - Self-referral prevention (DB-enforced)
 * - Referral replay / double-use attacks
 * - 7-day referral window enforcement
 * - Code enumeration prevention (uniform errors)
 * - Referral rate limiting & auth
 * - Double-claiming daily credits
 * - Credits claim rate limiting & auth
 * - Credits balance default values & auth
 * - Credits can-claim timing & auth
 * - GPT4 credit deduction before API call (race condition prevention)
 * - GPT4 concurrent request protection (atomic deduction)
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
    NextResponse.json({ error: 'Rate limit exceeded', ...result }, { status: 429 })
  ),
  addRateLimitHeaders: vi.fn((response) => response),
}));

// Service supabase mock (for gpt4 token auth)
const mockServiceRpc = vi.fn();
const mockServiceFrom = vi.fn();
vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({
    rpc: mockServiceRpc,
    from: mockServiceFrom,
  })),
}));

// OpenAI mock (for gpt4 tests)
const mockOpenAICreate = vi.fn().mockResolvedValue({
  choices: [{ message: { content: 'test reply' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  model: 'gpt-4o-mini',
});
vi.mock('openai', () => ({
  default: function MockOpenAI() {
    return {
      chat: { completions: { create: mockOpenAICreate } },
    };
  },
}));

process.env.OPENAI_API_KEY = 'test-key';

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

function authSuccess(userId = 'user-123') {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({
      data: [{ success: true, credits_granted: 100, new_balance: 200 }],
      error: null,
    }),
  };
  mockAuthenticateRequest.mockResolvedValue({
    user: { id: userId, email: `${userId}@test.com` },
    supabase: mockChain,
    error: null,
  });
  return mockChain;
}

function authFailure() {
  mockAuthenticateRequest.mockResolvedValue({
    user: null,
    supabase: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  });
}

function rateLimitAllow() {
  mockCheckRateLimit.mockResolvedValue({
    data: {
      allowed: true,
      hourly_remaining: 100,
      daily_remaining: 1000,
      hourly_count: 0,
      daily_count: 0,
    },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Security: Referral System & Credits System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitAllow();
  });

  // =========================================================================
  // 1. Referral — self-referral prevention (DB-enforced)
  // =========================================================================
  describe('Referral — self-referral prevention', () => {
    it('rejects when user applies their own referral code (RPC returns error)', async () => {
      const mockChain = authSuccess('user-self');
      mockChain.rpc.mockResolvedValue({
        data: [{ success: false, error_message: 'Cannot use your own referral code' }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'owncode1' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Cannot use your own referral code');
    });

    it('succeeds when user applies a valid other user code', async () => {
      const mockChain = authSuccess('user-a');
      mockChain.rpc.mockResolvedValue({
        data: [{ success: true }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'valid123' },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // =========================================================================
  // 2. Referral — replay / double-use
  // =========================================================================
  describe('Referral — replay / double-use', () => {
    it('rejects second application of the same code (already used)', async () => {
      const mockChain = authSuccess('user-b');
      mockChain.rpc.mockResolvedValue({
        data: [{ success: false, error_message: 'Referral code already used' }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'used1234' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('rejects applying a different code after already using one (one per user)', async () => {
      const mockChain = authSuccess('user-c');
      mockChain.rpc.mockResolvedValue({
        data: [{ success: false, error_message: 'You have already used a referral code' }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'diff5678' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('already used a referral code');
    });
  });

  // =========================================================================
  // 3. Referral — 7-day window
  // =========================================================================
  describe('Referral — 7-day window', () => {
    it('rejects referral for account older than 7 days', async () => {
      const mockChain = authSuccess('old-user');
      mockChain.rpc.mockResolvedValue({
        data: [{ success: false, error_message: 'Referral period has expired' }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'late1234' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('expired');
    });
  });

  // =========================================================================
  // 4. Referral — code enumeration prevention
  // =========================================================================
  describe('Referral — code enumeration prevention', () => {
    it('rejects invalid code format with generic error (no format hints)', async () => {
      authSuccess('user-d');

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'ab!@' }, // invalid format
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      // Generic message — must NOT reveal format requirements
      expect(body.error).toBe('Invalid or expired referral code');
      expect(JSON.stringify(body)).not.toContain('alphanumeric');
      expect(JSON.stringify(body)).not.toContain('8 characters');
    });

    it('rejects valid format but non-existent code with generic error from RPC', async () => {
      const mockChain = authSuccess('user-e');
      mockChain.rpc.mockResolvedValue({
        data: [{ success: false, error_message: 'Invalid or expired referral code' }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'nonexist' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid or expired referral code');
    });

    it('logs API call for both invalid format and valid-but-wrong codes', async () => {
      const mockChain = authSuccess('user-f');

      const { POST } = await import('@/app/api/student/referral/apply/route');

      // Invalid format — still logs
      const req1 = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'short' },
      });
      await POST(req1);
      expect(mockLogApiCall).toHaveBeenCalledWith('user-f', 'referral-apply');

      vi.clearAllMocks();
      rateLimitAllow();

      // Valid format but non-existent — also logs
      const mockChain2 = authSuccess('user-f');
      mockChain2.rpc.mockResolvedValue({
        data: [{ success: false, error_message: 'Invalid or expired referral code' }],
        error: null,
      });

      const req2 = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'fake1234' },
      });
      await POST(req2);
      expect(mockLogApiCall).toHaveBeenCalledWith('user-f', 'referral-apply');
    });
  });

  // =========================================================================
  // 5. Referral — rate limiting
  // =========================================================================
  describe('Referral — rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      authSuccess('user-g');
      mockCheckRateLimit.mockResolvedValue({
        data: {
          allowed: false,
          hourly_remaining: 0,
          daily_remaining: 0,
          hourly_count: 5,
          daily_count: 20,
        },
        error: null,
      });

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'rate1234' },
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });

    it('returns 500 when rate limit check itself errors', async () => {
      authSuccess('user-h');
      mockCheckRateLimit.mockResolvedValue({
        data: null,
        error: NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      });

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'errc1234' },
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  // =========================================================================
  // 6. Referral — auth required
  // =========================================================================
  describe('Referral — auth required', () => {
    it('returns 401 when unauthenticated', async () => {
      authFailure();

      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'noauth12' },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 7. Credits claim — double claiming
  // =========================================================================
  describe('Credits claim — double claiming', () => {
    it('first claim today succeeds with credits_granted > 0', async () => {
      const mockChain = authSuccess('user-claim1');
      mockChain.rpc.mockResolvedValue({
        data: [{ success: true, credits_granted: 100, new_balance: 200 }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/credits/claim/route');
      const res = await POST();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.credits_granted).toBe(100);
      expect(body.balance).toBe(200);
      expect(body.message).toBe('Daily credits claimed successfully');
    });

    it('second claim today returns 200 with "already claimed" (not an error status)', async () => {
      const mockChain = authSuccess('user-claim2');
      mockChain.rpc.mockResolvedValue({
        data: [{ success: false, credits_granted: 0, new_balance: 200 }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/credits/claim/route');
      const res = await POST();
      expect(res.status).toBe(200); // NOT 4xx — this is intentional
      const body = await res.json();
      expect(body.message).toBe('Daily credits already claimed for today');
      expect(body.credits_granted).toBe(0);
    });

    it('returns 500 when RPC returns an error', async () => {
      const mockChain = authSuccess('user-claim3');
      mockChain.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const { POST } = await import('@/app/api/student/credits/claim/route');
      const res = await POST();
      expect(res.status).toBe(500);
    });

    it('returns 500 when RPC returns empty result', async () => {
      const mockChain = authSuccess('user-claim4');
      mockChain.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/student/credits/claim/route');
      const res = await POST();
      expect(res.status).toBe(500);
    });
  });

  // =========================================================================
  // 8. Credits claim — rate limiting
  // =========================================================================
  describe('Credits claim — rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      authSuccess('user-claimrl');
      mockCheckRateLimit.mockResolvedValue({
        data: {
          allowed: false,
          hourly_remaining: 0,
          daily_remaining: 0,
          hourly_count: 10,
          daily_count: 50,
        },
        error: null,
      });

      const { POST } = await import('@/app/api/student/credits/claim/route');
      const res = await POST();
      expect(res.status).toBe(429);
    });
  });

  // =========================================================================
  // 9. Credits claim — auth
  // =========================================================================
  describe('Credits claim — auth', () => {
    it('returns 401 when unauthenticated', async () => {
      authFailure();

      const { POST } = await import('@/app/api/student/credits/claim/route');
      const res = await POST();
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 10. Credits balance — default values
  // =========================================================================
  describe('Credits balance — default values', () => {
    it('returns default zeros when no credit record exists', async () => {
      const mockChain = authSuccess('user-nobal');
      // Chain: from('user_credits').select(...).eq(...).maybeSingle()
      mockChain.from.mockReturnThis();
      mockChain.select.mockReturnThis();
      mockChain.eq.mockReturnThis();
      mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });

      const { GET } = await import('@/app/api/student/credits/balance/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        balance: 0,
        total_earned: 0,
        total_purchased: 0,
        total_used: 0,
        last_updated: null,
      });
    });

    it('returns actual values when credit record exists', async () => {
      const mockChain = authSuccess('user-hasbal');
      const creditData = {
        balance: 500,
        total_earned: 300,
        total_purchased: 400,
        total_used: 200,
        last_updated: '2026-02-13T10:00:00Z',
      };
      mockChain.from.mockReturnThis();
      mockChain.select.mockReturnThis();
      mockChain.eq.mockReturnThis();
      mockChain.maybeSingle.mockResolvedValue({ data: creditData, error: null });

      const { GET } = await import('@/app/api/student/credits/balance/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(creditData);
    });
  });

  // =========================================================================
  // 11. Credits balance — auth
  // =========================================================================
  describe('Credits balance — auth', () => {
    it('returns 401 when unauthenticated', async () => {
      authFailure();

      const { GET } = await import('@/app/api/student/credits/balance/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 12. Credits can-claim — timing
  // =========================================================================
  describe('Credits can-claim — timing', () => {
    it('returns can_claim: true when not claimed today', async () => {
      const mockChain = authSuccess('user-canclaim');
      // Chain: from('daily_credit_grants').select('granted_at').eq(...).eq(...).maybeSingle()
      mockChain.from.mockReturnThis();
      mockChain.select.mockReturnThis();
      mockChain.eq.mockReturnThis();
      mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });

      const { GET } = await import('@/app/api/student/credits/can-claim/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.can_claim).toBe(true);
      expect(body.claimed_today).toBe(false);
    });

    it('returns can_claim: false with next_claim_available when already claimed today', async () => {
      const mockChain = authSuccess('user-alreadyclaimed');
      const grantedAt = '2026-02-13T08:00:00Z';
      mockChain.from.mockReturnThis();
      mockChain.select.mockReturnThis();
      mockChain.eq.mockReturnThis();
      mockChain.maybeSingle.mockResolvedValue({
        data: { granted_at: grantedAt },
        error: null,
      });

      const { GET } = await import('@/app/api/student/credits/can-claim/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.can_claim).toBe(false);
      expect(body.claimed_today).toBe(true);
      expect(body.last_claim).toBe(grantedAt);
      expect(body.next_claim_available).toBeDefined();
    });
  });

  // =========================================================================
  // 13. Credits can-claim — auth
  // =========================================================================
  describe('Credits can-claim — auth', () => {
    it('returns 401 when unauthenticated', async () => {
      authFailure();

      const { GET } = await import('@/app/api/student/credits/can-claim/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 14. GPT4 — credit deduction before API call
  // =========================================================================
  describe('GPT4 — credit deduction before API call', () => {
    function setupValidToken(userId = 'user-123') {
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
    }

    const validGpt4Body = {
      token: 'valid-api-token',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };

    it('deducts credit and calls OpenAI when sufficient credits', async () => {
      setupValidToken();
      // use_credits succeeds
      mockServiceRpc
        .mockResolvedValueOnce({ data: [{ success: true }], error: null })
        // update_token_usage
        .mockResolvedValueOnce({ data: null, error: null });

      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toBe('test reply');

      // Verify credit was deducted BEFORE OpenAI was called
      expect(mockServiceRpc).toHaveBeenCalledWith('use_credits', {
        p_user_id: 'user-123',
        p_amount: 1,
      });
      expect(mockOpenAICreate).toHaveBeenCalled();
    });

    it('returns 402 and does NOT call OpenAI when insufficient credits', async () => {
      setupValidToken();
      // use_credits fails — insufficient
      mockServiceRpc.mockResolvedValueOnce({
        data: [{ success: false }],
        error: null,
      });

      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body,
      });
      const res = await POST(req);
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toBe('Insufficient credits');

      // OpenAI must NOT have been called
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });

    it('returns 402 and does NOT call OpenAI when credit deduction errors', async () => {
      setupValidToken();
      // use_credits DB error
      mockServiceRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB connection lost' },
      });

      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body,
      });
      const res = await POST(req);
      expect(res.status).toBe(402);

      // OpenAI must NOT have been called
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 15. GPT4 — concurrent request protection
  // =========================================================================
  describe('GPT4 — concurrent request protection', () => {
    it('atomic credit deduction: second concurrent request gets 402 if only 1 credit', async () => {
      // Both requests use same token/user
      mockServiceFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { user_id: 'user-race' },
              error: null,
            }),
          }),
        }),
      });

      // First call: use_credits succeeds, then update_token_usage
      // Second call: use_credits fails (insufficient)
      mockServiceRpc
        .mockResolvedValueOnce({ data: [{ success: true }], error: null })   // 1st use_credits
        .mockResolvedValueOnce({ data: [{ success: false }], error: null })  // 2nd use_credits
        .mockResolvedValueOnce({ data: null, error: null });                 // 1st update_token_usage

      const { POST } = await import('@/app/api/autoapply/gpt4/route');

      const req1 = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'tok1', messages: [{ role: 'user', content: 'req1' }] },
      });
      const req2 = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'tok1', messages: [{ role: 'user', content: 'req2' }] },
      });

      // Fire both concurrently
      const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);

      const statuses = [res1.status, res2.status].sort();
      // One should succeed (200), the other should fail (402)
      expect(statuses).toEqual([200, 402]);
    });
  });
});
