/**
 * Security Tests: Open Redirect Prevention & SSRF Protection
 *
 * Tests for:
 * - Open redirect via `next` query param in auth callback
 * - Auth callback token and code flows (redirect behavior)
 * - Host header injection in signup route
 * - GitHub OAuth state manipulation (HMAC tampering, expiry)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// ---------------------------------------------------------------------------
// Mocks — Auth callback route dependencies
// ---------------------------------------------------------------------------

const mockVerifyOtp = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
    from: vi.fn(),
  })),
}));

const mockServiceRpc = vi.fn();
const mockServiceFrom = vi.fn();
const mockServiceSignUp = vi.fn();

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({
    auth: { signUp: mockServiceSignUp },
    rpc: mockServiceRpc,
    from: (...args: unknown[]) => mockServiceFrom(...args),
  })),
}));

vi.mock('@/lib/shared/referral', () => ({
  validateReferralCode: vi.fn().mockReturnValue(null),
  REFERRAL_COOKIE_NAME: 'jobelix_referral',
  extractReferralCodeFromUrl: vi.fn().mockReturnValue(null),
}));

// Validation mock — use real implementation for signup tests
vi.mock('@/lib/server/validation', async () => {
  const actual = await vi.importActual('@/lib/server/validation');
  return actual;
});

// GitHub OAuth mocks
vi.mock('@/lib/server/githubOAuth', () => ({
  getGitHubAuthUrl: vi.fn(
    (state: string) =>
      `https://github.com/login/oauth/authorize?state=${state}`,
  ),
  exchangeGitHubCode: vi.fn(),
  saveGitHubConnection: vi.fn(),
}));

vi.mock('@/lib/server/githubService', () => ({
  fetchGitHubUser: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Env vars for GitHub state verification
// ---------------------------------------------------------------------------
const TEST_SECRET = 'test-secret';
process.env.GITHUB_CLIENT_SECRET = TEST_SECRET;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): NextRequest {
  const requestUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `http://localhost:3000${url}`;

  return new NextRequest(requestUrl, {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...(options?.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
}

/** Extract the pathname (+ search) from a redirect response's Location header. */
function getRedirectPath(response: NextResponse): string {
  const location = response.headers.get('location') ?? '';
  try {
    const url = new URL(location);
    return url.pathname + url.search;
  } catch {
    return location;
  }
}

/** Set up mocks so processPostAuth succeeds without side-effects. */
function mockProcessPostAuthSuccess() {
  mockServiceRpc.mockResolvedValue({ data: null, error: null });
  mockServiceFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: 'user-123' }, error: null }),
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
}

const TEST_USER = {
  id: 'user-123',
  email: 'test@example.com',
  identities: [],
  user_metadata: {},
};

/** Create a valid HMAC-signed GitHub OAuth state. */
function createSignedState(
  overrides?: Partial<{ userId: string; nonce: string; ts: number }>,
  secret = TEST_SECRET,
): string {
  const stateData = JSON.stringify({
    userId: overrides?.userId ?? 'user-123',
    nonce: overrides?.nonce ?? 'test-nonce',
    ts: overrides?.ts ?? Date.now(),
  });
  const sig = createHmac('sha256', secret).update(stateData).digest('hex');
  const signedState = JSON.stringify({ data: stateData, sig });
  return Buffer.from(signedState).toString('base64url');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Security: Open Redirect & SSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessPostAuthSuccess();
  });

  // =========================================================================
  // 1. Open redirect via `next` param (auth callback)
  // =========================================================================
  describe('Auth callback — open redirect prevention via `next` param', () => {
    // For these tests we use the token flow with a successful verifyOtp
    beforeEach(() => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: TEST_USER },
        error: null,
      });
    });

    async function callCallbackWithNext(next: string | null): Promise<NextResponse> {
      const { GET } = await import('@/app/auth/callback/route');
      const params = new URLSearchParams();
      params.set('token_hash', 'valid-hash');
      params.set('type', 'recovery');
      if (next !== null) params.set('next', next);
      const req = createRequest(`/auth/callback?${params.toString()}`);
      return GET(req);
    }

    it('allows safe relative path /dashboard', async () => {
      const res = await callCallbackWithNext('/dashboard');
      expect(res.status).toBeGreaterThanOrEqual(300);
      expect(res.status).toBeLessThan(400);
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('allows safe relative path /settings', async () => {
      const res = await callCallbackWithNext('/settings');
      expect(getRedirectPath(res)).toBe('/settings');
    });

    it('allows relative path with query params /valid?param=value', async () => {
      const res = await callCallbackWithNext('/valid?param=value');
      expect(getRedirectPath(res)).toBe('/valid?param=value');
    });

    it('blocks protocol-relative URL //evil.com → /dashboard', async () => {
      const res = await callCallbackWithNext('//evil.com');
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('blocks absolute URL https://evil.com → /dashboard', async () => {
      const res = await callCallbackWithNext('https://evil.com');
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('blocks absolute URL http://evil.com → /dashboard', async () => {
      const res = await callCallbackWithNext('http://evil.com');
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('blocks javascript: URI → /dashboard', async () => {
      const res = await callCallbackWithNext('javascript:alert(1)');
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('defaults to /dashboard when next is empty string', async () => {
      const res = await callCallbackWithNext('');
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('defaults to /dashboard when next param is absent', async () => {
      const res = await callCallbackWithNext(null);
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('blocks triple-slash ///evil.com → /dashboard', async () => {
      const res = await callCallbackWithNext('///evil.com');
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('blocks backslash variants like /\\evil.com → /dashboard', async () => {
      const res = await callCallbackWithNext('/\\evil.com');
      expect(getRedirectPath(res)).toBe('/dashboard');
    });
  });

  // =========================================================================
  // 2. Auth callback — token flow redirect behavior
  // =========================================================================
  describe('Auth callback — token flow', () => {
    it('redirects to safeNext on successful recovery verification', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: TEST_USER },
        error: null,
      });

      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest(
        '/auth/callback?token_hash=valid-hash&type=recovery&next=/dashboard',
      );
      const res = await GET(req);

      expect(res.status).toBeGreaterThanOrEqual(300);
      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('redirects to safeNext on successful signup verification', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: TEST_USER },
        error: null,
      });

      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest(
        '/auth/callback?token_hash=valid-hash&type=signup&next=/settings',
      );
      const res = await GET(req);

      expect(getRedirectPath(res)).toBe('/settings');
    });

    it('redirects to login with error on invalid OTP type', async () => {
      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest(
        '/auth/callback?token_hash=valid-hash&type=bogus',
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('/login');
      expect(path).toContain('error=');
      // verifyOtp should not have been called for invalid types
    });

    it('redirects to login with expiry error when token expired', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token has expired', code: 'otp_expired' },
      });

      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest(
        '/auth/callback?token_hash=expired-hash&type=recovery',
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('/login');
      expect(path).toContain('expired');
    });

    it('redirects to login with error when token is invalid', async () => {
      mockVerifyOtp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token is invalid', code: 'otp_disabled' },
      });

      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest(
        '/auth/callback?token_hash=bad-hash&type=recovery',
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('/login');
      expect(path).toContain('error=');
    });
  });

  // =========================================================================
  // 3. Auth callback — code flow redirect behavior
  // =========================================================================
  describe('Auth callback — code flow', () => {
    it('redirects to safeNext on successful code exchange', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: {} },
        error: null,
      });
      mockGetUser.mockResolvedValue({ data: { user: TEST_USER } });

      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest(
        '/auth/callback?code=valid-code&next=/dashboard',
      );
      const res = await GET(req);

      expect(getRedirectPath(res)).toBe('/dashboard');
    });

    it('redirects to login with error when code is expired', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Auth session has expired', code: 'invalid_grant' },
      });

      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest('/auth/callback?code=expired-code');
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('/login');
      expect(path).toContain('error=');
    });

    it('redirects to login when no auth params are provided', async () => {
      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest('/auth/callback');
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('/login');
      expect(path).toContain('error=');
    });
  });

  // =========================================================================
  // 4. Auth callback — wrong domain redirect (jobelix.fr)
  // =========================================================================
  describe('Auth callback — wrong domain redirect', () => {
    it('redirects legacy callback host to canonical NEXT_PUBLIC_APP_URL origin', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.jobelix.com';

      const { GET } = await import('@/app/auth/callback/route');
      const req = createRequest(
        'https://www.jobelix.fr/auth/callback?token_hash=hash&type=recovery',
      );
      const res = await GET(req);

      const location = res.headers.get('location') ?? '';
      expect(location).toBe(
        'https://app.jobelix.com/auth/callback?token_hash=hash&type=recovery',
      );

      delete process.env.NEXT_PUBLIC_APP_URL;
    });
  });

  // =========================================================================
  // 5. Signup — host header injection
  // =========================================================================
  describe('Signup — host header injection', () => {
    beforeEach(() => {
      mockServiceRpc.mockResolvedValue({ data: 0, error: null });
      mockServiceSignUp.mockResolvedValue({
        data: { user: { id: 'new-user' }, session: null },
        error: null,
      });
      mockServiceFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
    });

    it('uses NEXT_PUBLIC_APP_URL when set (ignores forwarded headers)', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.jobelix.com';

      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'securepassword123',
          role: 'student',
        },
        headers: {
          'x-forwarded-host': 'evil.com',
          'x-forwarded-proto': 'https',
        },
      });

      await POST(req);

      // The signUp call should have used the env var URL, not evil.com
      const signUpCall = mockServiceSignUp.mock.calls[0];
      expect(signUpCall).toBeDefined();
      const redirectTo = signUpCall[0]?.options?.emailRedirectTo as string;
      expect(redirectTo).toContain('app.jobelix.com');
      expect(redirectTo).not.toContain('evil.com');

      delete process.env.NEXT_PUBLIC_APP_URL;
    });

    it('uses request origin in non-production when NEXT_PUBLIC_APP_URL is unset', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const { POST } = await import('@/app/api/auth/signup/route');
      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'securepassword123',
          role: 'student',
        },
        headers: {
          'x-forwarded-host': 'evil.com',
          'x-forwarded-proto': 'https',
        },
      });

      await POST(req);

      const signUpCall = mockServiceSignUp.mock.calls[0];
      expect(signUpCall).toBeDefined();
      const redirectTo = signUpCall[0]?.options?.emailRedirectTo as string;
      expect(redirectTo).toContain('http://localhost:3000');
      expect(redirectTo).not.toContain('evil.com');
    });
  });

  // =========================================================================
  // 6. GitHub OAuth — state manipulation
  // =========================================================================
  describe('GitHub OAuth callback — state manipulation', () => {
    // The callback route also calls createClient / getUser, mock them for
    // the success paths
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });
    });

    it('redirects with error when state is missing', async () => {
      const { GET } = await import(
        '@/app/api/oauth/github/callback/route'
      );
      const req = createRequest(
        '/api/oauth/github/callback?code=some-code',
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('github_error=missing_params');
    });

    it('redirects with error when code is missing', async () => {
      const { GET } = await import(
        '@/app/api/oauth/github/callback/route'
      );
      const state = createSignedState();
      const req = createRequest(
        `/api/oauth/github/callback?state=${state}`,
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('github_error=missing_params');
    });

    it('redirects with invalid_state when base64 is garbage', async () => {
      const { GET } = await import(
        '@/app/api/oauth/github/callback/route'
      );
      const req = createRequest(
        '/api/oauth/github/callback?code=abc&state=not-valid-base64!!!',
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('github_error=invalid_state');
    });

    it('redirects with invalid_state when HMAC signature is wrong', async () => {
      const { GET } = await import(
        '@/app/api/oauth/github/callback/route'
      );

      // Build a state with valid JSON structure but wrong signature
      const stateData = JSON.stringify({
        userId: 'user-123',
        nonce: 'abc',
        ts: Date.now(),
      });
      const wrongSig = 'deadbeef'.repeat(8); // 64 hex chars like a real SHA-256
      const signedState = JSON.stringify({ data: stateData, sig: wrongSig });
      const encodedState = Buffer.from(signedState).toString('base64url');

      const req = createRequest(
        `/api/oauth/github/callback?code=abc&state=${encodedState}`,
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('github_error=invalid_state');
    });

    it('redirects with state_expired when state is older than 10 minutes', async () => {
      const { GET } = await import(
        '@/app/api/oauth/github/callback/route'
      );

      const expiredState = createSignedState({
        ts: Date.now() - 11 * 60 * 1000, // 11 minutes ago
      });

      const req = createRequest(
        `/api/oauth/github/callback?code=abc&state=${expiredState}`,
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('github_error=state_expired');
    });

    it('redirects with GitHub error when error param is present', async () => {
      const { GET } = await import(
        '@/app/api/oauth/github/callback/route'
      );
      const req = createRequest(
        '/api/oauth/github/callback?error=access_denied',
      );
      const res = await GET(req);

      const path = getRedirectPath(res);
      expect(path).toContain('github_error=access_denied');
    });
  });
});
