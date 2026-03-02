/**
 * Tests for lib/server/auth.ts
 *
 * Tests authenticateRequest() and requireAuth() functions including:
 * - Successful authentication flows (cookie-based and token-based)
 * - Error/unauthorized flows
 * - In-memory user cache behavior (hit, miss, TTL expiry, cleanup)
 * - requireAuth() throw behavior on failure
 * - Bearer token authentication for desktop app
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/server — provide a minimal NextResponse.json implementation
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

// Mock supabase client returned by createClient
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();

const mockSupabase = {
  auth: {
    getSession: mockGetSession,
    getUser: mockGetUser,
  },
};

vi.mock('../supabaseServer', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock @supabase/supabase-js for token-based auth
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal fake User object matching Supabase's User type shape */
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

/** Configure mocks for an authenticated session + user */
function setupAuthenticated(token = 'tok_abc', user = fakeUser()) {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: token } },
  });
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null,
  });
  return { token, user };
}

/** Configure mocks for no session and no user */
function setupUnauthenticated() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
  });
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authenticateRequest', () => {
  let authenticateRequest: typeof import('../auth').authenticateRequest;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Re-import to get a fresh module with a clean userCache each time
    vi.resetModules();
    const mod = await import('../auth');
    authenticateRequest = mod.authenticateRequest;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Success cases
  // -------------------------------------------------------------------------

  it('returns user and supabase when authenticated', async () => {
    const { user } = setupAuthenticated();

    const result = await authenticateRequest();

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
    expect(result.supabase).toBe(mockSupabase);
  });

  it('calls getSession and getUser on first request', async () => {
    setupAuthenticated();

    await authenticateRequest();

    expect(mockGetSession).toHaveBeenCalledOnce();
    expect(mockGetUser).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // Failure / unauthorized cases
  // -------------------------------------------------------------------------

  it('returns 401 error when there is no session and no user', async () => {
    setupUnauthenticated();

    const result = await authenticateRequest();

    expect(result.user).toBeNull();
    expect(result.supabase).toBeNull();
    expect(result.error).toBeDefined();
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  });

  it('returns 401 error when getUser returns an error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok_err' } },
    });
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' },
    });

    const result = await authenticateRequest();

    expect(result.user).toBeNull();
    expect(result.supabase).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('returns 401 when getUser returns null user without explicit error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok_null' } },
    });
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await authenticateRequest();

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Cache behavior
  // -------------------------------------------------------------------------

  it('returns cached user on second call within TTL without calling getUser again', async () => {
    setupAuthenticated('tok_cache');

    // First call — populates cache
    const first = await authenticateRequest();
    expect(first.user).toBeDefined();
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    // Advance time but stay within 3s TTL
    vi.advanceTimersByTime(2_000);

    // Second call — should hit cache
    const second = await authenticateRequest();
    expect(second.user).toEqual(first.user);
    expect(second.error).toBeNull();
    // getUser should NOT have been called again
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('calls getUser again after TTL expires (cache miss)', async () => {
    const user = fakeUser();
    setupAuthenticated('tok_ttl', user);

    // First call
    await authenticateRequest();
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    // Advance past the 3s TTL
    vi.advanceTimersByTime(3_001);

    // Second call — cache expired, should call getUser again
    await authenticateRequest();
    expect(mockGetUser).toHaveBeenCalledTimes(2);
  });

  it('does not cache when there is no access_token (no cacheKey)', async () => {
    const user = fakeUser();
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });
    mockGetUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    // First call
    const first = await authenticateRequest();
    expect(first.user).toEqual(user);
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    // Second call — no cache key, so getUser is called again
    await authenticateRequest();
    expect(mockGetUser).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed auth results', async () => {
    setupUnauthenticated();

    await authenticateRequest();
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    // Second call — should still call getUser
    await authenticateRequest();
    expect(mockGetUser).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Cache cleanup
  // -------------------------------------------------------------------------

  it('cleans up expired entries when cache size exceeds CACHE_MAX_SIZE/2', async () => {
    // We need to populate the cache with >500 entries, then trigger cleanup.
    // To do this efficiently we call authenticateRequest with different tokens.
    // Each call with a unique token will add one cache entry.

    const user = fakeUser();

    // Fill cache with 501 entries using unique tokens
    for (let i = 0; i < 501; i++) {
      const token = `tok_fill_${i}`;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: token } },
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user },
        error: null,
      });
      await authenticateRequest();
    }

    // All 501 entries should have been added. Now advance time past TTL
    // so all entries are expired.
    vi.advanceTimersByTime(4_000);

    // Next call triggers cleanupCache — since size > 500, expired entries
    // should be purged.
    const freshToken = 'tok_after_cleanup';
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: freshToken } },
    });
    mockGetUser.mockResolvedValueOnce({
      data: { user },
      error: null,
    });

    const result = await authenticateRequest();
    expect(result.user).toEqual(user);
    expect(result.error).toBeNull();

    // Verify getUser was called for this request (not served from cache
    // since all old entries were expired and cleaned up).
    // Total getUser calls: 501 (fill) + 1 (after cleanup) = 502
    expect(mockGetUser).toHaveBeenCalledTimes(502);
  });

  it('does not run cleanup when cache size is <= CACHE_MAX_SIZE/2', async () => {
    const user = fakeUser();

    // Add a few entries (well below 500)
    for (let i = 0; i < 5; i++) {
      const token = `tok_small_${i}`;
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: token } },
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user },
        error: null,
      });
      await authenticateRequest();
    }

    // Advance past TTL
    vi.advanceTimersByTime(4_000);

    // Next call — cleanup should NOT remove entries (size <= 500)
    // but the specific entry is expired so getUser is called
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'tok_small_0' } },
    });
    mockGetUser.mockResolvedValueOnce({
      data: { user },
      error: null,
    });

    const result = await authenticateRequest();
    expect(result.user).toEqual(user);
    // getUser called: 5 (initial) + 1 (cache miss after TTL) = 6
    expect(mockGetUser).toHaveBeenCalledTimes(6);
  });
});

// ===========================================================================
// requireAuth
// ===========================================================================

describe('requireAuth', () => {
  let requireAuth: typeof import('../auth').requireAuth;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../auth');
    requireAuth = mod.requireAuth;
  });

  it('returns user and supabase when authenticated', async () => {
    const { user } = setupAuthenticated();

    const result = await requireAuth();

    expect(result.user).toEqual(user);
    expect(result.supabase).toBe(mockSupabase);
  });

  it('throws the NextResponse error when not authenticated', async () => {
    setupUnauthenticated();

    await expect(requireAuth()).rejects.toBeDefined();
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  });

  it('throws the exact error object returned by authenticateRequest', async () => {
    setupUnauthenticated();

    try {
      await requireAuth();
      // Should not reach here
      expect.fail('requireAuth should have thrown');
    } catch (thrown) {
      // The thrown value should be the mock NextResponse object
      expect(thrown).toHaveProperty('__type', 'NextResponse');
      expect(thrown).toHaveProperty('status', 401);
    }
  });
});

// ===========================================================================
// Token-based Authentication (Desktop App)
// ===========================================================================

describe('authenticateRequest with Bearer token', () => {
  let authenticateRequest: typeof import('../auth').authenticateRequest;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../auth');
    authenticateRequest = mod.authenticateRequest;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createRequestWithToken(token: string): NextRequest {
    return new NextRequest('https://www.jobelix.fr/api/student/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Client-Type': 'desktop',
      },
    });
  }

  it('authenticates successfully with valid Bearer token', async () => {
    const user = fakeUser();
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.test';
    
    mockGetUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    const request = createRequestWithToken(token);
    const result = await authenticateRequest(request);

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
    expect(result.supabase).toBeDefined();
    expect(mockGetUser).toHaveBeenCalledWith(token);
  });

  it('returns 401 when Bearer token is invalid', async () => {
    const token = 'invalid_token';
    
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const request = createRequestWithToken(token);
    const result = await authenticateRequest(request);

    expect(result.user).toBeNull();
    expect(result.supabase).toBeNull();
    expect(result.error).toBeDefined();
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  });

  it('caches token-based authentication', async () => {
    const user = fakeUser();
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.cached';
    
    mockGetUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    const request1 = createRequestWithToken(token);
    const result1 = await authenticateRequest(request1);
    expect(result1.user).toEqual(user);
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    // Advance time but stay within TTL
    vi.advanceTimersByTime(2_000);

    // Second request with same token - should hit cache
    const request2 = createRequestWithToken(token);
    const result2 = await authenticateRequest(request2);
    expect(result2.user).toEqual(user);
    expect(mockGetUser).toHaveBeenCalledTimes(1); // Still only 1 call
  });

  it('expires token cache after TTL', async () => {
    const user = fakeUser();
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expire';
    
    mockGetUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    const request1 = createRequestWithToken(token);
    await authenticateRequest(request1);
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    // Advance past TTL
    vi.advanceTimersByTime(3_001);

    // Second request - should call getUser again
    const request2 = createRequestWithToken(token);
    await authenticateRequest(request2);
    expect(mockGetUser).toHaveBeenCalledTimes(2);
  });

  it('falls back to cookie auth when no Bearer token present', async () => {
    const user = fakeUser();
    
    // Setup cookie-based auth
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'cookie_token' } },
    });
    mockGetUser.mockResolvedValue({
      data: { user },
      error: null,
    });

    // Request without Authorization header
    const request = new NextRequest('https://www.jobelix.fr/api/student/profile', {
      method: 'GET',
    });

    const result = await authenticateRequest(request);

    expect(result.error).toBeNull();
    expect(result.user).toEqual(user);
    expect(mockGetSession).toHaveBeenCalledOnce();
  });
});
