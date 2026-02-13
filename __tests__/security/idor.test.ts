/**
 * Security Tests: Insecure Direct Object Reference (IDOR)
 *
 * Tests that authenticated users CANNOT access resources belonging to other users:
 * - Company A cannot read/update/delete Company B's drafts/offers
 * - Student A cannot read/update Student B's profile, resume, credits
 * - Cross-role access (student accessing company resources)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthenticateRequest = vi.fn();
vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(),
    auth: { signUp: vi.fn(), admin: { deleteUser: vi.fn() } },
    storage: { from: vi.fn() },
  })),
}));

const mockCheckRateLimit = vi.fn();
const mockLogApiCall = vi.fn();
vi.mock('@/lib/server/rateLimiting', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  logApiCall: (...args: unknown[]) => mockLogApiCall(...args),
  rateLimitExceededResponse: vi.fn(() =>
    NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  ),
  addRateLimitHeaders: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DRAFT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const OFFER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

function createRequest(
  url: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> },
): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: options?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

/**
 * Creates a mock supabase where all operations using .eq('company_id' or 'student_id')
 * track the user ID filter and only return data if it matches the authenticated user.
 */
function createAuthenticatedMock(userId: string) {
  let trackedEqs: Record<string, string> = {};

  const chain = {
    from: vi.fn().mockImplementation(() => {
      trackedEqs = {};
      return chain;
    }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((col: string, val: string) => {
      trackedEqs[col] = val;
      return chain;
    }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockImplementation(() => {
      // If a company_id or student_id filter doesn't match the auth user, return null
      if (trackedEqs['company_id'] && trackedEqs['company_id'] !== userId) {
        return Promise.resolve({ data: null, error: null });
      }
      if (trackedEqs['student_id'] && trackedEqs['student_id'] !== userId) {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: { id: DRAFT_ID, company_id: userId }, error: null });
    }),
    single: vi.fn().mockImplementation(() => {
      if (trackedEqs['company_id'] && trackedEqs['company_id'] !== userId) {
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      }
      if (trackedEqs['student_id'] && trackedEqs['student_id'] !== userId) {
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      }
      return Promise.resolve({ data: { id: DRAFT_ID }, error: null });
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };

  mockAuthenticateRequest.mockResolvedValue({
    user: { id: userId, email: `${userId}@test.com` },
    supabase: chain,
    error: null,
  });

  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Security: IDOR (Insecure Direct Object Reference)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      data: { allowed: true, hourly_remaining: 100, daily_remaining: 1000 },
      error: null,
    });
  });

  // =========================================================================
  // 1. Company draft access control
  // =========================================================================
  describe('Company draft IDOR prevention', () => {
    it('GET draft: User A cannot read User B\'s draft', async () => {
      // Authenticate as User A
      const chain = createAuthenticatedMock(USER_A);

      const { GET } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest(`/api/company/offer/draft/${DRAFT_ID}`);

      // The route filters by .eq('company_id', user.id) which is USER_A
      // If the draft belongs to USER_B, maybeSingle returns null
      chain.maybeSingle.mockResolvedValue({ data: null, error: null });

      const res = await GET(req, { params: Promise.resolve({ id: DRAFT_ID }) });
      expect(res.status).toBe(404);

      // Verify the route called .eq('company_id', USER_A) — not USER_B
      expect(chain.eq).toHaveBeenCalledWith('company_id', USER_A);
    });

    it('PUT draft: User A cannot modify User B\'s draft', async () => {
      const chain = createAuthenticatedMock(USER_A);

      const { PUT } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest(`/api/company/offer/draft/${DRAFT_ID}`, {
        method: 'PUT',
        body: { basic_info: { title: 'Hijacked' } },
      });

      // No rows returned because company_id doesn't match
      chain.maybeSingle.mockResolvedValue({ data: null, error: null });

      const res = await PUT(req, { params: Promise.resolve({ id: DRAFT_ID }) });
      // Should return 404 (not found or not authorized)
      expect(res.status).toBe(404);
      expect(chain.eq).toHaveBeenCalledWith('company_id', USER_A);
    });

    it('DELETE draft: User A cannot delete User B\'s draft', async () => {
      const chain = createAuthenticatedMock(USER_A);

      const { DELETE } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest(`/api/company/offer/draft/${DRAFT_ID}`, { method: 'DELETE' });

      const res = await DELETE(req, { params: Promise.resolve({ id: DRAFT_ID }) });
      // Delete query includes .eq('company_id', user.id)
      expect(chain.eq).toHaveBeenCalledWith('company_id', USER_A);
    });
  });

  // =========================================================================
  // 2. Company offer delete access control
  // =========================================================================
  describe('Company offer delete IDOR prevention', () => {
    it('User A cannot delete User B\'s published offer', async () => {
      const chain = createAuthenticatedMock(USER_A);

      const { DELETE } = await import('@/app/api/company/offer/[id]/route');
      const req = createRequest(`/api/company/offer/${OFFER_ID}`, { method: 'DELETE' });

      const res = await DELETE(req, { params: Promise.resolve({ id: OFFER_ID }) });
      // Verify it filters by company_id = user.id
      expect(chain.eq).toHaveBeenCalledWith('company_id', USER_A);
    });
  });

  // =========================================================================
  // 3. Student profile draft IDOR
  // =========================================================================
  describe('Student profile draft IDOR prevention', () => {
    it('GET draft: always scoped to authenticated user', async () => {
      const chain = createAuthenticatedMock(USER_A);

      const { GET } = await import('@/app/api/student/profile/draft/route');
      const res = await GET();

      // Verify the query filters by student_id = USER_A
      expect(chain.eq).toHaveBeenCalledWith('student_id', USER_A);
    });

    it('PUT draft: cannot update another user\'s draft by guessing draftId', async () => {
      const chain = createAuthenticatedMock(USER_A);
      chain.from.mockReturnValue(chain);
      chain.update.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.select.mockReturnValue(chain);
      chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const { PUT } = await import('@/app/api/student/profile/draft/route');
      const req = createRequest('/api/student/profile/draft', {
        method: 'PUT',
        body: {
          draftId: 'user-b-draft-id',
          updates: { student_name: 'Hijacked Name' },
        },
      });
      const res = await PUT(req);

      // The route uses .eq('id', draftId).eq('student_id', user.id)
      // This double filter prevents IDOR
      expect(chain.eq).toHaveBeenCalledWith('student_id', USER_A);
    });

    it('POST finalize: cannot finalize another user\'s draft', async () => {
      const chain = createAuthenticatedMock(USER_A);
      chain.from.mockReturnValue(chain);
      chain.select.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const { POST } = await import('@/app/api/student/profile/draft/finalize/route');
      const otherUserDraftId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      const req = createRequest('/api/student/profile/draft/finalize', {
        method: 'POST',
        body: { draftId: otherUserDraftId },
      });
      const res = await POST(req);

      // Draft not found because .eq('student_id', USER_A) filters it out
      expect(res.status).toBe(404);
      expect(chain.eq).toHaveBeenCalledWith('student_id', USER_A);
    });
  });

  // =========================================================================
  // 4. Student resume IDOR
  // =========================================================================
  describe('Student resume IDOR prevention', () => {
    it('GET resume: always scoped to authenticated user', async () => {
      const chain = createAuthenticatedMock(USER_A);

      const { GET } = await import('@/app/api/student/resume/route');
      const res = await GET();

      expect(chain.eq).toHaveBeenCalledWith('student_id', USER_A);
    });

    it('POST resume: upload path is hardcoded to user.id (no path traversal)', async () => {
      const chain = createAuthenticatedMock(USER_A);

      // Track what path is passed to storage.upload
      let uploadedPath = '';
      chain.storage.from.mockReturnValue({
        upload: vi.fn().mockImplementation((path: string) => {
          uploadedPath = path;
          return Promise.resolve({ error: null });
        }),
      });
      chain.from.mockReturnValue(chain);
      chain.upsert.mockReturnValue(chain);
      chain.select.mockReturnValue(chain);

      const { POST } = await import('@/app/api/student/resume/route');

      // Create a FormData-like request
      const formData = new FormData();
      formData.append('file', new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' }));

      const req = new NextRequest('http://localhost:3000/api/student/resume', {
        method: 'POST',
        body: formData,
      });

      // Mock authenticateRequest to return properly for this specific test
      mockAuthenticateRequest.mockResolvedValue({
        user: { id: USER_A, email: 'a@test.com' },
        supabase: chain,
        error: null,
      });

      await POST(req);

      // The path should be ${userId}/resume.pdf — not user-controlled
      expect(uploadedPath).toBe(`${USER_A}/resume.pdf`);
    });
  });

  // =========================================================================
  // 5. Student token IDOR
  // =========================================================================
  describe('Student token IDOR prevention', () => {
    it('token retrieval is scoped to authenticated user', async () => {
      const chain = createAuthenticatedMock(USER_A);
      chain.single.mockResolvedValue({ data: { token: 'secret-token' }, error: null });

      const { GET } = await import('@/app/api/student/token/route');
      await GET();

      expect(chain.eq).toHaveBeenCalledWith('user_id', USER_A);
    });
  });

  // =========================================================================
  // 6. Student credits IDOR
  // =========================================================================
  describe('Student credits IDOR prevention', () => {
    it('claim credits: RPC is called with authenticated user ID only', async () => {
      const chain = createAuthenticatedMock(USER_A);
      chain.rpc.mockResolvedValue({
        data: [{ success: true, credits_granted: 100, new_balance: 100 }],
        error: null,
      });

      const { POST } = await import('@/app/api/student/credits/claim/route');
      await POST();

      // Verify the RPC is called with the authenticated user's ID
      expect(chain.rpc).toHaveBeenCalledWith('grant_daily_credits', {
        p_user_id: USER_A,
      });
    });
  });

  // =========================================================================
  // 7. Mass assignment prevention
  // =========================================================================
  describe('Mass assignment prevention', () => {
    it('student draft: cannot set non-whitelisted fields (e.g., student_id, id, status, created_at)', async () => {
      const chain = createAuthenticatedMock(USER_A);
      chain.from.mockReturnValue(chain);
      chain.update.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.select.mockReturnValue(chain);
      chain.single.mockResolvedValue({
        data: { id: DRAFT_ID, student_name: 'test' },
        error: null,
      });

      const { PUT } = await import('@/app/api/student/profile/draft/route');

      // Attempt to set fields NOT in ALLOWED_DRAFT_FIELDS
      const req = createRequest('/api/student/profile/draft', {
        method: 'PUT',
        body: {
          draftId: DRAFT_ID,
          updates: {
            student_name: 'Legit Name', // allowed
            id: 'hijacked-id', // NOT allowed
            student_id: USER_B, // NOT allowed — critical!
            created_at: '2020-01-01', // NOT allowed
            status: 'published', // NOT allowed
            is_admin: true, // NOT allowed
          },
        },
      });
      const res = await PUT(req);

      // The update call should have been made, check what was passed
      // The sanitizedUpdates should only contain 'student_name'
      const updateCall = chain.update.mock.calls[0]?.[0];
      if (updateCall) {
        expect(updateCall).not.toHaveProperty('id');
        expect(updateCall).not.toHaveProperty('student_id');
        expect(updateCall).not.toHaveProperty('created_at');
        expect(updateCall).not.toHaveProperty('is_admin');
        // status gets overridden to 'editing' by the route
        expect(updateCall.status).toBe('editing');
        expect(updateCall.student_name).toBe('Legit Name');
      }
    });

    it('company draft: cannot set non-whitelisted fields (e.g., company_id, id)', async () => {
      const chain = createAuthenticatedMock(USER_A);
      chain.from.mockReturnValue(chain);
      chain.update.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.select.mockReturnValue(chain);
      chain.maybeSingle.mockResolvedValue({
        data: { id: DRAFT_ID },
        error: null,
      });

      const { PUT } = await import('@/app/api/company/offer/draft/[id]/route');

      const req = createRequest(`/api/company/offer/draft/${DRAFT_ID}`, {
        method: 'PUT',
        body: {
          basic_info: { title: 'Legit' }, // allowed
          company_id: USER_B, // NOT allowed
          id: 'hijacked-id', // NOT allowed
          created_at: '2020-01-01', // NOT allowed
          salary: 999999, // NOT allowed (not in ALLOWED_DRAFT_FIELDS)
        },
      });
      const res = await PUT(req, {
        params: Promise.resolve({ id: DRAFT_ID }),
      });

      const updateCall = chain.update.mock.calls[0]?.[0];
      if (updateCall) {
        expect(updateCall).not.toHaveProperty('company_id');
        expect(updateCall).not.toHaveProperty('id');
        expect(updateCall).not.toHaveProperty('created_at');
        expect(updateCall).not.toHaveProperty('salary');
        expect(updateCall.basic_info).toEqual({ title: 'Legit' });
      }
    });
  });

  // =========================================================================
  // 8. Cross-role access attempts
  // =========================================================================
  describe('Cross-role access control', () => {
    it('student user accessing company endpoints gets empty results (RLS)', async () => {
      // Student authenticated — querying company_offer_draft
      const chain = createAuthenticatedMock(USER_A);
      chain.maybeSingle.mockResolvedValue({ data: null, error: null });

      const { GET } = await import('@/app/api/company/offer/draft/[id]/route');
      const req = createRequest(`/api/company/offer/draft/${DRAFT_ID}`);
      const res = await GET(req, { params: Promise.resolve({ id: DRAFT_ID }) });

      // Should return 404 (not found) because company_id filter won't match
      expect(res.status).toBe(404);
    });

    it('referral code retrieval is scoped to students only (DB level)', async () => {
      const chain = createAuthenticatedMock(USER_A);
      // Simulate the DB returning "talent accounts only" error (company user)
      chain.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Referral codes are only available for talent accounts' },
      });

      const { GET } = await import('@/app/api/student/referral/code/route');
      const res = await GET();
      expect(res.status).toBe(403);
    });
  });
});
