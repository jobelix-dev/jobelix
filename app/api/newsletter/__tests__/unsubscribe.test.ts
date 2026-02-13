/**
 * Tests for GET/POST /api/newsletter/unsubscribe
 *
 * Covers:
 * - GET: Parameter validation, token verification, unsubscribe flow, HTML response
 * - POST: One-click unsubscribe (RFC 8058), error handling
 * - Exported helpers: generateUnsubscribeToken, generateUnsubscribeUrl
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// ---------------------------------------------------------------------------
// Environment variables — must be set BEFORE module import
// ---------------------------------------------------------------------------
process.env.RESEND_API_KEY = 'test-api-key';
process.env.NEWSLETTER_UNSUBSCRIBE_SECRET = 'test-secret';

// ---------------------------------------------------------------------------
// Mock: Resend
// ---------------------------------------------------------------------------
const mockContactsList = vi.fn();
const mockContactsUpdate = vi.fn();

vi.mock('resend', () => {
  // Must be a regular function (constructor-compatible with `new`)
  function MockResend() {
    return { contacts: { list: mockContactsList, update: mockContactsUpdate } };
  }
  return { Resend: MockResend };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_EMAIL = 'test@test.com';

/**
 * Generate a valid HMAC token matching the route's logic.
 * Uses the same secret set in process.env.NEWSLETTER_UNSUBSCRIBE_SECRET.
 */
function makeValidToken(email: string): string {
  return createHmac('sha256', 'test-secret').update(email.toLowerCase()).digest('hex');
}

function createGetRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/newsletter/unsubscribe');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function createPostRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/newsletter/unsubscribe');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: 'POST' });
}

/** Mock contacts.list to return a contact matching the email */
function setupContactFound(email: string, contactId: string = 'contact_123') {
  mockContactsList.mockResolvedValue({
    data: {
      data: [{ id: contactId, email }],
    },
  });
  mockContactsUpdate.mockResolvedValue({ data: {}, error: null });
}

/** Mock contacts.list to return no matching contact */
function setupContactNotFound() {
  mockContactsList.mockResolvedValue({
    data: { data: [{ id: 'other_contact', email: 'other@example.com' }] },
  });
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// GET /api/newsletter/unsubscribe
// ===========================================================================
describe('GET /api/newsletter/unsubscribe', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../../newsletter/unsubscribe/route');
    GET = mod.GET;
  });

  // -----------------------------------------------------------------------
  // Parameter validation
  // -----------------------------------------------------------------------
  describe('parameter validation', () => {
    it('returns 400 when email is missing', async () => {
      const token = makeValidToken(TEST_EMAIL);
      const req = createGetRequest({ token });
      const res = await GET(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toBe('Missing email parameter');
    });

    it('returns 400 when token is missing', async () => {
      const req = createGetRequest({ email: TEST_EMAIL });
      const res = await GET(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toBe('Missing token parameter');
    });

    it('returns 400 when both email and token are missing', async () => {
      const req = createGetRequest({});
      const res = await GET(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toBe('Missing email parameter');
    });
  });

  // -----------------------------------------------------------------------
  // Token verification
  // -----------------------------------------------------------------------
  describe('token verification', () => {
    it('returns 403 when token is invalid (wrong HMAC)', async () => {
      const req = createGetRequest({ email: TEST_EMAIL, token: 'bad-token' });
      const res = await GET(req);
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).toBe('Invalid unsubscribe token');
    });

    it('returns 403 when token belongs to a different email', async () => {
      const tokenForDifferentEmail = makeValidToken('other@example.com');
      const req = createGetRequest({ email: TEST_EMAIL, token: tokenForDifferentEmail });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // Successful unsubscribe
  // -----------------------------------------------------------------------
  describe('successful unsubscribe', () => {
    it('unsubscribes contact and returns HTML with "Unsubscribed"', async () => {
      const token = makeValidToken(TEST_EMAIL);
      setupContactFound(TEST_EMAIL);

      const req = createGetRequest({ email: TEST_EMAIL, token });
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/html');

      const html = await res.text();
      expect(html).toContain('Unsubscribed');
      expect(html).not.toContain('Something went wrong');

      // Verify Resend was called to update the contact
      expect(mockContactsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'contact_123', unsubscribed: true })
      );
    });

    it('handles case-insensitive email for token generation', async () => {
      // Token generated for lowercase email should match
      const token = makeValidToken('Test@Test.COM');
      setupContactFound('test@test.com');

      const req = createGetRequest({ email: 'Test@Test.COM', token });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Unsubscribed');
    });
  });

  // -----------------------------------------------------------------------
  // Contact not found
  // -----------------------------------------------------------------------
  describe('contact not found', () => {
    it('returns HTML with "Something went wrong" when contact not found', async () => {
      const token = makeValidToken(TEST_EMAIL);
      setupContactNotFound();

      const req = createGetRequest({ email: TEST_EMAIL, token });
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/html');

      const html = await res.text();
      expect(html).toContain('Something went wrong');
      expect(html).not.toContain('>Unsubscribed<');
    });

    it('returns HTML with error when contacts.list returns empty data', async () => {
      const token = makeValidToken(TEST_EMAIL);
      mockContactsList.mockResolvedValue({ data: { data: [] } });

      const req = createGetRequest({ email: TEST_EMAIL, token });
      const res = await GET(req);
      expect(res.status).toBe(200);

      const html = await res.text();
      expect(html).toContain('Something went wrong');
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('returns HTML with error when Resend API throws', async () => {
      const token = makeValidToken(TEST_EMAIL);
      mockContactsList.mockRejectedValue(new Error('Resend API error'));

      const req = createGetRequest({ email: TEST_EMAIL, token });
      const res = await GET(req);
      expect(res.status).toBe(200);

      const html = await res.text();
      expect(html).toContain('Something went wrong');
    });
  });
});

// ===========================================================================
// POST /api/newsletter/unsubscribe
// ===========================================================================
describe('POST /api/newsletter/unsubscribe', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../../newsletter/unsubscribe/route');
    POST = mod.POST;
  });

  it('returns 400 when email is missing', async () => {
    const token = makeValidToken(TEST_EMAIL);
    const req = createPostRequest({ token });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('Missing email parameter');
  });

  it('returns 400 when token is missing', async () => {
    const req = createPostRequest({ email: TEST_EMAIL });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('Missing token parameter');
  });

  it('returns 403 when token is invalid', async () => {
    const req = createPostRequest({ email: TEST_EMAIL, token: 'invalid' });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).toBe('Invalid unsubscribe token');
  });

  it('processes unsubscribe and returns empty 200 (RFC 8058)', async () => {
    const token = makeValidToken(TEST_EMAIL);
    setupContactFound(TEST_EMAIL);

    const req = createPostRequest({ email: TEST_EMAIL, token });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Body should be null/empty per RFC 8058
    const body = await res.text();
    expect(body).toBe('');

    // Should have called Resend to unsubscribe
    expect(mockContactsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'contact_123', unsubscribed: true })
    );
  });

  it('returns 200 even when unsubscribe fails (RFC compliance)', async () => {
    const token = makeValidToken(TEST_EMAIL);
    mockContactsList.mockRejectedValue(new Error('Resend down'));

    const req = createPostRequest({ email: TEST_EMAIL, token });
    const res = await POST(req);
    // Should still return 200 — one-click unsubscribe must not fail visibly
    expect(res.status).toBe(200);
  });

  it('returns 200 when contact is not found', async () => {
    const token = makeValidToken(TEST_EMAIL);
    setupContactNotFound();

    const req = createPostRequest({ email: TEST_EMAIL, token });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// Exported helpers
// ===========================================================================
describe('generateUnsubscribeToken', () => {
  let generateUnsubscribeToken: (email: string) => string;

  beforeEach(async () => {
    const mod = await import('../../newsletter/unsubscribe/route');
    generateUnsubscribeToken = mod.generateUnsubscribeToken;
  });

  it('returns a consistent HMAC for the same email', () => {
    const token1 = generateUnsubscribeToken('test@test.com');
    const token2 = generateUnsubscribeToken('test@test.com');
    expect(token1).toBe(token2);
  });

  it('returns different tokens for different emails', () => {
    const token1 = generateUnsubscribeToken('alice@test.com');
    const token2 = generateUnsubscribeToken('bob@test.com');
    expect(token1).not.toBe(token2);
  });

  it('returns a hex string', () => {
    const token = generateUnsubscribeToken('test@test.com');
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('lowercases email before hashing', () => {
    const token1 = generateUnsubscribeToken('Test@Example.COM');
    const token2 = generateUnsubscribeToken('test@example.com');
    expect(token1).toBe(token2);
  });
});

describe('generateUnsubscribeUrl', () => {
  let generateUnsubscribeUrl: (email: string, baseUrl?: string) => string;

  beforeEach(async () => {
    const mod = await import('../../newsletter/unsubscribe/route');
    generateUnsubscribeUrl = mod.generateUnsubscribeUrl;
  });

  it('returns a correctly formatted URL with default base', () => {
    const url = generateUnsubscribeUrl('test@test.com');
    expect(url).toContain('https://www.jobelix.fr/api/newsletter/unsubscribe');
    expect(url).toContain('email=test%40test.com');
    expect(url).toContain('token=');
  });

  it('uses custom base URL when provided', () => {
    const url = generateUnsubscribeUrl('test@test.com', 'http://localhost:3000');
    expect(url).toContain('http://localhost:3000/api/newsletter/unsubscribe');
  });

  it('includes a valid token in the URL', () => {
    const url = generateUnsubscribeUrl('test@test.com');
    const parsedUrl = new URL(url);
    const token = parsedUrl.searchParams.get('token');
    expect(token).toBe(makeValidToken('test@test.com'));
  });

  it('encodes email in the URL', () => {
    const url = generateUnsubscribeUrl('user+tag@example.com');
    expect(url).toContain('email=user%2Btag%40example.com');
  });
});
