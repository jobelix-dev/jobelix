/**
 * Comprehensive tests for all student API routes.
 *
 * Mocks: authenticateRequest, rateLimiting, validation, supabaseServer.
 * Each describe block covers one route handler.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/lib/server/rateLimiting', () => ({
  checkRateLimit: vi.fn(),
  logApiCall: vi.fn(),
  rateLimitExceededResponse: vi.fn(() =>
    NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
  ),
}));

vi.mock('@/lib/server/validation', () => ({
  validateRequest: vi.fn(),
  workPreferencesSchema: {},
}));

// ---------------------------------------------------------------------------
// Import mocked modules so we can control them
// ---------------------------------------------------------------------------

import { authenticateRequest } from '@/lib/server/auth';
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting';
import { validateRequest } from '@/lib/server/validation';

// ---------------------------------------------------------------------------
// Import route handlers under test
// ---------------------------------------------------------------------------

import { GET as getReferralCode } from '@/app/api/student/referral/code/route';
import { POST as postReferralApply } from '@/app/api/student/referral/apply/route';
import { GET as getReferralStatus } from '@/app/api/student/referral/status/route';
import { GET as getDraft, PUT as putDraft } from '@/app/api/student/profile/draft/route';
import { GET as getPublishedProfile } from '@/app/api/student/profile/published/route';
import { GET as getResume, POST as postResume } from '@/app/api/student/resume/route';
import { GET as getToken } from '@/app/api/student/token/route';
import { GET as getWorkPreferences, POST as postWorkPreferences } from '@/app/api/student/work-preferences/route';
import { GET as getCreditsBalance } from '@/app/api/student/credits/balance/route';
import { GET as getCanClaim } from '@/app/api/student/credits/can-claim/route';
import { POST as postCreditsClaim } from '@/app/api/student/credits/claim/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};
const VALID_DRAFT_ID = '11111111-1111-1111-1111-111111111111';

/** Build a chainable Supabase mock. Every query-builder method returns `this`. */
function createMockSupabase() {
  const mockChain: Record<string, Mock> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  };

  // Make chain methods that don't yet return `this` do so
  // (select/eq/... already do; single/maybeSingle resolve the chain)

  return {
    from: vi.fn().mockReturnValue(mockChain),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
      }),
    },
    _chain: mockChain,
  };
}

type MockSupabase = ReturnType<typeof createMockSupabase>;

function mockAuthSuccess(supabase: MockSupabase) {
  (authenticateRequest as Mock).mockResolvedValue({
    user: mockUser,
    supabase,
    error: null,
  });
}

function mockAuthFailure() {
  (authenticateRequest as Mock).mockResolvedValue({
    user: null,
    supabase: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  });
}

function mockRateLimitAllowed() {
  (checkRateLimit as Mock).mockResolvedValue({
    data: { allowed: true, hourly_count: 1, daily_count: 1, hourly_remaining: 9, daily_remaining: 49 },
    error: null,
  });
}

function mockRateLimitExceeded() {
  (checkRateLimit as Mock).mockResolvedValue({
    data: { allowed: false, hourly_count: 10, daily_count: 50, hourly_remaining: 0, daily_remaining: 0 },
    error: null,
  });
}

function createJsonRequest(body: unknown, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function createFormDataRequest(file: File): NextRequest {
  const formData = new FormData();
  formData.append('file', file);
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: formData,
  });
}

/** Parse a Response/NextResponse body as JSON. */
async function json(res: Response) {
  return res.json();
}

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();

  // Default: rate-limit allowed, logApiCall succeeds silently
  mockRateLimitAllowed();
  (logApiCall as Mock).mockResolvedValue(undefined);
});

// =========================================================================
// 1. GET /api/student/referral/code
// =========================================================================
describe('GET /api/student/referral/code', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await getReferralCode();
    expect(res.status).toBe(401);
  });

  it('returns referral code and stats on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({
        data: [{ code: 'abc12345' }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            referral_code: 'abc12345',
            total_referrals: 5,
            pending_referrals: 2,
            completed_referrals: 3,
            total_credits_earned: 300,
          },
        ],
        error: null,
      });

    const res = await getReferralCode();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toEqual({
      code: 'abc12345',
      totalReferrals: 5,
      pendingReferrals: 2,
      completedReferrals: 3,
      totalCreditsEarned: 300,
    });
  });

  it('returns 403 when code RPC error includes "talent accounts"', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Only talent accounts can use referral codes' },
    });

    const res = await getReferralCode();
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.error).toContain('talent accounts');
  });

  it('returns 403 when stats RPC error includes "talent accounts"', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [{ code: 'abc12345' }], error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Only talent accounts can view stats' },
      });

    const res = await getReferralCode();
    expect(res.status).toBe(403);
  });

  it('returns 500 when code RPC errors (non-talent)', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error' },
    });

    const res = await getReferralCode();
    expect(res.status).toBe(500);
  });

  it('returns 500 when code result is empty', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValueOnce({ data: [{}], error: null });

    const res = await getReferralCode();
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toContain('generate');
  });

  it('returns defaults when stats data is empty', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [{ code: 'abc12345' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const res = await getReferralCode();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.totalReferrals).toBe(0);
    expect(body.code).toBe('abc12345');
  });
});

// =========================================================================
// 2. POST /api/student/referral/apply
// =========================================================================
describe('POST /api/student/referral/apply', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const req = createJsonRequest({ code: 'abc12345' });
    const res = await postReferralApply(req);
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);
    mockRateLimitExceeded();

    const req = createJsonRequest({ code: 'abc12345' });
    const res = await postReferralApply(req);
    expect(res.status).toBe(429);
    expect(rateLimitExceededResponse).toHaveBeenCalled();
  });

  it('returns 400 when code is missing', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({});
    const res = await postReferralApply(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toContain('required');
  });

  it('returns 400 for invalid code format', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({ code: 'INVALID!!' });
    const res = await postReferralApply(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toContain('Invalid or expired');
  });

  it('returns 400 when code is too short', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({ code: 'abc' });
    const res = await postReferralApply(req);
    expect(res.status).toBe(400);
  });

  it('applies valid code successfully', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({
      data: [{ success: true }],
      error: null,
    });

    const req = createJsonRequest({ code: 'abc12345' });
    const res = await postReferralApply(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('apply_referral_code', { p_code: 'abc12345' });
  });

  it('normalises code to lowercase', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: [{ success: true }], error: null });

    const req = createJsonRequest({ code: 'ABC12345' });
    const res = await postReferralApply(req);
    expect(res.status).toBe(200);
    expect(supabase.rpc).toHaveBeenCalledWith('apply_referral_code', { p_code: 'abc12345' });
  });

  it('returns 500 on database error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB down' } });

    const req = createJsonRequest({ code: 'abc12345' });
    const res = await postReferralApply(req);
    expect(res.status).toBe(500);
  });

  it('returns 400 when RPC row.success is false', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({
      data: [{ success: false, error_message: 'Code expired' }],
      error: null,
    });

    const req = createJsonRequest({ code: 'abc12345' });
    const res = await postReferralApply(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Invalid or expired referral code');
  });

  it('returns 400 for non-JSON request body', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await postReferralApply(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toContain('Invalid request body');
  });

  it('logs API call after applying code', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: [{ success: true }], error: null });

    const req = createJsonRequest({ code: 'abc12345' });
    await postReferralApply(req);
    expect(logApiCall).toHaveBeenCalledWith('user-123', 'referral-apply');
  });
});

// =========================================================================
// 3. GET /api/student/referral/status
// =========================================================================
describe('GET /api/student/referral/status', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await getReferralStatus();
    expect(res.status).toBe(401);
  });

  it('returns referral status on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({
      data: [
        {
          is_referred: true,
          status: 'completed',
          bonus_credits: 100,
          referrer_first_name: 'Alice',
        },
      ],
      error: null,
    });

    const res = await getReferralStatus();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toEqual({
      isReferred: true,
      status: 'completed',
      bonusCredits: 100,
      referrerFirstName: 'Alice',
    });
  });

  it('returns defaults when no data row', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const res = await getReferralStatus();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.isReferred).toBe(false);
    expect(body.status).toBeNull();
  });

  it('returns 500 on RPC error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await getReferralStatus();
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// 4. GET /api/student/profile/draft
// =========================================================================
describe('GET /api/student/profile/draft', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await getDraft();
    expect(res.status).toBe(401);
  });

  it('returns existing draft', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const draftData = { id: 'draft-1', student_id: 'user-123', student_name: 'Test' };
    supabase._chain.maybeSingle.mockResolvedValue({ data: draftData, error: null });

    const res = await getDraft();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.draft).toEqual(draftData);
  });

  it('creates new draft when none exists', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    // First call: maybeSingle returns null (no existing draft)
    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    // Second call: single returns newly created draft
    const newDraft = { id: 'draft-new', student_id: 'user-123', status: 'editing' };
    supabase._chain.single.mockResolvedValue({ data: newDraft, error: null });

    const res = await getDraft();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.draft).toEqual(newDraft);

    // Verify upsert was called
    expect(supabase.from).toHaveBeenCalledWith('student_profile_draft');
    expect(supabase._chain.upsert).toHaveBeenCalled();
  });

  it('returns 500 on fetch error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const res = await getDraft();
    expect(res.status).toBe(500);
  });

  it('returns 500 when draft creation fails', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabase._chain.single.mockResolvedValue({ data: null, error: { message: 'create fail' } });

    const res = await getDraft();
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// 5. PUT /api/student/profile/draft
// =========================================================================
describe('PUT /api/student/profile/draft', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const req = createJsonRequest({ draftId: VALID_DRAFT_ID, updates: {} }, 'PUT');
    const res = await putDraft(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when draftId is missing', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({ updates: { student_name: 'X' } }, 'PUT');
    const res = await putDraft(req);
    expect(res.status).toBe(400);
  });

  it('updates draft successfully', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const updatedDraft = { id: VALID_DRAFT_ID, student_name: 'Updated', status: 'editing' };
    supabase._chain.single.mockResolvedValue({ data: updatedDraft, error: null });

    const req = createJsonRequest(
      { draftId: VALID_DRAFT_ID, updates: { student_name: 'Updated' } },
      'PUT',
    );
    const res = await putDraft(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.draft).toEqual(updatedDraft);
  });

  it('sanitises updates to allowed fields only', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const updatedDraft = { id: VALID_DRAFT_ID, student_name: 'Updated' };
    supabase._chain.single.mockResolvedValue({ data: updatedDraft, error: null });

    const req = createJsonRequest(
      {
        draftId: VALID_DRAFT_ID,
        updates: {
          student_name: 'Updated',
          malicious_field: 'should be stripped',
          email: 'ok@example.com',
        },
      },
      'PUT',
    );

    await putDraft(req);

    // The update call should include only allowed fields + status + updated_at
    const updateArg = supabase._chain.update.mock.calls[0][0];
    expect(updateArg).toHaveProperty('student_name', 'Updated');
    expect(updateArg).toHaveProperty('email', 'ok@example.com');
    expect(updateArg).not.toHaveProperty('malicious_field');
    expect(updateArg).toHaveProperty('status', 'editing');
    expect(updateArg).toHaveProperty('updated_at');
  });

  it('returns 500 on update error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const req = createJsonRequest(
      { draftId: VALID_DRAFT_ID, updates: { student_name: 'X' } },
      'PUT',
    );
    const res = await putDraft(req);
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// 6. GET /api/student/profile/published
// =========================================================================
describe('GET /api/student/profile/published', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const req = new NextRequest('http://localhost:3000/api/student/profile/published');
    const res = await getPublishedProfile(req);
    expect(res.status).toBe(401);
  });

  it('returns 404 when student not found', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({
      data: null,
      error: { message: 'not found', code: 'PGRST116' },
    });

    const req = new NextRequest('http://localhost:3000/api/student/profile/published');
    const res = await getPublishedProfile(req);
    expect(res.status).toBe(404);
  });

  it('returns full published profile', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const studentData = { id: 'user-123', name: 'Test Student' };

    // The first call with .single() returns student data
    supabase._chain.single.mockResolvedValue({ data: studentData, error: null });

    // For Promise.all calls — the chain returns data arrays via select -> eq -> (maybeSingle for social_link)
    // After the student fetch, the route calls from() 7 more times.
    // Each returns the same chain mock, so we need to sequence the results.
    // The chain's select/eq already return `this`, and the results come from the
    // resolved value of the final method (which for 6 of 7 is implicit — no .single()/.maybeSingle())

    // Because the mock chain is shared across all from() calls, we need a smarter
    // approach: override `from` to return fresh chains per table.
    const tableChains: Record<string, Record<string, Mock>> = {};

    /**
     * Build a per-table chain mock.
     * @param terminalData  - data the final method should resolve with
     * @param terminal      - 'eq' | 'single' | 'maybeSingle'
     *   'eq'         – the chain is awaited right after .eq(), so eq returns a thenable.
     *   'single'     – the chain uses .single() as the terminal (eq still chainable).
     *   'maybeSingle'– the chain uses .maybeSingle() as the terminal (eq still chainable).
     */
    function makeChain(terminalData: unknown, terminal: 'eq' | 'single' | 'maybeSingle' = 'eq') {
      const chain: Record<string, Mock> = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn(),
        single: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };
      // Default: every method returns the chain itself (allows chaining)
      for (const key of Object.keys(chain)) {
        chain[key].mockReturnValue(chain);
      }

      if (terminal === 'eq') {
        // Result is awaited directly after .eq(), so eq must be thenable
        const result = { data: terminalData, error: null };
        // Make it thenable so `await supabase.from(t).select('*').eq(...)` resolves
        const thenable = {
          ...result,
          then: (resolve: (v: unknown) => void) => resolve(result),
        };
        chain.eq.mockReturnValue(thenable);
      } else if (terminal === 'single') {
        chain.single.mockResolvedValue({ data: terminalData, error: null });
      } else {
        chain.maybeSingle.mockResolvedValue({ data: terminalData, error: null });
      }
      return chain;
    }

    // student table (first call) - uses .single() as terminal
    tableChains['student'] = makeChain(studentData, 'single');

    // related data tables
    const academic = [{ id: 'a1', school: 'MIT' }];
    const experience = [{ id: 'e1', company: 'Google' }];
    const projects = [{ id: 'p1', name: 'App' }];
    const skills = [{ id: 's1', name: 'JS' }];
    const languages = [{ id: 'l1', name: 'English' }];
    const certifications = [{ id: 'c1', name: 'AWS' }];
    const socialLinks = { github: 'https://github.com/test' };

    tableChains['academic'] = makeChain(academic);
    tableChains['experience'] = makeChain(experience);
    tableChains['project'] = makeChain(projects);
    tableChains['skill'] = makeChain(skills);
    tableChains['language'] = makeChain(languages);
    tableChains['certification'] = makeChain(certifications);
    tableChains['social_link'] = makeChain(socialLinks, 'maybeSingle');

    supabase.from.mockImplementation((table: string) => {
      return tableChains[table] || supabase._chain;
    });

    const req = new NextRequest('http://localhost:3000/api/student/profile/published');
    const res = await getPublishedProfile(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.student).toEqual(studentData);
    expect(body.academic).toEqual(academic);
    expect(body.experience).toEqual(experience);
    expect(body.projects).toEqual(projects);
    expect(body.skills).toEqual(skills);
    expect(body.languages).toEqual(languages);
    expect(body.certifications).toEqual(certifications);
    expect(body.socialLinks).toEqual(socialLinks);
  });
});

// =========================================================================
// 7. GET /api/student/resume
// =========================================================================
describe('GET /api/student/resume', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await getResume();
    expect(res.status).toBe(401);
  });

  it('returns resume data when found', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const resumeData = { id: 'r1', student_id: 'user-123', file_name: 'resume.pdf' };
    supabase._chain.single.mockResolvedValue({ data: resumeData, error: null });

    const res = await getResume();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toEqual(resumeData);
  });

  it('returns { data: null } when no resume found (PGRST116)', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows' },
    });

    const res = await getResume();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toBeNull();
  });

  it('returns 500 on other DB error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({
      data: null,
      error: { code: 'OTHER', message: 'boom' },
    });

    const res = await getResume();
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// 8. POST /api/student/resume
// =========================================================================
describe('POST /api/student/resume', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const file = new File(['pdf'], 'resume.pdf', { type: 'application/pdf' });
    const req = createFormDataRequest(file);
    const res = await postResume(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file is provided', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: formData,
    });

    const res = await postResume(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toContain('No file');
  });

  it('returns 400 for non-PDF file', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const file = new File(['text'], 'doc.txt', { type: 'text/plain' });
    const req = createFormDataRequest(file);
    const res = await postResume(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toContain('PDF');
  });

  it('returns 400 for file exceeding 5MB', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    // Create a file > 5MB
    const bigContent = new Uint8Array(5 * 1024 * 1024 + 1);
    const file = new File([bigContent], 'huge.pdf', { type: 'application/pdf' });
    const req = createFormDataRequest(file);
    const res = await postResume(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toContain('5MB');
  });

  it('uploads resume successfully', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    });

    // DB upsert chain — need upsert to return a resolved promise (no .select().single() here)
    supabase._chain.upsert.mockResolvedValue({ error: null });

    // The route calls .from('resume').upsert(...)  (no .select().single() after)
    const file = new File(['%PDF-1.4 content'], 'my-resume.pdf', { type: 'application/pdf' });
    const req = createFormDataRequest(file);
    const res = await postResume(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);

    // Verify storage upload path
    expect(supabase.storage.from).toHaveBeenCalledWith('resumes');
  });

  it('returns 500 when storage upload fails', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: 'storage error' } }),
    });

    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' });
    const req = createFormDataRequest(file);
    const res = await postResume(req);
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toContain('upload');
  });

  it('returns 500 when DB upsert fails after successful upload', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    });
    supabase._chain.upsert.mockResolvedValue({ error: { message: 'db error' } });

    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' });
    const req = createFormDataRequest(file);
    const res = await postResume(req);
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toContain('metadata');
  });
});

// =========================================================================
// 9. GET /api/student/token
// =========================================================================
describe('GET /api/student/token', () => {
  const tokenUrl = 'http://localhost:3000/api/student/token';

  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const req = new NextRequest(tokenUrl, {
      headers: { 'user-agent': 'Electron/30.0.0' },
    });
    const res = await getToken(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when called from non-Electron user-agent', async () => {
    const req = new NextRequest(tokenUrl, {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    const res = await getToken(req);
    expect(res.status).toBe(403);
  });

  it('returns token on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({
      data: { token: 'tok_abc123' },
      error: null,
    });

    const req = new NextRequest(tokenUrl, {
      headers: { 'user-agent': 'Electron/30.0.0' },
    });
    const res = await getToken(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.token).toBe('tok_abc123');
    expect(body.user_id).toBeUndefined();
  });

  it('returns 404 when no token found', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({
      data: null,
      error: { message: 'no rows' },
    });

    const req = new NextRequest(tokenUrl, {
      headers: { 'user-agent': 'Electron/30.0.0' },
    });
    const res = await getToken(req);
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toContain('No API token');
  });
});

// =========================================================================
// 10. GET /api/student/work-preferences
// =========================================================================
describe('GET /api/student/work-preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await getWorkPreferences();
    expect(res.status).toBe(401);
  });

  it('returns preferences on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const prefs = { remote_work: true, job_full_time: true };
    supabase._chain.maybeSingle.mockResolvedValue({ data: prefs, error: null });

    const res = await getWorkPreferences();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.preferences).toEqual(prefs);
  });

  it('returns null preferences when no record', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await getWorkPreferences();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.preferences).toBeNull();
  });

  it('returns 500 on DB error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'err' } });

    const res = await getWorkPreferences();
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// 11. POST /api/student/work-preferences
// =========================================================================
describe('POST /api/student/work-preferences', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const req = createJsonRequest({ remote_work: true });
    const res = await postWorkPreferences(req);
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);
    mockRateLimitExceeded();

    const req = createJsonRequest({ remote_work: true });
    const res = await postWorkPreferences(req);
    expect(res.status).toBe(429);
  });

  it('returns 400 on validation failure', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (validateRequest as Mock).mockReturnValue({
      data: null,
      error: { status: 400, message: 'Validation failed' },
    });

    const req = createJsonRequest({ bad: 'data' });
    const res = await postWorkPreferences(req);
    expect(res.status).toBe(400);
  });

  it('saves work preferences successfully', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const prefs = { remote_work: true };
    (validateRequest as Mock).mockReturnValue({ data: prefs, error: null });

    const savedData = { student_id: 'user-123', remote_work: true };
    supabase._chain.single.mockResolvedValue({ data: savedData, error: null });

    const req = createJsonRequest(prefs);
    const res = await postWorkPreferences(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.preferences).toEqual(savedData);
    expect(logApiCall).toHaveBeenCalledWith('user-123', 'work-preferences');
  });

  it('returns 500 on DB error during upsert', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (validateRequest as Mock).mockReturnValue({ data: { remote_work: true }, error: null });
    supabase._chain.single.mockResolvedValue({ data: null, error: { message: 'err' } });

    const req = createJsonRequest({ remote_work: true });
    const res = await postWorkPreferences(req);
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// 12. GET /api/student/credits/balance
// =========================================================================
describe('GET /api/student/credits/balance', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await getCreditsBalance();
    expect(res.status).toBe(401);
  });

  it('returns balance on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const credits = {
      balance: 500,
      total_earned: 200,
      total_purchased: 300,
      total_used: 0,
      last_updated: '2024-06-01T00:00:00Z',
    };
    supabase._chain.maybeSingle.mockResolvedValue({ data: credits, error: null });

    const res = await getCreditsBalance();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.balance).toBe(500);
  });

  it('returns defaults when no record exists', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await getCreditsBalance();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toEqual({
      balance: 0,
      total_earned: 0,
      total_purchased: 0,
      total_used: 0,
      last_updated: null,
    });
  });

  it('returns 500 on DB error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'err' } });

    const res = await getCreditsBalance();
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// 13. GET /api/student/credits/can-claim
// =========================================================================
describe('GET /api/student/credits/can-claim', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await getCanClaim();
    expect(res.status).toBe(401);
  });

  it('returns can_claim=true when no grant today', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await getCanClaim();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.can_claim).toBe(true);
    expect(body.claimed_today).toBe(false);
    expect(body.next_claim_available).toBeNull();
  });

  it('returns can_claim=false when already claimed today', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({
      data: { granted_at: '2024-06-01T12:00:00Z' },
      error: null,
    });

    const res = await getCanClaim();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.can_claim).toBe(false);
    expect(body.claimed_today).toBe(true);
    expect(body.last_claim).toBe('2024-06-01T12:00:00Z');
    expect(body.next_claim_available).toBeTruthy();
  });

  it('returns 500 on DB error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'err' } });

    const res = await getCanClaim();
    expect(res.status).toBe(500);
  });
});

// =========================================================================
// 14. POST /api/student/credits/claim
// =========================================================================
describe('POST /api/student/credits/claim', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await postCreditsClaim();
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);
    mockRateLimitExceeded();

    const res = await postCreditsClaim();
    expect(res.status).toBe(429);
  });

  it('claims credits successfully', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({
      data: [{ success: true, credits_granted: 100, new_balance: 600 }],
      error: null,
    });

    const res = await postCreditsClaim();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.credits_granted).toBe(100);
    expect(body.balance).toBe(600);
    expect(logApiCall).toHaveBeenCalledWith('user-123', 'credits-claim');
  });

  it('returns 200 with 0 credits when already claimed today', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({
      data: [{ success: false, credits_granted: 0, new_balance: 500 }],
      error: null,
    });

    const res = await postCreditsClaim();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.credits_granted).toBe(0);
    expect(body.message).toContain('already claimed');
  });

  it('returns 500 on RPC error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await postCreditsClaim();
    expect(res.status).toBe(500);
  });

  it('returns 500 when RPC returns empty data', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const res = await postCreditsClaim();
    expect(res.status).toBe(500);
  });

  it('returns 500 when rate limit check itself errors', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (checkRateLimit as Mock).mockResolvedValue({
      data: null,
      error: NextResponse.json({ error: 'Internal error' }, { status: 500 }),
    });

    const res = await postCreditsClaim();
    expect(res.status).toBe(500);
  });
});
