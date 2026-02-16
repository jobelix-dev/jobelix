/**
 * Comprehensive tests for company API routes
 *
 * Tests cover:
 * - GET  /api/company/offer          (list published offers + unpublished drafts)
 * - POST /api/company/offer/publish  (publish a draft offer)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock modules — declared before any import that triggers them
// ---------------------------------------------------------------------------

const mockAuthenticateRequest = vi.fn();

vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER_ID = '00000000-1111-2222-3333-444444444444';
const VALID_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/** Create a chainable Supabase query builder mock */
function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn(),
    _chain: chain,
  };
}

/** Mock request with JSON body */
function createMockRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/company/offer/publish', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. GET /api/company/offer
// ===========================================================================
describe('GET /api/company/offer', () => {
  let GET: () => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../offer/route');
    GET = mod.GET;
  });

  // ---- Auth failure ----
  it('returns 401 when user is not authenticated', async () => {
    const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: null,
      supabase: null,
      error: errorResponse,
    });

    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  // ---- Happy path: both lists populated ----
  it('returns published offers and unpublished drafts', async () => {
    const publishedOffers = [
      { id: '1', company_id: MOCK_USER_ID, position_name: 'Engineer' },
    ];
    const unpublishedDrafts = [
      { id: '2', company_id: MOCK_USER_ID, basic_info: {} },
    ];

    // First .from() call → company_offer (published)
    // Second .from() call → company_offer_draft (drafts)
    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn(),
        };
        if (callCount === 1) {
          chain.order = vi.fn().mockResolvedValue({ data: publishedOffers, error: null });
        } else {
          chain.order = vi.fn().mockResolvedValue({ data: unpublishedDrafts, error: null });
        }
        return chain;
      }),
    };

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.publishedOffers).toEqual(publishedOffers);
    expect(json.unpublishedDrafts).toEqual(unpublishedDrafts);

    // Verify correct tables were queried
    expect(mockSb.from).toHaveBeenCalledTimes(2);
    expect(mockSb.from).toHaveBeenNthCalledWith(1, 'company_offer');
    expect(mockSb.from).toHaveBeenNthCalledWith(2, 'company_offer_draft');
  });

  // ---- Happy path: empty lists ----
  it('returns empty arrays when no offers exist', async () => {
    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn(),
        };
        // Return null data (route defaults to [])
        chain.order = vi.fn().mockResolvedValue({ data: null, error: null });
        return chain;
      }),
    };

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.publishedOffers).toEqual([]);
    expect(json.unpublishedDrafts).toEqual([]);
  });

  // ---- DB error on published offers ----
  it('returns 500 when fetching published offers fails', async () => {
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'DB error', code: '42P01' },
          }),
        };
        return chain;
      }),
    };

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to fetch offers' });
  });

  // ---- DB error on drafts ----
  it('returns 500 when fetching drafts fails', async () => {
    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn(),
        };
        if (callCount === 1) {
          // published offers succeed
          chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
        } else {
          // drafts fail
          chain.order = vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'DB error' },
          });
        }
        return chain;
      }),
    };

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to fetch drafts' });
  });

  // ---- Unexpected exception ----
  it('returns 500 on unexpected exception', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('unexpected'));

    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to fetch offers' });
  });

  // ---- Filters by company_id ----
  it('filters offers by the authenticated user id', async () => {
    const eqMock = vi.fn().mockReturnThis();
    const isMock = vi.fn().mockReturnThis();
    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: eqMock,
          is: isMock,
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        return chain;
      }),
    };

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    await GET();

    // Both queries should filter by company_id = user.id
    expect(eqMock).toHaveBeenCalledWith('company_id', MOCK_USER_ID);
  });

  // ---- Drafts filtered by offer_id IS NULL ----
  it('filters drafts where offer_id is null', async () => {
    const isMock = vi.fn().mockReturnThis();
    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: isMock,
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        return chain;
      }),
    };

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    await GET();

    // Second .from() call is for drafts; .is('offer_id', null) should be called
    expect(isMock).toHaveBeenCalledWith('offer_id', null);
  });
});

// ===========================================================================
// 2. POST /api/company/offer/publish
// ===========================================================================
describe('POST /api/company/offer/publish', () => {
  let POST: (req: Request) => Promise<NextResponse>;

  beforeEach(async () => {
    const mod = await import('../offer/publish/route');
    POST = mod.POST;
  });

  // ---- Auth failure ----
  it('returns 401 when user is not authenticated', async () => {
    const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: null,
      supabase: null,
      error: errorResponse,
    });

    const res = await POST(createMockRequest({ draft_id: VALID_UUID }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  // ---- Happy path ----
  it('publishes a draft and returns success with offer_id', async () => {
    const returnedOfferId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const mockSb = createMockSupabase();
    mockSb.rpc.mockResolvedValueOnce({ data: returnedOfferId, error: null });

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await POST(createMockRequest({ draft_id: VALID_UUID }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.offer_id).toBe(returnedOfferId);
    expect(json.message).toBe('Offer published successfully');

    // Verify RPC was called with correct params
    expect(mockSb.rpc).toHaveBeenCalledWith('publish_offer_draft', { p_draft_id: VALID_UUID });
  });

  // ---- Invalid UUID: missing ----
  it('returns 400 when draft_id is missing', async () => {
    const mockSb = createMockSupabase();
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await POST(createMockRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid ID format' });
  });

  // ---- Invalid UUID: not a UUID ----
  it('returns 400 when draft_id is not a valid UUID', async () => {
    const mockSb = createMockSupabase();
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await POST(createMockRequest({ draft_id: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid ID format' });
  });

  // ---- Invalid UUID: partial match ----
  it('returns 400 for partial UUID format', async () => {
    const mockSb = createMockSupabase();
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await POST(createMockRequest({ draft_id: 'aaaaaaaa-bbbb-cccc-dddd' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid ID format' });
  });

  // ---- UUID with uppercase is accepted ----
  it('accepts uppercase UUID format', async () => {
    const mockSb = createMockSupabase();
    mockSb.rpc.mockResolvedValueOnce({ data: 'some-offer-id', error: null });

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const uppercaseUuid = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';
    const res = await POST(createMockRequest({ draft_id: uppercaseUuid }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  // ---- RPC error ----
  it('returns 500 when RPC publish_offer_draft fails', async () => {
    const mockSb = createMockSupabase();
    mockSb.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Permission denied', code: '42501' },
    });

    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await POST(createMockRequest({ draft_id: VALID_UUID }));
    expect(res.status).toBe(500);
    // Security: does NOT leak DB error message
    expect(await res.json()).toEqual({ error: 'Failed to publish offer' });
  });

  // ---- Invalid JSON body ----
  it('returns 500 when request body is not valid JSON', async () => {
    const mockSb = createMockSupabase();
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const badReq = new Request('http://localhost:3000/api/company/offer/publish', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(badReq);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });

  // ---- Unexpected exception ----
  it('returns 500 on unexpected exception', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('boom'));

    const res = await POST(createMockRequest({ draft_id: VALID_UUID }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });

  // ---- draft_id as null ----
  it('returns 400 when draft_id is null', async () => {
    const mockSb = createMockSupabase();
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await POST(createMockRequest({ draft_id: null }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid ID format' });
  });

  // ---- draft_id as empty string ----
  it('returns 400 when draft_id is empty string', async () => {
    const mockSb = createMockSupabase();
    mockAuthenticateRequest.mockResolvedValueOnce({
      user: { id: MOCK_USER_ID },
      supabase: mockSb,
      error: null,
    });

    const res = await POST(createMockRequest({ draft_id: '' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid ID format' });
  });
});
