/**
 * Comprehensive tests for GitHub OAuth API routes
 *
 * Tests cover: authorize, callback, disconnect, and status endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

// ---------------------------------------------------------------------------
// Set env BEFORE any route module is imported (routes read it at module level)
// ---------------------------------------------------------------------------
process.env.GITHUB_CLIENT_SECRET = 'test-secret';

// ---------------------------------------------------------------------------
// Mock modules – must be declared before any import that triggers them
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockSupabaseClient = { auth: { getUser: mockGetUser } };
const mockCreateClient = vi.fn(async () => mockSupabaseClient);

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: () => mockCreateClient(),
}));

const mockGetGitHubAuthUrl = vi.fn();
const mockExchangeGitHubCode = vi.fn();
const mockSaveGitHubConnection = vi.fn();
const mockDeleteGitHubConnection = vi.fn();
const mockGetGitHubConnection = vi.fn();

vi.mock('@/lib/server/githubOAuth', () => ({
  getGitHubAuthUrl: (...args: unknown[]) => mockGetGitHubAuthUrl(...args),
  exchangeGitHubCode: (...args: unknown[]) => mockExchangeGitHubCode(...args),
  saveGitHubConnection: (...args: unknown[]) => mockSaveGitHubConnection(...args),
  deleteGitHubConnection: (...args: unknown[]) => mockDeleteGitHubConnection(...args),
  getGitHubConnection: (...args: unknown[]) => mockGetGitHubConnection(...args),
}));

const mockFetchGitHubUser = vi.fn();

vi.mock('@/lib/server/githubService', () => ({
  fetchGitHubUser: (...args: unknown[]) => mockFetchGitHubUser(...args),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATE_SECRET = 'test-secret';
const MOCK_USER_ID = '00000000-1111-2222-3333-444444444444';

/** Parse JSON body from a Response */
async function json(res: Response) {
  return res.json();
}

/** Build a valid HMAC-signed state string (base64url encoded) */
function buildSignedState(
  userId: string,
  opts?: { nonce?: string; ts?: number },
): string {
  const nonce = opts?.nonce ?? 'abc123';
  const ts = opts?.ts ?? Date.now();

  const stateData = JSON.stringify({ userId, nonce, ts });
  const sig = createHmac('sha256', STATE_SECRET).update(stateData).digest('hex');
  const signedState = JSON.stringify({ data: stateData, sig });
  return Buffer.from(signedState).toString('base64url');
}

// ---------------------------------------------------------------------------
// Reset all mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// 1. GET /api/oauth/github/authorize
// ===========================================================================
describe('GET /api/oauth/github/authorize', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../github/authorize/route');
    GET = mod.GET;
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const req = new NextRequest('http://localhost:3000/api/oauth/github/authorize');
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(await json(res)).toEqual({ error: 'Unauthorized. Please log in.' });
  });

  it('returns 401 when getUser returns no user and no error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const req = new NextRequest('http://localhost:3000/api/oauth/github/authorize');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('redirects to GitHub auth URL on success', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubAuthUrl.mockReturnValueOnce('https://github.com/login/oauth/authorize?state=abc');

    const req = new NextRequest('http://localhost:3000/api/oauth/github/authorize');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toBe('https://github.com/login/oauth/authorize?state=abc');
    expect(mockGetGitHubAuthUrl).toHaveBeenCalledWith(expect.any(String), false);
  });

  it('passes forceAccountSelection=true when ?force=true', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubAuthUrl.mockReturnValueOnce('https://github.com/login/oauth/authorize?prompt=select_account');

    const req = new NextRequest('http://localhost:3000/api/oauth/github/authorize?force=true');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(mockGetGitHubAuthUrl).toHaveBeenCalledWith(expect.any(String), true);
  });

  it('passes forceAccountSelection=false when ?force is absent', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubAuthUrl.mockReturnValueOnce('https://github.com/example');

    const req = new NextRequest('http://localhost:3000/api/oauth/github/authorize');
    await GET(req);

    expect(mockGetGitHubAuthUrl).toHaveBeenCalledWith(expect.any(String), false);
  });

  it('generates HMAC-signed state with user ID', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubAuthUrl.mockReturnValueOnce('https://github.com/example');

    const req = new NextRequest('http://localhost:3000/api/oauth/github/authorize');
    await GET(req);

    // Verify the state passed to getGitHubAuthUrl is a valid signed state
    const encodedState = mockGetGitHubAuthUrl.mock.calls[0][0] as string;
    const decoded = JSON.parse(Buffer.from(encodedState, 'base64url').toString());
    expect(decoded).toHaveProperty('data');
    expect(decoded).toHaveProperty('sig');

    const stateData = JSON.parse(decoded.data);
    expect(stateData.userId).toBe(MOCK_USER_ID);
    expect(stateData).toHaveProperty('nonce');
    expect(stateData).toHaveProperty('ts');

    // Verify HMAC signature is correct
    const expectedSig = createHmac('sha256', STATE_SECRET)
      .update(decoded.data)
      .digest('hex');
    expect(decoded.sig).toBe(expectedSig);
  });

  it('returns 500 when an unexpected error is thrown', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('unexpected'));

    const req = new NextRequest('http://localhost:3000/api/oauth/github/authorize');
    const res = await GET(req);

    expect(res.status).toBe(500);
    expect(await json(res)).toEqual({ error: 'Failed to initiate GitHub authorization' });
  });
});

// ===========================================================================
// 2. GET /api/oauth/github/callback
// ===========================================================================
describe('GET /api/oauth/github/callback', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../github/callback/route');
    GET = mod.GET;
  });

  it('redirects with github_error when error param is present', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/oauth/github/callback?error=access_denied',
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=access_denied');
  });

  it('redirects with missing_params when code is missing', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/oauth/github/callback?state=some_state',
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=missing_params');
  });

  it('redirects with missing_params when state is missing', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/oauth/github/callback?code=some_code',
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=missing_params');
  });

  it('redirects with invalid_state when state has invalid signature', async () => {
    const stateData = JSON.stringify({ userId: MOCK_USER_ID, nonce: 'x', ts: Date.now() });
    const badState = JSON.stringify({ data: stateData, sig: 'invalid_signature' });
    const encodedState = Buffer.from(badState).toString('base64url');

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=invalid_state');
  });

  it('redirects with invalid_state when state is not valid base64url JSON', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/oauth/github/callback?code=test_code&state=not_valid_json',
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=invalid_state');
  });

  it('redirects with state_expired when state is older than 10 minutes', async () => {
    const expiredTs = Date.now() - 11 * 60 * 1000; // 11 minutes ago
    const encodedState = buildSignedState(MOCK_USER_ID, { ts: expiredTs });

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=state_expired');
  });

  it('redirects with unauthorized when user is not authenticated', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=unauthorized');
  });

  it('redirects with unauthorized when user ID does not match state', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'different-user-id' } },
      error: null,
    });

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=unauthorized');
  });

  it('redirects with token_exchange_failed when exchange returns null', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockExchangeGitHubCode.mockResolvedValueOnce(null);

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=token_exchange_failed');
  });

  it('redirects with save_failed when saveGitHubConnection returns null', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockExchangeGitHubCode.mockResolvedValueOnce({
      access_token: 'gho_abc123',
      token_type: 'bearer',
      scope: 'repo',
    });
    mockFetchGitHubUser.mockResolvedValueOnce({
      login: 'octocat',
      name: 'Octocat',
      avatar_url: 'https://github.com/octocat.png',
      html_url: 'https://github.com/octocat',
    });
    mockSaveGitHubConnection.mockResolvedValueOnce(null);

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=save_failed');
  });

  it('redirects with github_connected=true on full success', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockExchangeGitHubCode.mockResolvedValueOnce({
      access_token: 'gho_abc123',
      token_type: 'bearer',
      scope: 'repo',
    });
    mockFetchGitHubUser.mockResolvedValueOnce({
      login: 'octocat',
      name: 'Octocat',
      avatar_url: 'https://github.com/octocat.png',
      html_url: 'https://github.com/octocat',
    });
    mockSaveGitHubConnection.mockResolvedValueOnce({ id: 'connection-id' });

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_connected=true');
  });

  it('saves connection with empty metadata when fetchGitHubUser returns null', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockExchangeGitHubCode.mockResolvedValueOnce({
      access_token: 'gho_abc123',
      token_type: 'bearer',
      scope: 'repo',
    });
    mockFetchGitHubUser.mockResolvedValueOnce(null);
    mockSaveGitHubConnection.mockResolvedValueOnce({ id: 'connection-id' });

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_connected=true');

    // Metadata should be empty object when GitHub user is null
    expect(mockSaveGitHubConnection).toHaveBeenCalledWith(
      MOCK_USER_ID,
      'gho_abc123',
      'bearer',
      'repo',
      {},
    );
  });

  it('passes correct metadata from GitHub user to saveGitHubConnection', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockExchangeGitHubCode.mockResolvedValueOnce({
      access_token: 'gho_token',
      token_type: 'bearer',
      scope: 'repo,user',
    });
    mockFetchGitHubUser.mockResolvedValueOnce({
      login: 'testuser',
      name: 'Test User',
      avatar_url: 'https://github.com/testuser.png',
      html_url: 'https://github.com/testuser',
    });
    mockSaveGitHubConnection.mockResolvedValueOnce({ id: 'conn-id' });

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=mycode&state=${encodedState}`,
    );
    await GET(req);

    expect(mockSaveGitHubConnection).toHaveBeenCalledWith(
      MOCK_USER_ID,
      'gho_token',
      'bearer',
      'repo,user',
      {
        username: 'testuser',
        name: 'Test User',
        avatar_url: 'https://github.com/testuser.png',
        profile_url: 'https://github.com/testuser',
      },
    );
  });

  it('redirects with unexpected_error when an exception is thrown', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockExchangeGitHubCode.mockRejectedValueOnce(new Error('network failure'));

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('Location')).toContain('github_error=unexpected_error');
  });

  it('accepts state that is within the 10-minute window (boundary)', async () => {
    // Use a timestamp just under 10 minutes ago to ensure it's within the window
    // (exact 10 min can fail due to ms elapsed between test setup and route execution)
    const borderlineTs = Date.now() - (10 * 60 * 1000 - 1000);
    const encodedState = buildSignedState(MOCK_USER_ID, { ts: borderlineTs });

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockExchangeGitHubCode.mockResolvedValueOnce({
      access_token: 'gho_abc',
      token_type: 'bearer',
      scope: 'repo',
    });
    mockFetchGitHubUser.mockResolvedValueOnce(null);
    mockSaveGitHubConnection.mockResolvedValueOnce({ id: 'conn' });

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=test_code&state=${encodedState}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    // Just under 10 min should be valid since the check is Date.now() - ts > STATE_MAX_AGE_MS
    expect(res.headers.get('Location')).toContain('github_connected=true');
  });

  it('calls exchangeGitHubCode with the code from query params', async () => {
    const encodedState = buildSignedState(MOCK_USER_ID);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockExchangeGitHubCode.mockResolvedValueOnce(null);

    const req = new NextRequest(
      `http://localhost:3000/api/oauth/github/callback?code=my_auth_code&state=${encodedState}`,
    );
    await GET(req);

    expect(mockExchangeGitHubCode).toHaveBeenCalledWith('my_auth_code');
  });
});

// ===========================================================================
// 3. POST /api/oauth/github/disconnect
// ===========================================================================
describe('POST /api/oauth/github/disconnect', () => {
  let POST: () => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../github/disconnect/route');
    POST = mod.POST;
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const res = await POST();

    expect(res.status).toBe(401);
    expect(await json(res)).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when getUser returns no user and no error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const res = await POST();

    expect(res.status).toBe(401);
  });

  it('returns 500 when deleteGitHubConnection returns false', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockDeleteGitHubConnection.mockResolvedValueOnce(false);

    const res = await POST();

    expect(res.status).toBe(500);
    expect(await json(res)).toEqual({ error: 'Failed to disconnect GitHub' });
  });

  it('returns success when deleteGitHubConnection returns true', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockDeleteGitHubConnection.mockResolvedValueOnce(true);

    const res = await POST();

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ success: true });
    expect(mockDeleteGitHubConnection).toHaveBeenCalledWith(MOCK_USER_ID);
  });

  it('returns 500 when an unexpected error is thrown', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('unexpected'));

    const res = await POST();

    expect(res.status).toBe(500);
    expect(await json(res)).toEqual({ error: 'Internal server error' });
  });
});

// ===========================================================================
// 4. GET /api/oauth/github/status
// ===========================================================================
describe('GET /api/oauth/github/status', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../github/status/route');
    GET = mod.GET;
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await json(res)).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when getUser returns no user and no error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns connected=false when no connection exists', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubConnection.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      success: true,
      connected: false,
      connection: null,
    });
  });

  it('returns no-cache headers when no connection exists', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubConnection.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.headers.get('Cache-Control')).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    expect(res.headers.get('Pragma')).toBe('no-cache');
    expect(res.headers.get('Expires')).toBe('0');
  });

  it('returns connected=true with connection details when connection exists', async () => {
    const mockConnection = {
      connected_at: '2025-06-01T00:00:00Z',
      last_synced_at: '2025-06-02T12:00:00Z',
      metadata: {
        username: 'octocat',
        name: 'Octocat',
        avatar_url: 'https://github.com/octocat.png',
        profile_url: 'https://github.com/octocat',
      },
      // Sensitive fields that should NOT be exposed
      access_token: 'gho_secret_token',
      token_type: 'bearer',
    };

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubConnection.mockResolvedValueOnce(mockConnection);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toEqual({
      success: true,
      connected: true,
      connection: {
        connected_at: '2025-06-01T00:00:00Z',
        last_synced_at: '2025-06-02T12:00:00Z',
        metadata: {
          username: 'octocat',
          name: 'Octocat',
          avatar_url: 'https://github.com/octocat.png',
          profile_url: 'https://github.com/octocat',
        },
      },
    });

    // Verify sensitive data is NOT exposed
    expect(body.connection).not.toHaveProperty('access_token');
    expect(body.connection).not.toHaveProperty('token_type');
  });

  it('returns no-cache headers when connection exists', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubConnection.mockResolvedValueOnce({
      connected_at: '2025-06-01T00:00:00Z',
      last_synced_at: null,
      metadata: {},
    });

    const res = await GET();

    expect(res.headers.get('Cache-Control')).toBe(
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    expect(res.headers.get('Pragma')).toBe('no-cache');
    expect(res.headers.get('Expires')).toBe('0');
  });

  it('calls getGitHubConnection with the correct user ID', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
      error: null,
    });
    mockGetGitHubConnection.mockResolvedValueOnce(null);

    await GET();

    expect(mockGetGitHubConnection).toHaveBeenCalledWith(MOCK_USER_ID);
  });

  it('returns 500 when an unexpected error is thrown', async () => {
    mockGetUser.mockRejectedValueOnce(new Error('unexpected'));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await json(res)).toEqual({ error: 'Internal server error' });
  });
});
