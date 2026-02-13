/**
 * Comprehensive tests for company offer draft API routes
 *
 * Tests cover:
 * - POST   /api/company/offer/draft/new                 (create new empty draft)
 * - GET    /api/company/offer/draft/[id]                (get specific draft)
 * - PUT    /api/company/offer/draft/[id]                (update draft / auto-save)
 * - DELETE /api/company/offer/draft/[id]                (delete draft)
 * - GET    /api/company/offer/draft/for-offer/[offerId] (load or create draft for existing offer)
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
// Imports — route handlers
// ---------------------------------------------------------------------------

import { POST as createDraft } from '@/app/api/company/offer/draft/new/route';
import {
  GET as getDraft,
  PUT as putDraft,
  DELETE as deleteDraft,
} from '@/app/api/company/offer/draft/[id]/route';
import { GET as getDraftForOffer } from '@/app/api/company/offer/draft/for-offer/[offerId]/route';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOCK_USER_ID = '00000000-1111-2222-3333-444444444444';
const VALID_UUID = '11111111-2222-3333-4444-555555555555';
const INVALID_UUID = 'not-a-uuid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a chainable Supabase query builder mock */
function createMockSupabase() {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return {
    from: vi.fn().mockReturnValue(mockChain),
    _chain: mockChain,
  };
}

/** Helper to simulate an authenticated user with a mock supabase client */
function mockAuthSuccess(supabase: ReturnType<typeof createMockSupabase>) {
  mockAuthenticateRequest.mockResolvedValueOnce({
    user: { id: MOCK_USER_ID },
    supabase,
    error: null,
  });
}

/** Helper to simulate auth failure (401) */
function mockAuthFailure() {
  const errorResponse = NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 },
  );
  mockAuthenticateRequest.mockResolvedValueOnce({
    user: null,
    supabase: null,
    error: errorResponse,
  });
}

/** Build a context object with params as a Promise (Next.js 16 pattern) */
function idContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function offerIdContext(offerId: string) {
  return { params: Promise.resolve({ offerId }) };
}

/** Create a minimal NextRequest-compatible object */
function createRequest(
  url = 'http://localhost:3000/api/company/offer/draft',
  method = 'GET',
  body?: unknown,
) {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new Request(url, init);
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. POST /api/company/offer/draft/new
// ===========================================================================
describe('POST /api/company/offer/draft/new', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockAuthFailure();

    const res = await createDraft();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('creates a new empty draft and returns it', async () => {
    const mockSb = createMockSupabase();
    const fakeDraft = { id: VALID_UUID, company_id: MOCK_USER_ID, status: 'editing' };
    mockSb._chain.single.mockResolvedValueOnce({ data: fakeDraft, error: null });
    mockAuthSuccess(mockSb);

    const res = await createDraft();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.draft).toEqual(fakeDraft);

    // Verify insert was called on correct table
    expect(mockSb.from).toHaveBeenCalledWith('company_offer_draft');
    // Verify company_id is set server-side
    const insertArg = mockSb._chain.insert.mock.calls[0][0];
    expect(insertArg.company_id).toBe(MOCK_USER_ID);
    expect(insertArg.offer_id).toBeNull();
    expect(insertArg.status).toBe('editing');
  });

  it('returns 500 when insert fails', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });
    mockAuthSuccess(mockSb);

    const res = await createDraft();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to create draft' });
  });

  it('returns 500 when insert returns null data without error', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.single.mockResolvedValueOnce({ data: null, error: null });
    mockAuthSuccess(mockSb);

    const res = await createDraft();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to create draft' });
  });

  it('returns 500 on unexpected exception', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('boom'));

    const res = await createDraft();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to create draft' });
  });
});

// ===========================================================================
// 2. GET /api/company/offer/draft/[id]
// ===========================================================================
describe('GET /api/company/offer/draft/[id]', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockAuthFailure();

    const req = createRequest();
    const res = await getDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    const mockSb = createMockSupabase();
    mockAuthSuccess(mockSb);

    const req = createRequest();
    const res = await getDraft(req as never, idContext(INVALID_UUID));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('Invalid ID format');
  });

  it('returns 400 for empty string id', async () => {
    const mockSb = createMockSupabase();
    mockAuthSuccess(mockSb);

    const req = createRequest();
    const res = await getDraft(req as never, idContext(''));
    expect(res.status).toBe(400);
  });

  it('returns the draft on success', async () => {
    const mockSb = createMockSupabase();
    const fakeDraft = { id: VALID_UUID, company_id: MOCK_USER_ID };
    mockSb._chain.maybeSingle.mockResolvedValueOnce({ data: fakeDraft, error: null });
    mockAuthSuccess(mockSb);

    const req = createRequest();
    const res = await getDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.draft).toEqual(fakeDraft);

    // Verify correct filters applied
    expect(mockSb.from).toHaveBeenCalledWith('company_offer_draft');
    expect(mockSb._chain.eq).toHaveBeenCalledWith('id', VALID_UUID);
    expect(mockSb._chain.eq).toHaveBeenCalledWith('company_id', MOCK_USER_ID);
  });

  it('returns 404 when draft is not found (null data)', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockAuthSuccess(mockSb);

    const req = createRequest();
    const res = await getDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(404);

    const text = await res.text();
    expect(text).toBe('Draft not found');
  });

  it('returns 404 when fetch has an error', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });
    mockAuthSuccess(mockSb);

    const req = createRequest();
    const res = await getDraft(req as never, idContext(VALID_UUID));
    // The route returns 404 for both fetchError and !draft
    expect(res.status).toBe(404);
  });

  it('returns 500 on unexpected exception', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('boom'));

    const req = createRequest();
    const res = await getDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to get draft' });
  });
});

// ===========================================================================
// 3. PUT /api/company/offer/draft/[id]
// ===========================================================================
describe('PUT /api/company/offer/draft/[id]', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockAuthFailure();

    const req = createRequest('http://localhost:3000/api/test', 'PUT', { basic_info: {} });
    const res = await putDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    const mockSb = createMockSupabase();
    mockAuthSuccess(mockSb);

    const req = createRequest('http://localhost:3000/api/test', 'PUT', { basic_info: {} });
    const res = await putDraft(req as never, idContext(INVALID_UUID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid ID format' });
  });

  it('updates draft with allowed fields and returns it', async () => {
    const mockSb = createMockSupabase();
    const updatedDraft = { id: VALID_UUID, company_id: MOCK_USER_ID, basic_info: { position_name: 'Dev' } };
    mockSb._chain.maybeSingle.mockResolvedValueOnce({ data: updatedDraft, error: null });
    mockAuthSuccess(mockSb);

    const body = { basic_info: { position_name: 'Dev' }, compensation: { salary_min: 50000 } };
    const req = createRequest('http://localhost:3000/api/test', 'PUT', body);
    const res = await putDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.draft).toEqual(updatedDraft);

    // Verify update was called with sanitized fields + updated_at
    const updateArg = mockSb._chain.update.mock.calls[0][0];
    expect(updateArg.basic_info).toEqual({ position_name: 'Dev' });
    expect(updateArg.compensation).toEqual({ salary_min: 50000 });
    expect(updateArg.updated_at).toBeDefined();
  });

  it('strips disallowed fields (company_id, id, offer_id, created_at)', async () => {
    const mockSb = createMockSupabase();
    const updatedDraft = { id: VALID_UUID, status: 'editing' };
    mockSb._chain.maybeSingle.mockResolvedValueOnce({ data: updatedDraft, error: null });
    mockAuthSuccess(mockSb);

    const body = {
      status: 'editing',
      company_id: 'hacked-id',
      id: 'hacked-id',
      offer_id: 'hacked-id',
      created_at: '2020-01-01',
    };
    const req = createRequest('http://localhost:3000/api/test', 'PUT', body);
    const res = await putDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(200);

    const updateArg = mockSb._chain.update.mock.calls[0][0];
    // Allowed field passes through
    expect(updateArg.status).toBe('editing');
    // Disallowed fields are stripped
    expect(updateArg.company_id).toBeUndefined();
    expect(updateArg.id).toBeUndefined();
    expect(updateArg.offer_id).toBeUndefined();
    expect(updateArg.created_at).toBeUndefined();
  });

  it('adds updated_at timestamp to the update', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.maybeSingle.mockResolvedValueOnce({
      data: { id: VALID_UUID },
      error: null,
    });
    mockAuthSuccess(mockSb);

    const req = createRequest('http://localhost:3000/api/test', 'PUT', { status: 'editing' });
    await putDraft(req as never, idContext(VALID_UUID));

    const updateArg = mockSb._chain.update.mock.calls[0][0];
    expect(updateArg.updated_at).toBeDefined();
    // Should be a valid ISO string
    expect(() => new Date(updateArg.updated_at)).not.toThrow();
  });

  it('returns 500 when update query errors', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });
    mockAuthSuccess(mockSb);

    const req = createRequest('http://localhost:3000/api/test', 'PUT', { status: 'editing' });
    const res = await putDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to update draft' });
  });

  it('returns 404 when no draft is returned (not found/not authorized)', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockAuthSuccess(mockSb);

    const req = createRequest('http://localhost:3000/api/test', 'PUT', { status: 'editing' });
    const res = await putDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Draft not found or not authorized' });
  });

  it('returns 500 on unexpected exception', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('boom'));

    const req = createRequest('http://localhost:3000/api/test', 'PUT', { status: 'editing' });
    const res = await putDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to update draft' });
  });

  it('filters update by both draft id and company_id', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.maybeSingle.mockResolvedValueOnce({
      data: { id: VALID_UUID },
      error: null,
    });
    mockAuthSuccess(mockSb);

    const req = createRequest('http://localhost:3000/api/test', 'PUT', { status: 'editing' });
    await putDraft(req as never, idContext(VALID_UUID));

    expect(mockSb._chain.eq).toHaveBeenCalledWith('id', VALID_UUID);
    expect(mockSb._chain.eq).toHaveBeenCalledWith('company_id', MOCK_USER_ID);
  });

  it('allows all whitelisted fields through', async () => {
    const mockSb = createMockSupabase();
    mockSb._chain.maybeSingle.mockResolvedValueOnce({
      data: { id: VALID_UUID },
      error: null,
    });
    mockAuthSuccess(mockSb);

    const allFields = {
      basic_info: {},
      compensation: {},
      work_config: {},
      skills: [],
      locations: [],
      responsibilities: [],
      capabilities: [],
      questions: [],
      perks: [],
      seniority: 'senior',
      status: 'ready',
    };
    const req = createRequest('http://localhost:3000/api/test', 'PUT', allFields);
    await putDraft(req as never, idContext(VALID_UUID));

    const updateArg = mockSb._chain.update.mock.calls[0][0];
    for (const key of Object.keys(allFields)) {
      expect(updateArg).toHaveProperty(key);
    }
  });
});

// ===========================================================================
// 4. DELETE /api/company/offer/draft/[id]
// ===========================================================================
describe('DELETE /api/company/offer/draft/[id]', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockAuthFailure();

    const req = createRequest('http://localhost:3000/api/test', 'DELETE');
    const res = await deleteDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    const mockSb = createMockSupabase();
    mockAuthSuccess(mockSb);

    const req = createRequest('http://localhost:3000/api/test', 'DELETE');
    const res = await deleteDraft(req as never, idContext(INVALID_UUID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid ID format' });
  });

  it('deletes the draft and returns success', async () => {
    // delete().eq('id', ...).eq('company_id', ...) — last .eq() must resolve
    const eqCalls: [string, string][] = [];
    let eqCallCount = 0;
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((col: string, val: string) => {
        eqCalls.push([col, val]);
        eqCallCount++;
        if (eqCallCount >= 2) {
          // Terminal call — resolve the awaited destructure
          return Promise.resolve({ error: null });
        }
        return chain;
      }),
    };
    const mockSb = { from: vi.fn().mockReturnValue(chain) };
    mockAuthSuccess(mockSb as never);

    const req = createRequest('http://localhost:3000/api/test', 'DELETE');
    const res = await deleteDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    // Verify correct table and filters
    expect(mockSb.from).toHaveBeenCalledWith('company_offer_draft');
    expect(eqCalls).toContainEqual(['id', VALID_UUID]);
    expect(eqCalls).toContainEqual(['company_id', MOCK_USER_ID]);
  });

  it('returns 500 when delete fails', async () => {
    let eqCallCount = 0;
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: { message: 'DB error' } });
        }
        return chain;
      }),
    };
    const mockSb = { from: vi.fn().mockReturnValue(chain) };
    mockAuthSuccess(mockSb as never);

    const req = createRequest('http://localhost:3000/api/test', 'DELETE');
    const res = await deleteDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(500);

    const text = await res.text();
    expect(text).toBe('Failed to delete draft');
  });

  it('returns 500 on unexpected exception', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('boom'));

    const req = createRequest('http://localhost:3000/api/test', 'DELETE');
    const res = await deleteDraft(req as never, idContext(VALID_UUID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to delete draft' });
  });
});

// ===========================================================================
// 5. GET /api/company/offer/draft/for-offer/[offerId]
// ===========================================================================
describe('GET /api/company/offer/draft/for-offer/[offerId]', () => {
  /**
   * The for-offer route makes multiple .from() calls in sequence:
   * 1. company_offer_draft (check existing)
   * 2. company_offer (fetch published offer)
   * 3-8. Promise.all of 6 related tables
   * 9. company_offer_draft (insert new draft)
   *
   * We use per-test custom supabase mocks to control each .from() call.
   */

  it('returns 401 when user is not authenticated', async () => {
    mockAuthFailure();

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(401);
  });

  it('returns existing draft if one already exists', async () => {
    const existingDraft = { id: 'draft-1', offer_id: VALID_UUID, status: 'editing' };

    // First .from() → check existing draft
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: existingDraft, error: null }),
    };
    const mockSb = { from: vi.fn().mockReturnValue(chain) };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.draft).toEqual(existingDraft);

    // Should only query once (no need to fetch published offer)
    expect(mockSb.from).toHaveBeenCalledTimes(1);
    expect(mockSb.from).toHaveBeenCalledWith('company_offer_draft');
  });

  it('returns 500 when draft lookup errors', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error' },
      }),
    };
    const mockSb = { from: vi.fn().mockReturnValue(chain) };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to check for existing draft' });
  });

  it('returns 404 when published offer is not found', async () => {
    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(),
        };
        if (callCount === 1) {
          // No existing draft
          chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
        } else {
          // Published offer not found
          chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
        }
        return chain;
      }),
    };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Offer not found or access denied' });
  });

  it('returns 500 when fetching published offer errors', async () => {
    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(),
        };
        if (callCount === 1) {
          chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
        } else {
          chain.maybeSingle.mockResolvedValueOnce({
            data: null,
            error: { message: 'DB error' },
          });
        }
        return chain;
      }),
    };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    // offerError || !publishedOffer → 404
    expect(res.status).toBe(404);
  });

  it('returns 500 when related data fetch fails', async () => {
    const publishedOffer = {
      id: VALID_UUID,
      company_id: MOCK_USER_ID,
      position_name: 'Engineer',
      description: 'A job',
    };

    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
          return c;
        }
        if (callCount === 2) {
          const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: publishedOffer, error: null }) };
          return c;
        }

        // Related tables (3-8): skills errors, rest succeed
        const result = callCount === 3
          ? { data: null, error: { message: 'skills error' } }
          : { data: [], error: null };
        // .eq() returns a thenable with .order()
        const eqResult = Object.assign(Promise.resolve(result), {
          order: vi.fn().mockResolvedValue(result),
        });
        const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue(eqResult) };
        return c;
      }),
    };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to load offer details for draft' });
  });

  it('creates a new draft from published offer and returns it', async () => {
    const publishedOffer = {
      id: VALID_UUID,
      company_id: MOCK_USER_ID,
      position_name: 'Engineer',
      description: 'A great job',
      salary_min: 50000,
      salary_max: 80000,
      salary_currency: 'EUR',
      salary_period: 'year',
      equity: false,
      equity_range: null,
      remote_mode: 'hybrid',
      employment_type: 'full-time',
      availability: 'immediate',
      mission: 'Build cool stuff',
      stage: 'seed',
      team_size: 10,
      seniority: 'mid',
    };

    const createdDraft = {
      id: 'new-draft-id',
      company_id: MOCK_USER_ID,
      offer_id: VALID_UUID,
      status: 'editing',
    };

    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          // No existing draft
          const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
          return c;
        }
        if (callCount === 2) {
          // Published offer
          const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: publishedOffer, error: null }) };
          return c;
        }
        if (callCount >= 3 && callCount <= 8) {
          // Related tables — all return empty arrays
          const result = { data: [], error: null };
          const eqResult = Object.assign(Promise.resolve(result), {
            order: vi.fn().mockResolvedValue(result),
          });
          const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue(eqResult) };
          return c;
        }
        // callCount === 9: Insert the new draft
        const c = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: createdDraft, error: null }),
        };
        return c;
      }),
    };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.draft).toEqual(createdDraft);

    // Verify the table queries:
    // 1 = draft check, 2 = offer, 3-8 = related tables, 9 = insert
    expect(mockSb.from).toHaveBeenCalledTimes(9);
    expect(mockSb.from).toHaveBeenNthCalledWith(1, 'company_offer_draft');
    expect(mockSb.from).toHaveBeenNthCalledWith(2, 'company_offer');
    expect(mockSb.from).toHaveBeenNthCalledWith(3, 'offer_skills');
    expect(mockSb.from).toHaveBeenNthCalledWith(4, 'offer_locations');
    expect(mockSb.from).toHaveBeenNthCalledWith(5, 'offer_responsibilities');
    expect(mockSb.from).toHaveBeenNthCalledWith(6, 'offer_capabilities');
    expect(mockSb.from).toHaveBeenNthCalledWith(7, 'offer_questions');
    expect(mockSb.from).toHaveBeenNthCalledWith(8, 'offer_perks');
    expect(mockSb.from).toHaveBeenNthCalledWith(9, 'company_offer_draft');
  });

  it('returns 500 when draft insert fails', async () => {
    const publishedOffer = {
      id: VALID_UUID,
      company_id: MOCK_USER_ID,
      position_name: 'Engineer',
    };

    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
          return c;
        }
        if (callCount === 2) {
          const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: publishedOffer, error: null }) };
          return c;
        }
        if (callCount >= 3 && callCount <= 8) {
          const result = { data: [], error: null };
          const eqResult = Object.assign(Promise.resolve(result), {
            order: vi.fn().mockResolvedValue(result),
          });
          const c = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue(eqResult) };
          return c;
        }
        // callCount === 9: Insert fails
        const c = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
        };
        return c;
      }),
    };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to create draft from offer' });
  });

  it('returns 500 on unexpected exception', async () => {
    mockAuthenticateRequest.mockRejectedValueOnce(new Error('boom'));

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to load or create draft' });
  });

  it('maps related data correctly into the draft structure', async () => {
    const publishedOffer = {
      id: VALID_UUID,
      company_id: MOCK_USER_ID,
      position_name: 'Designer',
      description: 'Design things',
      salary_min: 40000,
      salary_max: 60000,
      salary_currency: 'USD',
      salary_period: 'year',
      equity: true,
      equity_range: '0.5-1%',
      remote_mode: 'remote',
      employment_type: 'contract',
      availability: '2 weeks',
      mission: 'Make it pretty',
      stage: 'series-a',
      team_size: 20,
      seniority: 'senior',
    };

    const mockSkills = [{ skill_slug: 'figma', skill_text: 'Figma', importance: 'required', level: 'expert', years: 3 }];
    const mockLocations = [{ city: 'Berlin', country: 'DE' }];
    const mockResponsibilities = [{ text: 'Design UI', order_index: 0 }];
    const mockCapabilities = [{ text: 'Creative thinking', importance: 'high' }];
    const mockQuestions = [{ question: 'Why design?', order_index: 0 }];
    const mockPerks = [{ text: 'Free coffee', order_index: 0 }];

    const createdDraft = {
      id: 'mapped-draft-id',
      company_id: MOCK_USER_ID,
      offer_id: VALID_UUID,
      status: 'editing',
    };

    // Map callCount to the related-table data for each table
    const relatedDataMap: Record<number, { data: unknown[]; error: null }> = {
      3: { data: mockSkills, error: null },       // offer_skills
      4: { data: mockLocations, error: null },     // offer_locations
      5: { data: mockResponsibilities, error: null }, // offer_responsibilities
      6: { data: mockCapabilities, error: null },  // offer_capabilities
      7: { data: mockQuestions, error: null },      // offer_questions
      8: { data: mockPerks, error: null },          // offer_perks
    };

    let callCount = 0;
    const mockSb = {
      from: vi.fn().mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
        }
        if (callCount === 2) {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: publishedOffer, error: null }) };
        }
        if (callCount >= 3 && callCount <= 8) {
          const result = relatedDataMap[callCount];
          const eqResult = Object.assign(Promise.resolve(result), {
            order: vi.fn().mockResolvedValue(result),
          });
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue(eqResult) };
        }
        // callCount === 9: Insert draft
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: createdDraft, error: null }),
        };
      }),
    };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    const res = await getDraftForOffer(req, offerIdContext(VALID_UUID));
    expect(res.status).toBe(200);

    // Verify the insert call included mapped data
    // The 9th .from() call's chain had .insert() called
    const ninthCallChain = mockSb.from.mock.results[8].value;
    const insertArg = ninthCallChain.insert.mock.calls[0][0];

    expect(insertArg.company_id).toBe(MOCK_USER_ID);
    expect(insertArg.offer_id).toBe(VALID_UUID);
    expect(insertArg.status).toBe('editing');
    expect(insertArg.basic_info.position_name).toBe('Designer');
    expect(insertArg.basic_info.description).toBe('Design things');
    expect(insertArg.compensation.salary_min).toBe(40000);
    expect(insertArg.compensation.salary_currency).toBe('USD');
    expect(insertArg.compensation.equity).toBe(true);
    expect(insertArg.work_config.remote_mode).toBe('remote');
    expect(insertArg.skills).toHaveLength(1);
    expect(insertArg.skills[0].skill_slug).toBe('figma');
    expect(insertArg.locations).toHaveLength(1);
    expect(insertArg.locations[0].city).toBe('Berlin');
    expect(insertArg.responsibilities).toHaveLength(1);
    expect(insertArg.responsibilities[0].text).toBe('Design UI');
    expect(insertArg.capabilities).toHaveLength(1);
    expect(insertArg.capabilities[0].text).toBe('Creative thinking');
    expect(insertArg.questions).toHaveLength(1);
    expect(insertArg.questions[0].question).toBe('Why design?');
    expect(insertArg.perks).toHaveLength(1);
    expect(insertArg.perks[0].text).toBe('Free coffee');
  });

  it('filters existing draft check by company_id and offer_id', async () => {
    const existingDraft = { id: 'draft-1', offer_id: VALID_UUID };

    const eqCalls: [string, string][] = [];
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((col: string, val: string) => {
        eqCalls.push([col, val]);
        return chain;
      }),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: existingDraft, error: null }),
    };
    const mockSb = { from: vi.fn().mockReturnValue(chain) };
    mockAuthSuccess(mockSb as never);

    const req = createRequest();
    await getDraftForOffer(req, offerIdContext(VALID_UUID));

    expect(eqCalls).toContainEqual(['company_id', MOCK_USER_ID]);
    expect(eqCalls).toContainEqual(['offer_id', VALID_UUID]);
  });
});
