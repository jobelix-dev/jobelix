/**
 * Tests for lib/server/auth.ts
 *
 * Tests authenticateRequest() including:
 * - Successful authentication (cookie-based and Bearer token)
 * - Unauthorized flows
 * - Bearer token path vs cookie fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNextResponseJson = vi.fn((body: unknown, init?: { status?: number }) => ({
  __type: 'NextResponse',
  body,
  status: init?.status ?? 200,
}));

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => mockNextResponseJson(body, init),
    },
  };
});

const mockGetUser = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
};

vi.mock('../supabaseServer', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createRequest(options?: { token?: string }): NextRequest {
  const headers: Record<string, string> = {};
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
    headers['X-Client-Type'] = 'desktop';
  }
  return new NextRequest('https://www.jobelix.fr/api/test', { headers });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authenticateRequest', () => {
  let authenticateRequest: typeof import('../auth').authenticateRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../auth');
    authenticateRequest = mod.authenticateRequest;
  });

  // -------------------------------------------------------------------------
  // Cookie-based auth
  // -------------------------------------------------------------------------

  it('returns user and supabase when cookie auth succeeds', async () => {
    const user = fakeUser();
    mockGetUser.mockResolvedValueOnce({ data: { user }, error: null });

    const result = await authenticateRequest(createRequest());

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
    expect(result.supabase).toBe(mockSupabase);
  });

  it('calls getUser (cookie path) for requests without Authorization header', async () => {
    const user = fakeUser();
    mockGetUser.mockResolvedValueOnce({ data: { user }, error: null });

    await authenticateRequest(createRequest());

    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockGetUser).toHaveBeenCalledWith(); // no token arg = cookie path
  });

  it('returns 401 when getUser returns an auth error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Token expired' },
    });

    const result = await authenticateRequest(createRequest());

    expect(result.user).toBeNull();
    expect(result.supabase).toBeNull();
    expect(mockNextResponseJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('returns 401 when getUser returns null user without error', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const result = await authenticateRequest(createRequest());

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Bearer token auth (desktop)
  // -------------------------------------------------------------------------

  it('authenticates with a valid Bearer token', async () => {
    const user = fakeUser();
    const token = 'valid_token_abc';
    mockGetUser.mockResolvedValueOnce({ data: { user }, error: null });

    const result = await authenticateRequest(createRequest({ token }));

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
    expect(mockGetUser).toHaveBeenCalledWith(token);
  });

  it('returns 401 when Bearer token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const result = await authenticateRequest(createRequest({ token: 'bad_token' }));

    expect(result.user).toBeNull();
    expect(result.supabase).toBeNull();
    expect(mockNextResponseJson).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('falls back to cookie auth when Authorization header is absent', async () => {
    const user = fakeUser();
    mockGetUser.mockResolvedValueOnce({ data: { user }, error: null });

    const request = new NextRequest('https://www.jobelix.fr/api/test', { method: 'GET' });
    const result = await authenticateRequest(request);

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
    // Cookie path: called without a token argument
    expect(mockGetUser).toHaveBeenCalledWith();
  });
});
