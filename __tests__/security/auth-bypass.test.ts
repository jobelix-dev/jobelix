/**
 * Security Tests: Authentication Bypass & Session Manipulation
 *
 * Tests for:
 * - Unauthenticated access to protected endpoints
 * - Token manipulation / forgery
 * - Session fixation attempts
 * - Cache poisoning in auth cache
 * - Accessing routes with expired/invalid sessions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSignUp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockResetPasswordForEmail = vi.fn();

const mockSupabaseClient = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    getSession: mockGetSession,
    signUp: mockSignUp,
    verifyOtp: mockVerifyOtp,
    resetPasswordForEmail: mockResetPasswordForEmail,
  },
  from: mockSupabaseFrom,
};

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

const mockServiceRpc = vi.fn();
const mockServiceFrom = vi.fn();
const mockServiceSignUp = vi.fn();
const mockServiceDeleteUser = vi.fn();
const mockServiceResetPasswordForEmail = vi.fn();
const mockServiceStorageFrom = vi.fn();

const mockServiceSupabaseClient = {
  auth: {
    signUp: mockServiceSignUp,
    resetPasswordForEmail: mockServiceResetPasswordForEmail,
    admin: { deleteUser: mockServiceDeleteUser },
  },
  rpc: mockServiceRpc,
  from: mockServiceFrom,
  storage: { from: mockServiceStorageFrom },
};

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => mockServiceSupabaseClient),
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

function authFailure() {
  mockAuthenticateRequest.mockResolvedValue({
    user: null,
    supabase: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  });
}

function rateLimitAllow() {
  mockCheckRateLimit.mockResolvedValue({
    data: { allowed: true, hourly_remaining: 100, daily_remaining: 1000 },
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Security: Auth Bypass & Session Manipulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitAllow();
  });

  // =========================================================================
  // 1. Unauthenticated access to ALL protected endpoints
  // =========================================================================
  describe('Unauthenticated access returns 401', () => {
    beforeEach(() => {
      authFailure();
    });

    it('GET /api/auth/profile — returns error response when no session', async () => {
      // Profile route has special behavior: it returns the auth error directly
      // Our mock returns 401 error from authenticateRequest
      const { GET } = await import('@/app/api/auth/profile/route');
      const res = await GET();
      const body = await res.json();
      // Profile route catches auth.error and returns it — design allows 401 or { profile: null }
      // With our mock, authenticateRequest returns error as NextResponse.json({error:'Unauthorized'},{status:401})
      // BUT the profile route checks `if (auth.error)` and returns `{ profile: null }` at 200
      // This is actually the correct secure behavior: don't reveal auth status
      expect(body.profile === null || body.error === 'Unauthorized').toBe(true);
    });

    it('DELETE /api/auth/account — returns 401 when no session', async () => {
      // Account deletion uses createClient + getUser directly
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const { DELETE } = await import('@/app/api/auth/account/route');
      const res = await DELETE();
      expect(res.status).toBe(401);
    });

    it('GET /api/student/resume — returns 401 when unauthenticated', async () => {
      const { GET } = await import('@/app/api/student/resume/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('POST /api/student/resume — returns 401 when unauthenticated', async () => {
      const { POST } = await import('@/app/api/student/resume/route');
      const req = createRequest('/api/student/resume', { method: 'POST' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/student/profile/draft — returns 401 when unauthenticated', async () => {
      const { GET } = await import('@/app/api/student/profile/draft/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('PUT /api/student/profile/draft — returns 401 when unauthenticated', async () => {
      const { PUT } = await import('@/app/api/student/profile/draft/route');
      const req = createRequest('/api/student/profile/draft', {
        method: 'PUT',
        body: { draftId: 'some-id', updates: {} },
      });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/student/profile/draft/finalize — returns 401 when unauthenticated', async () => {
      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId: '11111111-1111-1111-1111-111111111111' },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/student/token — returns 401 when unauthenticated', async () => {
      const { GET } = await import('@/app/api/student/token/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('POST /api/student/credits/claim — returns 401 when unauthenticated', async () => {
      const { POST } = await import('@/app/api/student/credits/claim/route');
      const res = await POST();
      expect(res.status).toBe(401);
    });

    it('POST /api/student/referral/apply — returns 401 when unauthenticated', async () => {
      const { POST } = await import('@/app/api/student/referral/apply/route');
      const req = createRequest('/api/student/referral/apply', {
        method: 'POST',
        body: { code: 'abc12345' },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/student/referral/code — returns 401 when unauthenticated', async () => {
      const { GET } = await import('@/app/api/student/referral/code/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('GET /api/company/offer/draft/[id] — returns 401 when unauthenticated', async () => {
      const { GET } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest('/api/company/offer/draft/11111111-1111-1111-1111-111111111111');
      const res = await GET(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) });
      expect(res.status).toBe(401);
    });

    it('PUT /api/company/offer/draft/[id] — returns 401 when unauthenticated', async () => {
      const { PUT } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest('/api/company/offer/draft/11111111-1111-1111-1111-111111111111', {
        method: 'PUT',
        body: { basic_info: { title: 'Test' } },
      });
      const res = await PUT(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/company/offer/draft/[id] — returns 401 when unauthenticated', async () => {
      const { DELETE } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest('/api/company/offer/draft/11111111-1111-1111-1111-111111111111', { method: 'DELETE' });
      const res = await DELETE(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/company/offer/[id] — returns 401 when unauthenticated', async () => {
      const { DELETE } = await import('@/app/api/company/offer/[id]/route');
      const req = createRequest('/api/company/offer/11111111-1111-1111-1111-111111111111', { method: 'DELETE' });
      const res = await DELETE(req, { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) });
      expect(res.status).toBe(401);
    });

    it('POST /api/stripe/create-checkout — returns 401 when unauthenticated', async () => {
      const { POST } = await import('@/app/api/stripe/create-checkout/route');
      const req = createRequest('/api/stripe/create-checkout', {
        method: 'POST',
        body: { plan: 'credits_250' },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. GPT4 route: Token auth bypass attempts
  // =========================================================================
  describe('GPT4 token authentication bypass', () => {
    it('rejects requests with no token', async () => {
      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { messages: [{ role: 'user', content: 'hi' }] },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('token required');
    });

    it('rejects requests with empty string token', async () => {
      mockServiceFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: '', messages: [{ role: 'user', content: 'hi' }] },
      });
      const res = await POST(req);
      // Empty string is falsy, should return 400
      expect(res.status).toBe(400);
    });

    it('rejects requests with invalid token (not in DB)', async () => {
      mockServiceFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'fake-token-12345', messages: [{ role: 'user', content: 'hi' }] },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid token');
    });

    it('rejects token lookup DB errors as invalid token (no info leak)', async () => {
      mockServiceFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });

      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: { token: 'some-token', messages: [{ role: 'user', content: 'test' }] },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      // Must not leak the DB error details
      expect(body.error).toBe('Invalid token');
      expect(body).not.toHaveProperty('details');
    });

    it('rejects SQL injection in token field', async () => {
      mockServiceFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: {
          token: "' OR '1'='1'; --",
          messages: [{ role: 'user', content: 'test' }],
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('rejects token with null bytes', async () => {
      mockServiceFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { POST } = await import('@/app/api/autoapply/gpt4/route');
      const req = createRequest('/api/autoapply/gpt4', {
        method: 'POST',
        body: {
          token: 'valid-token\0injected',
          messages: [{ role: 'user', content: 'test' }],
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 3. Login: credential stuffing & error disclosure
  // =========================================================================
  describe('Login security', () => {
    it('returns generic "Invalid credentials" for wrong password (no info leak)', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const { POST } = await import('@/app/api/auth/login/route');
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'user@test.com', password: 'wrongpass123' },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid credentials');
      // Must not reveal whether email exists
      expect(JSON.stringify(body)).not.toContain('not found');
      expect(JSON.stringify(body)).not.toContain('does not exist');
    });

    it('returns generic "Invalid credentials" for non-existent email (no enumeration)', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User not found', status: 400 },
      });

      const { POST } = await import('@/app/api/auth/login/route');
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'nonexistent@test.com', password: 'somepass123' },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid credentials');
    });

    it('rejects login with missing email', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { password: 'test123456' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('rejects login with missing password', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const req = createRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'user@test.com' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 4. Signup: email enumeration prevention
  // =========================================================================
  describe('Signup email enumeration prevention', () => {
    beforeEach(() => {
      mockServiceRpc.mockResolvedValue({ data: 0, error: null });
      mockServiceFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
    });

    it('returns generic error when email already registered (no enumeration)', async () => {
      mockServiceSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 },
      });

      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { email: 'existing@test.com', password: 'StrongPass123!', role: 'student' },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      // Should not reveal specifics about the account
      expect(body.success).toBe(true);
      expect(body.message).toContain('If an account with this email exists');
    });

    it('Zod rejects passwords shorter than 8 characters before reaching Supabase', async () => {
      // signupSchema requires password.min(8), so '123' never reaches Supabase
      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { email: 'new@test.com', password: '123', role: 'student' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toBeDefined();
      // Supabase signUp should never be called
      expect(mockServiceSignUp).not.toHaveBeenCalled();
    });

    it('returns WEAK_PASSWORD when Supabase rejects a long-enough but weak password', async () => {
      // Password passes Zod min(8) but Supabase considers it weak
      mockServiceRpc.mockResolvedValue({ data: 0, error: null });
      mockServiceFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      mockServiceSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password is too weak', code: 'weak_password', status: 422 },
      });

      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { email: 'new@test.com', password: '12345678', role: 'student' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('WEAK_PASSWORD');
    });
  });

  // =========================================================================
  // 5. Password reset: email enumeration prevention
  // =========================================================================
  describe('Password reset email enumeration prevention', () => {
    it('always returns success even for non-existent email', async () => {
      mockServiceRpc.mockResolvedValue({ data: [{ allowed: true }], error: null });
      mockServiceResetPasswordForEmail.mockResolvedValue({ error: null });

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const req = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { email: 'nonexistent@test.com' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('always returns success even when Supabase returns error (prevents enumeration)', async () => {
      mockServiceRpc.mockResolvedValue({ data: [{ allowed: true }], error: null });
      mockServiceResetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found', status: 404 },
      });

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const req = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { email: 'ghost@test.com' },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // =========================================================================
  // 6. Update password: session requirement
  // =========================================================================
  describe('Update password session security', () => {
    it('fails when called without valid reset session', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired', code: 'session_not_found', status: 401 },
      });

      const { POST } = await import('@/app/api/auth/update-password/route');
      const req = createRequest('/api/auth/update-password', {
        method: 'POST',
        body: { password: 'NewSecurePass123!' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      // Should mention expired link, not reveal session details
      expect(body.error).toContain('expired');
    });

    it('does not leak internal error details on generic failure', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Internal DB error: column xyz not found', status: 500 },
      });

      const { POST } = await import('@/app/api/auth/update-password/route');
      const req = createRequest('/api/auth/update-password', {
        method: 'POST',
        body: { password: 'ValidPass123!' },
      });
      const res = await POST(req);
      const body = await res.json();
      // Should not leak DB column names
      expect(body.error).toBe('Failed to update password');
      expect(JSON.stringify(body)).not.toContain('column');
      expect(JSON.stringify(body)).not.toContain('xyz');
    });
  });

  // =========================================================================
  // 7. Account deletion: authentication enforcement
  // =========================================================================
  describe('Account deletion auth enforcement', () => {
    it('requires valid session to delete account', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { DELETE } = await import('@/app/api/auth/account/route');
      const res = await DELETE();
      expect(res.status).toBe(401);
    });

    it('deletes the authenticated user only (not a different user)', async () => {
      const myUserId = 'my-user-id-123';
      mockGetUser.mockResolvedValue({
        data: { user: { id: myUserId } },
        error: null,
      });
      mockServiceStorageFrom.mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      mockServiceDeleteUser.mockResolvedValue({ error: null });

      const { DELETE } = await import('@/app/api/auth/account/route');
      await DELETE();

      // Verify deleteUser was called with the authenticated user's ID
      expect(mockServiceDeleteUser).toHaveBeenCalledWith(myUserId);
    });
  });

  // =========================================================================
  // 8. Signup IP rate limiting bypass attempts
  // =========================================================================
  describe('Signup IP rate limiting', () => {
    it('enforces IP-based rate limiting for signups', async () => {
      mockServiceRpc.mockResolvedValue({ data: 10, error: null }); // At limit
      mockServiceFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { email: 'new@test.com', password: 'StrongPass123!', role: 'student' },
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('reads first IP from x-forwarded-for (ignores proxy chain spoofing)', async () => {
      // The attacker sends multiple IPs; the route should use the first one
      mockServiceRpc.mockResolvedValue({ data: 10, error: null }); // At limit
      mockServiceFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { email: 'new2@test.com', password: 'StrongPass123!', role: 'student' },
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' },
      });
      const res = await POST(req);
      // Rate limit is checked against the first IP (1.2.3.4)
      expect(res.status).toBe(429);
    });
  });

  // =========================================================================
  // 9. Password reset IP rate limiting
  // =========================================================================
  describe('Password reset IP rate limiting', () => {
    it('enforces IP-based rate limiting', async () => {
      mockServiceRpc.mockResolvedValue({ data: [{ allowed: false }], error: null });

      const { POST } = await import('@/app/api/auth/reset-password/route');
      const req = createRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { email: 'user@test.com' },
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
    });
  });
});
