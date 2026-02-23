/**
 * Security Tests: Input Fuzzing & Malformed Data Handling
 *
 * Tests for:
 * - Oversized payloads and boundary values
 * - Malformed JSON and encoding attacks
 * - Null bytes and unicode exploits
 * - Type confusion (wrong types in fields)
 * - Input limit enforcement (GPT4 route)
 * - Field whitelist enforcement (draft routes)
 * - UUID validation and path traversal prevention
 * - Zod schema boundary testing (signup, feedback)
 * - Referral code format validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthenticateRequest = vi.fn();
vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

const mockCheckRateLimit = vi.fn();
const mockLogApiCall = vi.fn();
vi.mock('@/lib/server/rateLimiting', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  logApiCall: (...args: unknown[]) => mockLogApiCall(...args),
  rateLimitExceededResponse: vi.fn((_config, _result) =>
    NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  ),
  addRateLimitHeaders: vi.fn((response) => response),
}));

const mockServiceRpc = vi.fn();
const mockServiceFrom = vi.fn();
const mockServiceSignUp = vi.fn();
vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({
    rpc: mockServiceRpc,
    from: mockServiceFrom,
    auth: { signUp: mockServiceSignUp },
    storage: { from: vi.fn() },
  })),
}));

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    },
    from: vi.fn(),
  })),
}));

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

vi.mock('resend', () => ({
  Resend: function MockResend() {
    return { emails: { send: vi.fn().mockResolvedValue({}) } };
  },
}));

vi.mock('@/lib/server/emailTemplates', () => ({
  generateFeedbackEmail: vi.fn().mockReturnValue('<html></html>'),
  getFeedbackEmailSubject: vi.fn().mockReturnValue('test'),
}));

vi.mock('@/lib/server/draftMappers', () => ({
  mapDraftToStudent: vi.fn().mockReturnValue({}),
  mapDraftToAcademic: vi.fn().mockReturnValue([]),
  mapDraftToExperience: vi.fn().mockReturnValue([]),
  mapDraftToProjects: vi.fn().mockReturnValue([]),
  mapDraftToSkills: vi.fn().mockReturnValue([]),
  mapDraftToLanguages: vi.fn().mockReturnValue([]),
  mapDraftToPublications: vi.fn().mockReturnValue([]),
  mapDraftToCertifications: vi.fn().mockReturnValue([]),
  mapDraftToSocialLinks: vi.fn().mockReturnValue([]),
}));

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
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: { from: vi.fn().mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) }) },
  };
  mockAuthenticateRequest.mockResolvedValue({
    user: { id: userId, email: `${userId}@test.com` },
    supabase: mockChain,
    error: null,
  });
  return mockChain;
}

function rateLimitAllow() {
  mockCheckRateLimit.mockResolvedValue({
    data: { allowed: true, hourly_remaining: 100, daily_remaining: 1000, hourly_count: 1, daily_count: 1 },
    error: null,
  });
}

/** Sets up mocks so the GPT4 route succeeds through token + credit checks. */
function setupGpt4Mocks() {
  process.env.OPENAI_API_KEY = 'test-key';
  // Token validation: serviceSupabase.from('api_tokens').select('user_id').eq('token', ...).maybeSingle()
  mockServiceFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'user-123' }, error: null }),
      }),
    }),
  });
  // Credit deduction: serviceSupabase.rpc('use_credits', ...) then rpc('update_token_usage', ...)
  mockServiceRpc
    .mockResolvedValueOnce({ data: [{ success: true }], error: null })  // use_credits
    .mockResolvedValueOnce({ data: null, error: null });                // update_token_usage
}

function validGpt4Body(overrides: Record<string, unknown> = {}) {
  return {
    token: 'valid-token',
    messages: [{ role: 'user', content: 'Hello' }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Security: Input Fuzzing & Malformed Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    rateLimitAllow();
  });

  // =========================================================================
  // 1. GPT4 Route — Input Limits
  // =========================================================================
  describe('GPT4 Route — input limit enforcement', () => {
    beforeEach(() => {
      setupGpt4Mocks();
    });

    it('accepts exactly MAX_MESSAGES (5) messages', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const messages = Array.from({ length: 5 }, (_, i) => ({ role: 'user', content: `msg ${i}` }));
      const req = createRequest('/api/autoapply/gpt4', { method: 'POST', body: { token: 'valid-token', messages } });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('rejects MAX_MESSAGES+1 (6) messages with "messages too large"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const messages = Array.from({ length: 6 }, (_, i) => ({ role: 'user', content: `msg ${i}` }));
      const req = createRequest('/api/autoapply/gpt4', { method: 'POST', body: { token: 'valid-token', messages } });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('messages too large');
    });

    it('rejects empty messages array with "messages too large"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', { method: 'POST', body: { token: 'valid-token', messages: [] } });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('messages too large');
    });

    it('accepts a message with exactly MAX_CHARS_PER_MESSAGE (30000) chars', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const content = 'a'.repeat(30_000);
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'valid-token', messages: [{ role: 'user', content }] },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('rejects a message exceeding MAX_CHARS_PER_MESSAGE with "message too long"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const content = 'a'.repeat(30_001);
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'valid-token', messages: [{ role: 'user', content }] },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('message too long');
    });

    it('rejects when total chars just exceed MAX_TOTAL_CHARS with "payload too large"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      // 3 messages of 10001 chars each = 30003 total (> 30000)
      const content = 'a'.repeat(10_001);
      const messages = [
        { role: 'user', content },
        { role: 'assistant', content },
        { role: 'user', content },
      ];
      const req = createRequest('/api/autoapply/gpt4', { method: 'POST', body: { token: 'valid-token', messages } });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('payload too large');
    });

    it('rejects invalid message role (e.g., "hacker") with "invalid message role"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body({ messages: [{ role: 'hacker', content: 'hi' }] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid message role');
    });

    it('rejects non-string content (number) with "invalid message content"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body({ messages: [{ role: 'user', content: 42 }] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid message content');
    });

    it('rejects null content with "invalid message content"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body({ messages: [{ role: 'user', content: null }] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid message content');
    });

    it('rejects object content with "invalid message content"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body({ messages: [{ role: 'user', content: { injection: true } }] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid message content');
    });

    it('clamps temperature = -1 to 0 (not rejected)', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body({ temperature: -1 }),
      });
      const res = await POST(req);
      // Should succeed — temperature is clamped, not rejected
      expect(res.status).toBe(200);
    });

    it('clamps temperature = 999 to 2 (not rejected)', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body({ temperature: 999 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('clamps temperature = NaN to default 0.8 (not rejected)', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: validGpt4Body({ temperature: 'not-a-number' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('rejects missing token with "token required"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { messages: [{ role: 'user', content: 'hi' }] },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('token required');
    });

    it('rejects missing messages with "messages array required"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'valid-token' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('messages array required');
    });

    it('rejects messages as string instead of array with "messages array required"', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'valid-token', messages: 'not an array' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('messages array required');
    });
  });

  // =========================================================================
  // 2. Profile Draft Finalize — UUID Validation + Info Leakage
  // =========================================================================
  describe('Profile Draft Finalize — UUID validation & info leakage', () => {
    it('rejects invalid draftId (not UUID) with 400 "Invalid ID format"', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId: 'not-a-uuid' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid ID format');
    });

    it('rejects path traversal draftId (../../../etc/passwd) with 400', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId: '../../../etc/passwd' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid ID format');
    });

    it('rejects draftId with null bytes with 400', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId: '12345678-1234-1234-1234-123456789abc\x00DROP TABLE' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid ID format');
    });

    it('returns generic finalize error when RPC fails (no details leakage)', async () => {
      const chain = authSuccess();
      const draftId = '12345678-1234-1234-1234-123456789abc';
      // Draft fetch succeeds
      chain.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: draftId, student_id: 'user-123' }, error: null }),
            }),
          }),
        }),
      });
      // RPC finalize fails with a detailed error message
      chain.rpc.mockResolvedValue({
        data: null,
        error: { message: 'relation "student_profiles" does not exist', code: '42P01' },
      });

      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId },
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Failed to save profile');
      expect(json).not.toHaveProperty('details');
    });
  });

  // =========================================================================
  // 3. Company Offer Draft [id] — UUID Validation & Field Whitelist
  // =========================================================================
  describe('Company Offer Draft [id] — UUID validation & field whitelist', () => {
    it('rejects non-UUID id in GET with 400 "Invalid ID format"', async () => {
      authSuccess();
      const { GET } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest('/api/company/offer/draft/not-a-uuid');
      const res = await GET(req, { params: Promise.resolve({ id: 'not-a-uuid' }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid ID format');
    });

    it('rejects path traversal id in PUT with 400', async () => {
      authSuccess();
      const { PUT } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest('/api/company/offer/draft/../../etc/passwd', {
        method: 'PUT',
        body: { basic_info: { title: 'test' } },
      });
      const res = await PUT(req, { params: Promise.resolve({ id: '../../etc/passwd' }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid ID format');
    });

    it('strips non-whitelisted fields from PUT updates', async () => {
      const chain = authSuccess();
      const draftId = '12345678-1234-1234-1234-123456789abc';

      // Mock the update chain to capture what was passed
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: draftId, company_id: 'user-123' },
                error: null,
              }),
            }),
          }),
        }),
      });
      chain.from.mockReturnValue({
        update: mockUpdate,
      });

      const { PUT } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest(`/api/company/offer/draft/${draftId}`, {
        method: 'PUT',
        body: {
          basic_info: { title: 'Legit' },
          company_id: 'attacker-id',       // should be stripped
          id: 'fake-id',                   // should be stripped
          __proto__: { admin: true },       // should be stripped
          skills: ['JavaScript'],           // allowed
        },
      });
      await PUT(req, { params: Promise.resolve({ id: draftId }) });

      // The update call should only include whitelisted fields + updated_at
      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg).toHaveProperty('basic_info');
      expect(updateArg).toHaveProperty('skills');
      expect(updateArg).toHaveProperty('updated_at');
      expect(updateArg).not.toHaveProperty('company_id');
      expect(updateArg).not.toHaveProperty('id');
    });
  });

  // =========================================================================
  // 4. Signup — Zod Validation
  // =========================================================================
  describe('Signup — Zod validation', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      // IP rate limit check: rpc returns count 0
      mockServiceRpc.mockResolvedValue({ data: 0, error: null });
      // IP tracking insert: from returns insert chain
      mockServiceFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
    });

    it('rejects missing email with 400', async () => {
      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { password: 'password123', role: 'student' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid email format with 400', async () => {
      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { email: 'not-an-email', password: 'password123', role: 'student' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects role not in ["student", "company"] with 400', async () => {
      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123', role: 'admin' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('ignores extra fields in body (no error)', async () => {
      mockServiceSignUp.mockResolvedValue({
        data: { user: { id: 'new-user' }, session: null },
        error: null,
      });
      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'password123',
          role: 'student',
          isAdmin: true,            // extra — should be ignored
          __proto__: { x: true },   // extra — should be ignored
        },
      });
      const res = await POST(req);
      // Should not fail due to extra fields; Zod strips them
      expect(res.status).not.toBe(400);
    });
  });

  // =========================================================================
  // 5. Referral Apply — Code Format Validation
  // =========================================================================
  describe('Referral Apply — code format validation', () => {
    it('rejects code with special characters', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'ab!@#$12' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects code too short (3 chars)', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'abc' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects code too long (> 8 chars)', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'abcdefgh9' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects code with spaces', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'ab cd ef gh' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects code with unicode characters', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'abcdéfgh' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects non-string code (number)', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 12345678 },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 6. Feedback — Validation
  // =========================================================================
  describe('Feedback — schema validation', () => {
    it('rejects missing feedback_type with 400', async () => {
      const { POST } = await import('@/app/api/feedback/route');
      const req = createRequest('/api/feedback', {
        method: 'POST',
        body: { subject: 'Bug report', description: 'Something is broken badly' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid feedback_type (not "bug" or "feature") with 400', async () => {
      const { POST } = await import('@/app/api/feedback/route');
      const req = createRequest('/api/feedback', {
        method: 'POST',
        body: { feedback_type: 'exploit', subject: 'Bug report', description: 'Something is broken badly' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects subject shorter than 3 chars with 400', async () => {
      const { POST } = await import('@/app/api/feedback/route');
      const req = createRequest('/api/feedback', {
        method: 'POST',
        body: { feedback_type: 'bug', subject: 'ab', description: 'Something is broken badly' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects description shorter than 10 chars with 400', async () => {
      const { POST } = await import('@/app/api/feedback/route');
      const req = createRequest('/api/feedback', {
        method: 'POST',
        body: { feedback_type: 'bug', subject: 'Bug report', description: 'short' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 7. General Malformed Input — Graceful Error Handling
  // =========================================================================
  describe('General malformed input handling', () => {
    it('GPT4 route: empty body causes graceful error (not crash)', async () => {
      setupGpt4Mocks();
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      // NextRequest with empty body (Content-Type set but no body)
      const req = new NextRequest('http://localhost:3000/api/autoapply/gpt4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // no body at all
      });
      const res = await POST(req);
      // Should return a proper error response (500 from catch, since req.json() throws)
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(600);
    });

    it('GPT4 route: body is a string (not JSON object) → graceful error', async () => {
      setupGpt4Mocks();
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = new NextRequest('http://localhost:3000/api/autoapply/gpt4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '"just a string"',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('token required');
    });

    it('GPT4 route: array where object expected → graceful error', async () => {
      setupGpt4Mocks();
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = new NextRequest('http://localhost:3000/api/autoapply/gpt4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([1, 2, 3]),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('token required');
    });

    it('Referral apply: null bytes in code field are rejected', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'abcd\x00efgh' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('Student profile draft PUT: null bytes in field values do not crash', async () => {
      const chain = authSuccess();
      const validDraftId = '12345678-1234-1234-1234-123456789abc';

      chain.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: validDraftId, student_name: 'test\x00injected' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const { PUT } = await import('@/app/api/student/profile/draft/route');
      const req = createRequest('/api/student/profile/draft', {
        method: 'PUT',
        body: { draftId: validDraftId, updates: { student_name: 'test\x00injected' } },
      });
      const res = await PUT(req);
      // Should not crash — the route passes data through to Supabase
      expect(res.status).toBeLessThan(600);
    });

    it('GPT4 route: extremely long string values (>1MB) in content are rejected', async () => {
      setupGpt4Mocks();
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const hugeContent = 'x'.repeat(1_100_000); // > 1MB
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'valid-token', messages: [{ role: 'user', content: hugeContent }] },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('message too long');
    });

    it('Profile draft finalize: empty draftId string rejected', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId: '' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid ID format');
    });

    it('Profile draft finalize: integer draftId rejected', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId: 99999 },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid ID format');
    });

    it('Student profile draft PUT: non-whitelisted fields are stripped', async () => {
      const chain = authSuccess();
      const validDraftId = '12345678-1234-1234-1234-123456789abc';
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: validDraftId, student_name: 'test' },
                error: null,
              }),
            }),
          }),
        }),
      });
      chain.from.mockReturnValue({ update: mockUpdate });

      const { PUT } = await import('@/app/api/student/profile/draft/route');
      const req = createRequest('/api/student/profile/draft', {
        method: 'PUT',
        body: {
          draftId: validDraftId,
          updates: {
            student_name: 'Legit Name',       // allowed
            student_id: 'attacker-id',         // NOT allowed — should be stripped
            id: 'fake-id',                     // NOT allowed — should be stripped
            status: 'published',               // NOT in whitelist — should be stripped
          },
        },
      });
      await PUT(req);

      // The update call should only include whitelisted fields + status:'editing' + updated_at
      const updateArg = mockUpdate.mock.calls[0][0];
      expect(updateArg).toHaveProperty('student_name', 'Legit Name');
      expect(updateArg).toHaveProperty('status', 'editing'); // always forced to 'editing'
      expect(updateArg).toHaveProperty('updated_at');
      expect(updateArg).not.toHaveProperty('student_id');
      expect(updateArg).not.toHaveProperty('id');
    });
  });
});
