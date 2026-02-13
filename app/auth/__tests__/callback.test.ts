/**
 * Tests for app/auth/callback/route.ts (GET handler)
 *
 * Tests cover:
 * - No valid params → redirect to login
 * - Token-based flow: valid recovery, invalid type, expired OTP, invalid OTP, no user
 * - Code-based PKCE flow: valid code, exchange error, no user after exchange
 * - Next param sanitization (relative path, absolute URL, protocol-relative)
 * - Popup mode: redirects to callback-success, error in popup
 * - Referral code extraction from URL param and cookie
 * - Referral cookie clearing on response
 * - token_hash takes precedence over token param
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockVerifyOtp = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();

const mockSupabase = {
  auth: {
    verifyOtp: mockVerifyOtp,
    exchangeCodeForSession: mockExchangeCodeForSession,
    getUser: mockGetUser,
  },
};

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

// Service supabase for post-auth processing (ensureStudentProfile, etc.)
const mockServiceFrom = vi.fn();
const mockServiceRpc = vi.fn();

const mockServiceSupabase = {
  from: mockServiceFrom,
  rpc: mockServiceRpc,
};

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => mockServiceSupabase),
}));

vi.mock('@/lib/shared/referral', () => ({
  validateReferralCode: vi.fn((code: string | null | undefined) => {
    if (!code || typeof code !== 'string') return null;
    const normalized = code.toLowerCase().trim();
    return /^[a-z0-9]{8}$/.test(normalized) ? normalized : null;
  }),
  REFERRAL_COOKIE_NAME: 'jobelix_referral',
  extractReferralCodeFromUrl: vi.fn((params: URLSearchParams) => {
    const code = params.get('ref') || params.get('referral') || params.get('referral_code');
    if (!code) return null;
    const normalized = code.toLowerCase().trim();
    return /^[a-z0-9]{8}$/.test(normalized) ? normalized : null;
  }),
}));

// ---------------------------------------------------------------------------
// Import the route handler (after mocks)
// ---------------------------------------------------------------------------

import { GET } from '@/app/auth/callback/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCallbackRequest(params: Record<string, string>, cookie?: string): NextRequest {
  const url = new URL('http://localhost:3000/auth/callback');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = {};
  if (cookie) headers['cookie'] = cookie;
  return new NextRequest(url, { headers });
}

/** Fake user returned after successful auth */
function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Setup service supabase mocks so that ensureStudentProfile short-circuits
 * (student already exists). This avoids complex mock chains for most tests.
 */
function setupStudentExists() {
  mockServiceFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  });
  mockServiceRpc.mockResolvedValue({ data: [{ success: false, error_message: 'already applied' }], error: null });
}

/** Extract the redirect location from a response */
function getRedirectLocation(res: Response): string {
  return res.headers.get('location') || '';
}

/** Extract a search param from a redirect location URL */
function getRedirectParam(res: Response, param: string): string | null {
  const location = getRedirectLocation(res);
  try {
    const url = new URL(location);
    return url.searchParams.get(param);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  setupStudentExists();
});

// ===========================================================================
// No valid params
// ===========================================================================

describe('no valid auth parameters', () => {
  it('redirects to login with "Invalid or expired link" error', async () => {
    const req = createCallbackRequest({});
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = getRedirectLocation(res);
    expect(location).toContain('/login');
    expect(location).toContain('error=');
    expect(location).toContain('Invalid+or+expired+link');
  });
});

// ===========================================================================
// Token-based flow
// ===========================================================================

describe('token-based flow', () => {
  it('redirects to safeNext on successful recovery token verification', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'valid-hash',
      type: 'recovery',
      next: '/reset-password',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(getRedirectLocation(res)).toContain('/reset-password');
  });

  it('redirects to /dashboard when next param is not provided', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'valid-hash',
      type: 'recovery',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(getRedirectLocation(res)).toContain('/dashboard');
  });

  it('redirects with error for invalid OTP type', async () => {
    const req = createCallbackRequest({
      token_hash: 'some-hash',
      type: 'invalid_type',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = getRedirectLocation(res);
    expect(location).toContain('/login');
    expect(decodeURIComponent(location)).toContain('Invalid');
  });

  it('redirects with expired error when OTP is expired', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Token has expired', code: 'otp_expired' },
    });

    const req = createCallbackRequest({
      token_hash: 'expired-hash',
      type: 'recovery',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = decodeURIComponent(getRedirectLocation(res));
    expect(location).toContain('/login');
    expect(location).toContain('expired');
  });

  it('redirects with invalid/used error when OTP is invalid', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Token is invalid', code: 'otp_disabled' },
    });

    const req = createCallbackRequest({
      token_hash: 'used-hash',
      type: 'recovery',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = decodeURIComponent(getRedirectLocation(res));
    expect(location).toContain('/login');
    expect(location).toContain('invalid');
  });

  it('redirects with "Authentication failed" when no user after verify', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'valid-hash',
      type: 'recovery',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = getRedirectLocation(res);
    expect(location).toContain('/login');
    expect(location).toContain('Authentication+failed');
  });

  it('uses token_hash over token param', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token: 'old-token',
      token_hash: 'preferred-hash',
      type: 'recovery',
    });
    await GET(req);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'preferred-hash',
      type: 'recovery',
    });
  });

  it('falls back to token param when token_hash is absent', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token: 'fallback-token',
      type: 'signup',
    });
    await GET(req);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'fallback-token',
      type: 'signup',
    });
  });

  it('passes generic error message when verifyOtp fails with unknown error', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Something unexpected', code: 'unknown' },
    });

    const req = createCallbackRequest({
      token_hash: 'some-hash',
      type: 'recovery',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = decodeURIComponent(getRedirectLocation(res));
    expect(location).toContain('/login');
    expect(location).toContain('Something unexpected');
  });
});

// ===========================================================================
// Code-based PKCE flow
// ===========================================================================

describe('code-based PKCE flow', () => {
  it('redirects to safeNext on successful code exchange', async () => {
    const user = fakeUser();
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user } });

    const req = createCallbackRequest({
      code: 'valid-code',
      next: '/profile',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(getRedirectLocation(res)).toContain('/profile');
  });

  it('redirects to login on exchange error', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'Exchange failed' },
    });

    const req = createCallbackRequest({ code: 'bad-code' });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = decodeURIComponent(getRedirectLocation(res));
    expect(location).toContain('/login');
    expect(location).toContain('Exchange failed');
  });

  it('redirects with expired message when exchange returns expired/invalid_grant error', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'Token has expired', code: 'invalid_grant' },
    });

    const req = createCallbackRequest({ code: 'expired-code' });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = decodeURIComponent(getRedirectLocation(res));
    expect(location).toContain('/login');
    expect(location).toContain('expired');
  });

  it('redirects to login when no user after code exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const req = createCallbackRequest({ code: 'valid-code' });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = getRedirectLocation(res);
    expect(location).toContain('/login');
    expect(location).toContain('Authentication+failed');
  });

  it('calls exchangeCodeForSession with the code', async () => {
    const user = fakeUser();
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user } });

    const req = createCallbackRequest({ code: 'my-auth-code' });
    await GET(req);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('my-auth-code');
  });
});

// ===========================================================================
// Next param sanitization
// ===========================================================================

describe('next param sanitization', () => {
  it('preserves valid relative path', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'hash',
      type: 'recovery',
      next: '/settings/profile',
    });
    const res = await GET(req);

    expect(getRedirectLocation(res)).toContain('/settings/profile');
  });

  it('defaults to /dashboard for absolute URL', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'hash',
      type: 'recovery',
      next: 'https://evil.com/steal',
    });
    const res = await GET(req);

    const location = getRedirectLocation(res);
    expect(location).toContain('/dashboard');
    expect(location).not.toContain('evil.com');
  });

  it('defaults to /dashboard for protocol-relative URL (//evil.com)', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'hash',
      type: 'recovery',
      next: '//evil.com',
    });
    const res = await GET(req);

    const location = getRedirectLocation(res);
    expect(location).toContain('/dashboard');
    expect(location).not.toContain('evil.com');
  });
});

// ===========================================================================
// Popup mode
// ===========================================================================

describe('popup mode', () => {
  it('redirects to /auth/callback-success instead of safeNext', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'hash',
      type: 'recovery',
      popup: 'true',
      next: '/settings',
    });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(getRedirectLocation(res)).toContain('/auth/callback-success');
    expect(getRedirectLocation(res)).not.toContain('/settings');
  });

  it('includes error param in callback-success URL on error', async () => {
    const req = createCallbackRequest({ popup: 'true' });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = getRedirectLocation(res);
    expect(location).toContain('/auth/callback-success');
    expect(location).toContain('error=');
  });

  it('does not use popup mode when popup param is not "true"', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'hash',
      type: 'recovery',
      popup: 'false',
    });
    const res = await GET(req);

    expect(getRedirectLocation(res)).toContain('/dashboard');
    expect(getRedirectLocation(res)).not.toContain('callback-success');
  });
});

// ===========================================================================
// Referral code handling
// ===========================================================================

describe('referral code handling', () => {
  it('extracts referral code from URL referral_code param', async () => {
    const user = fakeUser();
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user } });

    const req = createCallbackRequest({
      code: 'auth-code',
      referral_code: 'abc12345',
    });
    await GET(req);

    // The referral code should trigger an RPC call to apply_referral_code_admin
    expect(mockServiceRpc).toHaveBeenCalledWith(
      'apply_referral_code_admin',
      expect.objectContaining({ p_code: 'abc12345' }),
    );
  });

  it('extracts referral code from cookie', async () => {
    const user = fakeUser();
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user } });

    const req = createCallbackRequest(
      { code: 'auth-code' },
      'jobelix_referral=xyz98765',
    );
    await GET(req);

    expect(mockServiceRpc).toHaveBeenCalledWith(
      'apply_referral_code_admin',
      expect.objectContaining({ p_code: 'xyz98765' }),
    );
  });

  it('clears referral cookie on redirect response', async () => {
    const user = fakeUser();
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user, session: {} },
      error: null,
    });

    const req = createCallbackRequest({
      token_hash: 'hash',
      type: 'recovery',
    });
    const res = await GET(req);

    // The response should have a Set-Cookie header that clears the referral cookie
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('jobelix_referral');
    // Should be expired (date in the past)
    expect(setCookie).toContain('1970');
  });

  it('clears referral cookie even when no referral code is present', async () => {
    const req = createCallbackRequest({});
    const res = await GET(req);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('jobelix_referral');
  });

  it('does not call apply_referral_code_admin when no referral code is present', async () => {
    const user = fakeUser();
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user } });

    const req = createCallbackRequest({ code: 'auth-code' });
    await GET(req);

    expect(mockServiceRpc).not.toHaveBeenCalledWith(
      'apply_referral_code_admin',
      expect.anything(),
    );
  });
});

// ===========================================================================
// Post-auth: ensureStudentProfile
// ===========================================================================

describe('post-auth processing', () => {
  it('checks student table during post-auth', async () => {
    const user = fakeUser();
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user } });

    const req = createCallbackRequest({ code: 'auth-code' });
    await GET(req);

    // ensureStudentProfile queries the student table
    expect(mockServiceFrom).toHaveBeenCalledWith('student');
  });

  it('handles token flow types: email, signup, invite, magiclink, email_change', async () => {
    const validTypes = ['email', 'signup', 'invite', 'magiclink', 'email_change'];

    for (const type of validTypes) {
      vi.clearAllMocks();
      setupStudentExists();

      const user = fakeUser();
      mockVerifyOtp.mockResolvedValueOnce({
        data: { user, session: {} },
        error: null,
      });

      const req = createCallbackRequest({
        token_hash: 'hash',
        type,
      });
      const res = await GET(req);

      expect(res.status).toBe(307);
      expect(getRedirectLocation(res)).toContain('/dashboard');
    }
  });
});
