/**
 * Security Tests: OAuth (GitHub) CSRF Protection & Token Integrity
 *
 * Tests for:
 * - HMAC-signed state parameter generation and verification
 * - CSRF protection via state nonce
 * - Timing-safe signature comparison
 * - State expiry enforcement (10 min)
 * - User ID mismatch detection (session fixation prevention)
 * - Token exchange and connection save error handling
 * - Auth enforcement on all OAuth endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
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
// Helpers
// ---------------------------------------------------------------------------

const STATE_SECRET = 'test-github-secret';
const TEST_USER_ID = 'user-abc-123';

function makeRequest(path: string, base = 'http://localhost:3000'): NextRequest {
  return new NextRequest(new URL(path, base));
}

function generateValidState(userId: string, timestamp?: number): string {
  const stateData = JSON.stringify({
    userId,
    nonce: 'test-nonce-' + Math.random().toString(36).slice(2),
    ts: timestamp ?? Date.now(),
  });
  const sig = createHmac('sha256', STATE_SECRET).update(stateData).digest('hex');
  const signedState = JSON.stringify({ data: stateData, sig });
  return Buffer.from(signedState).toString('base64url');
}

function generateExpiredState(userId: string): string {
  return generateValidState(userId, Date.now() - 11 * 60 * 1000); // 11 min ago
}

function generateTamperedState(userId: string): string {
  const stateData = JSON.stringify({
    userId,
    nonce: 'test-nonce-tampered',
    ts: Date.now(),
  });
  const wrongSig = 'a'.repeat(64);
  const signedState = JSON.stringify({ data: stateData, sig: wrongSig });
  return Buffer.from(signedState).toString('base64url');
}

function authenticatedUser(id: string = TEST_USER_ID) {
  mockGetUser.mockResolvedValue({
    data: { user: { id } },
    error: null,
  });
}

function unauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'not authenticated' },
  });
}

function extractRedirectUrl(response: Response): URL {
  const location = response.headers.get('Location');
  if (!location) throw new Error('No Location header in redirect response');
  return new URL(location);
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockGetGitHubAuthUrl.mockReturnValue('https://github.com/login/oauth/authorize?test=1');
});

// ===========================================================================
// AUTHORIZE ROUTE
// ===========================================================================

describe('OAuth GitHub Authorize (/api/oauth/github/authorize)', () => {
  async function importAuthorize() {
    return import('@/app/api/oauth/github/authorize/route');
  }

  describe('authentication', () => {
    it('returns 401 for unauthenticated user', async () => {
      unauthenticatedUser();
      const { GET } = await importAuthorize();
      const response = await GET(makeRequest('/api/oauth/github/authorize'));
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toContain('Unauthorized');
    });

    it('redirects authenticated user to GitHub', async () => {
      authenticatedUser();
      const { GET } = await importAuthorize();
      const response = await GET(makeRequest('/api/oauth/github/authorize'));
      // NextResponse.redirect returns 307 by default
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('github.com');
    });
  });

  describe('state generation', () => {
    it('generates state with valid JSON containing userId, nonce, ts', async () => {
      authenticatedUser();
      const { GET } = await importAuthorize();
      await GET(makeRequest('/api/oauth/github/authorize'));

      // getGitHubAuthUrl is called with (encodedState, forceAccountSelection)
      expect(mockGetGitHubAuthUrl).toHaveBeenCalledOnce();
      const [encodedState] = mockGetGitHubAuthUrl.mock.calls[0];

      const decoded = JSON.parse(Buffer.from(encodedState, 'base64url').toString());
      expect(decoded).toHaveProperty('data');
      expect(decoded).toHaveProperty('sig');

      const stateData = JSON.parse(decoded.data);
      expect(stateData.userId).toBe(TEST_USER_ID);
      expect(stateData.nonce).toBeDefined();
      expect(typeof stateData.nonce).toBe('string');
      expect(stateData.nonce.length).toBeGreaterThan(0);
      expect(stateData.ts).toBeDefined();
      expect(typeof stateData.ts).toBe('number');
    });

    it('generates valid HMAC signature over state data', async () => {
      authenticatedUser();
      const { GET } = await importAuthorize();
      await GET(makeRequest('/api/oauth/github/authorize'));

      const [encodedState] = mockGetGitHubAuthUrl.mock.calls[0];
      const decoded = JSON.parse(Buffer.from(encodedState, 'base64url').toString());

      const expectedSig = createHmac('sha256', STATE_SECRET)
        .update(decoded.data)
        .digest('hex');
      expect(decoded.sig).toBe(expectedSig);
    });

    it('generates different state values for different users', async () => {
      const { GET } = await importAuthorize();

      authenticatedUser('user-aaa');
      await GET(makeRequest('/api/oauth/github/authorize'));
      const [state1] = mockGetGitHubAuthUrl.mock.calls[0];

      authenticatedUser('user-bbb');
      await GET(makeRequest('/api/oauth/github/authorize'));
      const [state2] = mockGetGitHubAuthUrl.mock.calls[1];

      expect(state1).not.toBe(state2);

      const d1 = JSON.parse(JSON.parse(Buffer.from(state1, 'base64url').toString()).data);
      const d2 = JSON.parse(JSON.parse(Buffer.from(state2, 'base64url').toString()).data);
      expect(d1.userId).not.toBe(d2.userId);
    });

    it('passes force=true to getGitHubAuthUrl when ?force=true', async () => {
      authenticatedUser();
      const { GET } = await importAuthorize();
      await GET(makeRequest('/api/oauth/github/authorize?force=true'));
      expect(mockGetGitHubAuthUrl).toHaveBeenCalledWith(expect.any(String), true);
    });

    it('passes force=false to getGitHubAuthUrl when ?force is absent', async () => {
      authenticatedUser();
      const { GET } = await importAuthorize();
      await GET(makeRequest('/api/oauth/github/authorize'));
      expect(mockGetGitHubAuthUrl).toHaveBeenCalledWith(expect.any(String), false);
    });
  });
});

// ===========================================================================
// CALLBACK ROUTE
// ===========================================================================

describe('OAuth GitHub Callback (/api/oauth/github/callback)', () => {
  async function importCallback() {
    return import('@/app/api/oauth/github/callback/route');
  }

  describe('missing parameters', () => {
    it('redirects with error when code is missing', async () => {
      const state = generateValidState(TEST_USER_ID);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('missing_params');
    });

    it('redirects with error when state is missing', async () => {
      const { GET } = await importCallback();
      const response = await GET(makeRequest('/api/oauth/github/callback?code=test-code'));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('missing_params');
    });
  });

  describe('state verification', () => {
    it('rejects invalid base64 state', async () => {
      authenticatedUser();
      const { GET } = await importCallback();
      const response = await GET(makeRequest('/api/oauth/github/callback?code=test-code&state=!!!not-base64!!!'));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('invalid_state');
    });

    it('rejects malformed JSON in state', async () => {
      authenticatedUser();
      const badState = Buffer.from('not-json-at-all').toString('base64url');
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${badState}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('invalid_state');
    });

    it('rejects state with wrong HMAC signature', async () => {
      authenticatedUser();
      const tampered = generateTamperedState(TEST_USER_ID);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${tampered}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('invalid_state');
    });

    it('rejects state with empty signature', async () => {
      authenticatedUser();
      const stateData = JSON.stringify({ userId: TEST_USER_ID, nonce: 'n', ts: Date.now() });
      const signedState = JSON.stringify({ data: stateData, sig: '' });
      const encoded = Buffer.from(signedState).toString('base64url');

      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${encoded}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('invalid_state');
    });
  });

  describe('timing-safe comparison', () => {
    it('uses timingSafeEqual for signature verification (code audit)', async () => {
      // Read the callback route source and verify it imports and uses timingSafeEqual.
      // This is a static analysis test — the implementation must use timing-safe comparison.
      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');
      const source = readFileSync(
        resolve(process.cwd(), 'app/api/oauth/github/callback/route.ts'),
        'utf-8'
      );
      expect(source).toContain('timingSafeEqual');
      expect(source).toMatch(/import\s*\{[^}]*timingSafeEqual[^}]*\}\s*from\s*['"]crypto['"]/);
    });
  });

  describe('state expiry', () => {
    it('rejects state created more than 10 minutes ago', async () => {
      authenticatedUser();
      const expired = generateExpiredState(TEST_USER_ID);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${expired}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('state_expired');
    });

    it('accepts state created 9 minutes ago', async () => {
      authenticatedUser();
      mockExchangeGitHubCode.mockResolvedValue({ access_token: 'tok', token_type: 'bearer', scope: 'read:user' });
      mockFetchGitHubUser.mockResolvedValue({ login: 'gh-user', name: 'GH', avatar_url: '', html_url: '' });
      mockSaveGitHubConnection.mockResolvedValue({ id: 1 });

      const nineMinAgo = Date.now() - 9 * 60 * 1000;
      const state = generateValidState(TEST_USER_ID, nineMinAgo);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_connected')).toBe('true');
    });

    it('boundary: state at exactly 10 minutes is expired (> check)', async () => {
      authenticatedUser();
      // At exactly 10 min the condition is Date.now() - ts > 600000 which is false (0 > 0).
      // So exactly 10 min should NOT expire. However, due to execution time it might.
      // We test 10 min + 1 ms to be definitively expired.
      const state = generateValidState(TEST_USER_ID, Date.now() - (10 * 60 * 1000 + 1));
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('state_expired');
    });
  });

  describe('user ID mismatch', () => {
    it('rejects when state userId does not match authenticated user', async () => {
      authenticatedUser('different-user-id');
      const state = generateValidState(TEST_USER_ID); // signed for TEST_USER_ID
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('unauthorized');
    });

    it('rejects when user is not authenticated at all', async () => {
      unauthenticatedUser();
      const state = generateValidState(TEST_USER_ID);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('unauthorized');
    });

    it('proceeds when state userId matches authenticated user', async () => {
      authenticatedUser(TEST_USER_ID);
      mockExchangeGitHubCode.mockResolvedValue({ access_token: 'tok', token_type: 'bearer', scope: 'read:user' });
      mockFetchGitHubUser.mockResolvedValue({ login: 'gh-user', name: 'GH', avatar_url: '', html_url: '' });
      mockSaveGitHubConnection.mockResolvedValue({ id: 1 });

      const state = generateValidState(TEST_USER_ID);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_connected')).toBe('true');
    });
  });

  describe('token exchange', () => {
    it('redirects with error when code exchange fails', async () => {
      authenticatedUser();
      mockExchangeGitHubCode.mockResolvedValue(null);

      const state = generateValidState(TEST_USER_ID);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('token_exchange_failed');
    });

    it('redirects with error when save fails', async () => {
      authenticatedUser();
      mockExchangeGitHubCode.mockResolvedValue({ access_token: 'tok', token_type: 'bearer', scope: 'read:user' });
      mockFetchGitHubUser.mockResolvedValue({ login: 'gh-user', name: 'GH', avatar_url: '', html_url: '' });
      mockSaveGitHubConnection.mockResolvedValue(null);

      const state = generateValidState(TEST_USER_ID);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('save_failed');
    });

    it('redirects with success when exchange and save succeed', async () => {
      authenticatedUser();
      mockExchangeGitHubCode.mockResolvedValue({ access_token: 'tok', token_type: 'bearer', scope: 'read:user' });
      mockFetchGitHubUser.mockResolvedValue({ login: 'gh-user', name: 'GH', avatar_url: '', html_url: '' });
      mockSaveGitHubConnection.mockResolvedValue({ id: 1 });

      const state = generateValidState(TEST_USER_ID);
      const { GET } = await importCallback();
      const response = await GET(makeRequest(`/api/oauth/github/callback?code=test-code&state=${state}`));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_connected')).toBe('true');
      expect(url.searchParams.has('github_error')).toBe(false);
    });

    it('passes correct args to saveGitHubConnection', async () => {
      authenticatedUser();
      mockExchangeGitHubCode.mockResolvedValue({ access_token: 'my-token', token_type: 'bearer', scope: 'read:user public_repo' });
      mockFetchGitHubUser.mockResolvedValue({ login: 'octocat', name: 'Octo Cat', avatar_url: 'https://avatar', html_url: 'https://github.com/octocat' });
      mockSaveGitHubConnection.mockResolvedValue({ id: 1 });

      const state = generateValidState(TEST_USER_ID);
      const { GET } = await importCallback();
      await GET(makeRequest(`/api/oauth/github/callback?code=the-code&state=${state}`));

      expect(mockExchangeGitHubCode).toHaveBeenCalledWith('the-code');
      expect(mockFetchGitHubUser).toHaveBeenCalledWith('my-token');
      expect(mockSaveGitHubConnection).toHaveBeenCalledWith(
        TEST_USER_ID,
        'my-token',
        'bearer',
        'read:user public_repo',
        expect.objectContaining({
          username: 'octocat',
          name: 'Octo Cat',
          avatar_url: 'https://avatar',
          profile_url: 'https://github.com/octocat',
        })
      );
    });
  });

  describe('GitHub error handling', () => {
    it('redirects with GitHub error param (e.g., access_denied)', async () => {
      const { GET } = await importCallback();
      const response = await GET(makeRequest('/api/oauth/github/callback?error=access_denied'));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('access_denied');
    });

    it('handles arbitrary GitHub error values', async () => {
      const { GET } = await importCallback();
      const response = await GET(makeRequest('/api/oauth/github/callback?error=some_custom_error'));
      const url = extractRedirectUrl(response);
      expect(url.searchParams.get('github_error')).toBe('some_custom_error');
    });
  });
});

// ===========================================================================
// STATUS ROUTE
// ===========================================================================

describe('OAuth GitHub Status (/api/oauth/github/status)', () => {
  async function importStatus() {
    return import('@/app/api/oauth/github/status/route');
  }

  it('returns 401 for unauthenticated user', async () => {
    unauthenticatedUser();
    const { GET } = await importStatus();
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns connected=false when no GitHub connection exists', async () => {
    authenticatedUser();
    mockGetGitHubConnection.mockResolvedValue(null);
    const { GET } = await importStatus();
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.connected).toBe(false);
    expect(body.connection).toBeNull();
  });

  it('returns connected=true with metadata when connection exists', async () => {
    authenticatedUser();
    mockGetGitHubConnection.mockResolvedValue({
      connected_at: '2025-01-01T00:00:00Z',
      last_synced_at: '2025-01-02T00:00:00Z',
      metadata: { username: 'octocat' },
    });
    const { GET } = await importStatus();
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.connected).toBe(true);
    expect(body.connection.metadata.username).toBe('octocat');
  });

  it('sets no-cache headers on response', async () => {
    authenticatedUser();
    mockGetGitHubConnection.mockResolvedValue(null);
    const { GET } = await importStatus();
    const response = await GET();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});

// ===========================================================================
// DISCONNECT ROUTE
// ===========================================================================

describe('OAuth GitHub Disconnect (/api/oauth/github/disconnect)', () => {
  async function importDisconnect() {
    return import('@/app/api/oauth/github/disconnect/route');
  }

  it('returns 401 for unauthenticated user', async () => {
    unauthenticatedUser();
    const { POST } = await importDisconnect();
    const response = await POST();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('disconnects successfully for authenticated user', async () => {
    authenticatedUser();
    mockDeleteGitHubConnection.mockResolvedValue(true);
    const { POST } = await importDisconnect();
    const response = await POST();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockDeleteGitHubConnection).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('returns 500 when disconnect fails', async () => {
    authenticatedUser();
    mockDeleteGitHubConnection.mockResolvedValue(false);
    const { POST } = await importDisconnect();
    const response = await POST();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('disconnect');
  });
});
