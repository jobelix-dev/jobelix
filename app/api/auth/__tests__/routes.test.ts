/**
 * Comprehensive tests for all auth API routes
 *
 * Tests cover: login, signup, logout, profile, update-password,
 * reset-password, account delete, and welcome-notice-seen.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock modules – must be declared before any import that triggers them
// ---------------------------------------------------------------------------

// Mock supabase server client (createClient)
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockSupabaseFrom = vi.fn();

const mockSupabaseClient = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    getSession: mockGetSession,
  },
  from: mockSupabaseFrom,
};

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// Mock supabase service client (getServiceSupabase)
const mockServiceSignUp = vi.fn();
const mockServiceResetPasswordForEmail = vi.fn();
const mockServiceDeleteUser = vi.fn();
const mockServiceRpc = vi.fn();
const mockServiceFrom = vi.fn();
const mockServiceStorageFrom = vi.fn();

const mockServiceSupabaseClient = {
  auth: {
    signUp: mockServiceSignUp,
    resetPasswordForEmail: mockServiceResetPasswordForEmail,
    admin: {
      deleteUser: mockServiceDeleteUser,
    },
  },
  rpc: mockServiceRpc,
  from: mockServiceFrom,
  storage: {
    from: mockServiceStorageFrom,
  },
};

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => mockServiceSupabaseClient),
}));

// Mock authenticateRequest
const mockAuthenticateRequest = vi.fn();

vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(
  body: unknown,
  options?: { headers?: Record<string, string> },
): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

function createDeleteRequest(
  body?: unknown,
  options?: { headers?: Record<string, string> },
): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/account', {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/** Build a chainable `.from().select().eq().maybeSingle()` mock */
function chainable(result: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.update = vi.fn().mockReturnValue(chain);
  return chain;
}

// Constant fixtures
const MOCK_USER_ID = '00000000-1111-2222-3333-444444444444';
const MOCK_EMAIL = 'test@example.com';
const MOCK_PASSWORD = 'securePassword123';

// ---------------------------------------------------------------------------
// Reset all mocks between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. POST /api/auth/login
// ===========================================================================
describe('POST /api/auth/login', () => {
  // Dynamic import so the mocks are in place
  let POST: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../login/route');
    POST = mod.POST;
  });

  it('returns 200 on successful login', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });

    const res = await POST(
      createMockRequest({ email: MOCK_EMAIL, password: MOCK_PASSWORD }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: MOCK_EMAIL,
      password: MOCK_PASSWORD,
      options: { captchaToken: undefined },
    });
  });

  it('passes captchaToken when provided', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });

    await POST(
      createMockRequest({
        email: MOCK_EMAIL,
        password: MOCK_PASSWORD,
        captchaToken: 'tok_123',
      }),
    );

    expect(mockSignInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ options: { captchaToken: 'tok_123' } }),
    );
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(createMockRequest({ password: MOCK_PASSWORD }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(createMockRequest({ email: MOCK_EMAIL }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(
      createMockRequest({ email: 'not-an-email', password: MOCK_PASSWORD }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Validation failed');
  });

  it('returns 401 when Supabase returns auth error', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const res = await POST(
      createMockRequest({ email: MOCK_EMAIL, password: 'wrong' }),
    );

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Invalid credentials');
  });

  it('returns 500 when request body is not valid JSON', async () => {
    const badReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(badReq);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Login failed');
  });
});

// ===========================================================================
// 2. POST /api/auth/signup
// ===========================================================================
describe('POST /api/auth/signup', () => {
  let POST: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../signup/route');
    POST = mod.POST;
    // Default: rate limit passes
    mockServiceRpc.mockResolvedValue({ data: 0, error: null });
  });

  const validBody = {
    email: MOCK_EMAIL,
    password: MOCK_PASSWORD,
    role: 'student' as const,
  };

  it('returns 200 with userId on successful signup (email confirmation required)', async () => {
    mockServiceSignUp.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID }, session: null },
      error: null,
    });
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const res = await POST(
      createMockRequest(validBody, {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.userId).toBe(MOCK_USER_ID);
  });

  it('returns 400 for validation errors (missing role)', async () => {
    const res = await POST(
      createMockRequest({ email: MOCK_EMAIL, password: MOCK_PASSWORD }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role value', async () => {
    const res = await POST(
      createMockRequest({ ...validBody, role: 'admin' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for password too short', async () => {
    const res = await POST(
      createMockRequest({ ...validBody, password: 'short' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 429 when IP rate limit is exceeded', async () => {
    mockServiceRpc.mockResolvedValueOnce({ data: 10, error: null });

    const res = await POST(
      createMockRequest(validBody, {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      }),
    );

    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 400 for weak password from Supabase', async () => {
    mockServiceSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: 'weak_password', message: 'Password should be longer', status: 422 },
    });

    const res = await POST(createMockRequest(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('WEAK_PASSWORD');
  });

  it('returns generic success when user already exists (no enumeration)', async () => {
    mockServiceSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already exists', status: 400 },
    });

    const res = await POST(createMockRequest(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('returns 400 for generic Supabase signup error', async () => {
    mockServiceSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Something went wrong', status: 500 },
    });

    const res = await POST(createMockRequest(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Signup failed. Please try again.');
  });

  it('tracks signup IP after successful user creation', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockServiceFrom.mockReturnValue({ insert: insertMock });
    mockServiceSignUp.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID }, session: null },
      error: null,
    });

    await POST(
      createMockRequest(validBody, {
        headers: { 'x-forwarded-for': '5.6.7.8' },
      }),
    );

    expect(mockServiceFrom).toHaveBeenCalledWith('signup_ip_tracking');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ ip_address: '5.6.7.8' }),
    );
  });

  it('allows signup when rate limit check errors (fails open)', async () => {
    mockServiceRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC failed' },
    });
    mockServiceSignUp.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID }, session: null },
      error: null,
    });
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const res = await POST(createMockRequest(validBody));
    expect(res.status).toBe(200);
  });

  it('returns 500 for unexpected errors', async () => {
    // Force a throw by making request.json() fail
    const badReq = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: '{invalid',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(badReq);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Signup failed');
  });

  it('stores referralCode in user metadata when provided', async () => {
    mockServiceSignUp.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID }, session: null },
      error: null,
    });
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    await POST(
      createMockRequest({ ...validBody, referralCode: 'ab12cd34' }),
    );

    expect(mockServiceSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ referral_code: 'ab12cd34' }),
        }),
      }),
    );
  });
});

// ===========================================================================
// 3. POST /api/auth/logout
// ===========================================================================
describe('POST /api/auth/logout', () => {
  let POST: () => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../logout/route');
    POST = mod.POST;
  });

  it('returns 200 on successful signOut', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns 200 with alreadyLoggedOut when session is missing', async () => {
    mockSignOut.mockResolvedValueOnce({
      error: { name: 'AuthSessionMissingError', message: 'Auth session missing' },
    });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, alreadyLoggedOut: true });
  });

  it('returns 500 on other signOut errors', async () => {
    mockSignOut.mockResolvedValueOnce({
      error: { name: 'UnknownError', message: 'Something broke' },
    });

    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Logout failed');
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('network failure'));

    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Logout failed');
  });
});

// ===========================================================================
// 4. GET /api/auth/profile
// ===========================================================================
describe('GET /api/auth/profile', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../profile/route');
    GET = mod.GET;
  });

  it('returns null profile when not authenticated', async () => {
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: null,
      supabase: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile: null });
  });

  it('returns student profile when user is a student', async () => {
    const studentRow = {
      id: MOCK_USER_ID,
      created_at: '2025-01-01T00:00:00Z',
      has_seen_welcome_notice: false,
    };
    const studentChain = chainable({ data: studentRow, error: null });

    const mockSb = { from: vi.fn().mockReturnValue(studentChain) };
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID, email: MOCK_EMAIL },
      supabase: mockSb,
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.role).toBe('student');
    expect(json.profile.id).toBe(MOCK_USER_ID);
    expect(json.profile.email).toBe(MOCK_EMAIL);
    expect(json.profile.has_seen_welcome_notice).toBe(false);
  });

  it('returns company profile when user is a company', async () => {
    const companyRow = {
      id: MOCK_USER_ID,
      created_at: '2025-06-01T00:00:00Z',
      has_seen_welcome_notice: true,
    };
    // First call for student returns null
    const studentChain = chainable({ data: null, error: null });
    const companyChain = chainable({ data: companyRow, error: null });

    let callCount = 0;
    const fromFn = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? studentChain : companyChain;
    });

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID, email: MOCK_EMAIL },
      supabase: { from: fromFn },
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile.role).toBe('company');
    expect(json.profile.has_seen_welcome_notice).toBe(true);
  });

  it('returns null profile when user has no student or company row', async () => {
    const emptyChain = chainable({ data: null, error: null });
    const mockSb = { from: vi.fn().mockReturnValue(emptyChain) };

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID, email: MOCK_EMAIL },
      supabase: mockSb,
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile: null });
  });

  it('returns 500 on unexpected errors', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('boom'));

    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to fetch profile');
  });
});

// ===========================================================================
// 5. POST /api/auth/update-password
// ===========================================================================
describe('POST /api/auth/update-password', () => {
  let POST: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../update-password/route');
    POST = mod.POST;
  });

  it('returns 200 on successful password update', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });

    const res = await POST(createMockRequest({ password: 'newSecurePass1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecurePass1' });
  });

  it('returns 400 when password is too short', async () => {
    const res = await POST(createMockRequest({ password: 'short' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Validation failed');
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(createMockRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Validation failed');
  });

  it('returns 400 for same_password error', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      error: { code: 'same_password', message: 'Password should be different' },
    });

    const res = await POST(createMockRequest({ password: 'samePassword1' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('different');
  });

  it('returns 400 for expired token error', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      error: { code: 'expired_token', message: 'Token expired' },
    });

    const res = await POST(createMockRequest({ password: 'newSecurePass1' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('expired');
  });

  it('returns 400 for weak password error', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      error: { code: 'other', message: 'Password is too weak' },
    });

    const res = await POST(createMockRequest({ password: 'weakPass99' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('weak');
  });

  it('returns 400 for generic auth error', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      error: { code: 'other', message: 'Unknown error' },
    });

    const res = await POST(createMockRequest({ password: 'goodPass1234' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Failed to update password');
  });

  it('returns 500 when request body is not valid JSON', async () => {
    const badReq = new NextRequest('http://localhost:3000/api/auth/update-password', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(badReq);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to update password');
  });
});

// ===========================================================================
// 6. POST /api/auth/reset-password
// ===========================================================================
describe('POST /api/auth/reset-password', () => {
  let POST: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../reset-password/route');
    POST = mod.POST;
    // Default: rate limit passes
    mockServiceRpc.mockResolvedValue({ data: [{ allowed: true }], error: null });
  });

  it('always returns success for valid email (prevents enumeration)', async () => {
    mockServiceResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const res = await POST(
      createMockRequest(
        { email: MOCK_EMAIL },
        { headers: { 'x-forwarded-for': '1.2.3.4' } },
      ),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns success even when Supabase errors (prevents enumeration)', async () => {
    mockServiceResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'User not found', status: 404 },
    });

    const res = await POST(
      createMockRequest(
        { email: 'unknown@example.com' },
        { headers: { 'x-forwarded-for': '1.2.3.4' } },
      ),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('returns 400 for validation errors (invalid email)', async () => {
    const res = await POST(
      createMockRequest(
        { email: 'not-an-email' },
        { headers: { 'x-forwarded-for': '1.2.3.4' } },
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Validation failed');
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(
      createMockRequest(
        {},
        { headers: { 'x-forwarded-for': '1.2.3.4' } },
      ),
    );
    expect(res.status).toBe(400);
  });

  it('returns 429 when IP rate limit is exceeded', async () => {
    mockServiceRpc.mockResolvedValueOnce({
      data: [{ allowed: false }],
      error: null,
    });

    const res = await POST(
      createMockRequest(
        { email: MOCK_EMAIL },
        { headers: { 'x-forwarded-for': '1.2.3.4' } },
      ),
    );

    expect(res.status).toBe(429);
  });

  it('returns 429 when Supabase returns rate limit error', async () => {
    mockServiceResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'rate limit exceeded', status: 429 },
    });

    const res = await POST(
      createMockRequest(
        { email: MOCK_EMAIL },
        { headers: { 'x-forwarded-for': '1.2.3.4' } },
      ),
    );

    expect(res.status).toBe(429);
  });

  it('passes captchaToken to Supabase', async () => {
    mockServiceResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    await POST(
      createMockRequest(
        { email: MOCK_EMAIL, captchaToken: 'cap_tok' },
        { headers: { 'x-forwarded-for': '1.2.3.4' } },
      ),
    );

    expect(mockServiceResetPasswordForEmail).toHaveBeenCalledWith(
      MOCK_EMAIL,
      expect.objectContaining({ captchaToken: 'cap_tok' }),
    );
  });

  it('returns 500 on unexpected exceptions', async () => {
    const badReq = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(badReq);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to process request');
  });
});

// ===========================================================================
// 7. DELETE /api/auth/account
// ===========================================================================
describe('DELETE /api/auth/account', () => {
  let DELETE: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../account/route');
    DELETE = mod.DELETE;
  });

  const validBody = { confirmation: 'DELETE', password: MOCK_PASSWORD };
  const emailUser = {
    id: MOCK_USER_ID,
    email: MOCK_EMAIL,
    app_metadata: { providers: ['email'] },
  };

  it('returns 400 when confirmation is missing', async () => {
    const res = await DELETE(createDeleteRequest({ password: MOCK_PASSWORD }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Confirmation is required');
  });

  it('returns 400 when email/password account password is missing', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: emailUser },
      error: null,
    });

    const res = await DELETE(createDeleteRequest({ confirmation: 'DELETE' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Password is required to delete your account');
  });

  it('returns 401 when re-authentication password is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: emailUser },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } });

    const res = await DELETE(createDeleteRequest(validBody));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Invalid password');
  });

  it('returns 200 after successful account deletion (no files)', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: emailUser },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockServiceStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      remove: vi.fn(),
    });
    mockServiceDeleteUser.mockResolvedValueOnce({ error: null });

    const res = await DELETE(createDeleteRequest(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockServiceDeleteUser).toHaveBeenCalledWith(MOCK_USER_ID);
  });

  it('deletes storage files before deleting user', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: emailUser },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    mockServiceStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({
        data: [{ name: 'resume.pdf' }, { name: 'cover.pdf' }],
        error: null,
      }),
      remove: removeMock,
    });
    mockServiceDeleteUser.mockResolvedValueOnce({ error: null });

    const res = await DELETE(createDeleteRequest(validBody));
    expect(res.status).toBe(200);
    expect(removeMock).toHaveBeenCalledWith([
      `${MOCK_USER_ID}/resume.pdf`,
      `${MOCK_USER_ID}/cover.pdf`,
    ]);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const res = await DELETE(createDeleteRequest(validBody));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Unauthorized');
  });

  it('returns 500 when user deletion fails', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: emailUser },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockServiceStorageFrom.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      remove: vi.fn(),
    });
    mockServiceDeleteUser.mockResolvedValueOnce({
      error: { message: 'Delete failed' },
    });

    const res = await DELETE(createDeleteRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to delete account');
  });

  it('continues deletion even when storage cleanup fails', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: emailUser },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockServiceStorageFrom.mockReturnValue({
      list: vi.fn().mockRejectedValue(new Error('storage error')),
      remove: vi.fn(),
    });
    mockServiceDeleteUser.mockResolvedValueOnce({ error: null });

    const res = await DELETE(createDeleteRequest(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns 500 on unexpected exception', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('unexpected'));

    const res = await DELETE(createDeleteRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to delete account');
  });
});

// ===========================================================================
// 8. POST /api/auth/welcome-notice-seen
// ===========================================================================
describe('POST /api/auth/welcome-notice-seen', () => {
  let POST: () => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../welcome-notice-seen/route');
    POST = mod.POST;
  });

  it('returns auth error when not authenticated', async () => {
    const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: null,
      supabase: null,
      error: errorResponse,
    });

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('updates student welcome notice successfully', async () => {
    const studentSelectChain = chainable({ data: { id: MOCK_USER_ID }, error: null });
    const updateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    let callCount = 0;
    const fromFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return studentSelectChain; // select student
      return updateChain; // update student
    });

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: { from: fromFn },
      error: null,
    });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(fromFn).toHaveBeenCalledWith('student');
  });

  it('updates company welcome notice when user is not a student', async () => {
    const emptyChain = chainable({ data: null, error: null });
    const companySelectChain = chainable({ data: { id: MOCK_USER_ID }, error: null });
    const companyUpdateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    let callCount = 0;
    const fromFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return emptyChain; // student select → null
      if (callCount === 2) return companySelectChain; // company select → found
      return companyUpdateChain; // company update
    });

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: { from: fromFn },
      error: null,
    });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns 404 when user is not found in either table', async () => {
    const emptyChain = chainable({ data: null, error: null });
    const fromFn = vi.fn().mockReturnValue(emptyChain);

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: { from: fromFn },
      error: null,
    });

    const res = await POST();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('User profile not found');
  });

  it('returns 500 when student update fails', async () => {
    const studentSelectChain = chainable({ data: { id: MOCK_USER_ID }, error: null });
    const failedUpdateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'update failed' } }),
      }),
    };

    let callCount = 0;
    const fromFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return studentSelectChain;
      return failedUpdateChain;
    });

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: { from: fromFn },
      error: null,
    });

    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to update welcome notice status');
  });

  it('returns 500 on unexpected exception', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('boom'));

    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
