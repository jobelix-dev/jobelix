/**
 * Tests for additional student API routes not covered by routes.test.ts:
 *
 * - GET  /api/student/referral/leaderboard
 * - GET  /api/student/referral/list
 * - GET  /api/student/resume/download
 * - POST /api/student/work-preferences/export-yaml
 * - POST /api/student/profile/draft/finalize
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

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('yaml', () => ({
  parse: vi.fn(),
}));

vi.mock('@/lib/server/draftMappers', () => ({
  mapDraftToStudent: vi.fn(() => ({})),
  mapDraftToAcademic: vi.fn(() => []),
  mapDraftToExperience: vi.fn(() => []),
  mapDraftToProjects: vi.fn(() => []),
  mapDraftToSkills: vi.fn(() => []),
  mapDraftToLanguages: vi.fn(() => []),
  mapDraftToPublications: vi.fn(() => []),
  mapDraftToCertifications: vi.fn(() => []),
  mapDraftToSocialLinks: vi.fn(() => ({})),
}));

// ---------------------------------------------------------------------------
// Import mocked modules so we can control them
// ---------------------------------------------------------------------------

import { authenticateRequest } from '@/lib/server/auth';
import { mkdir, writeFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import { checkRateLimit, logApiCall } from '@/lib/server/rateLimiting';
import {
  mapDraftToStudent,
  mapDraftToAcademic,
  mapDraftToExperience,
  mapDraftToProjects,
  mapDraftToSkills,
  mapDraftToLanguages,
  mapDraftToPublications,
  mapDraftToCertifications,
  mapDraftToSocialLinks,
} from '@/lib/server/draftMappers';

// ---------------------------------------------------------------------------
// Import route handlers under test
// ---------------------------------------------------------------------------

import { GET as getLeaderboard } from '@/app/api/student/referral/leaderboard/route';
import { GET as getReferralList } from '@/app/api/student/referral/list/route';
import { GET as downloadResume } from '@/app/api/student/resume/download/route';
import { POST as exportYaml } from '@/app/api/student/work-preferences/export-yaml/route';
import { POST as finalizeProfile } from '@/app/api/student/profile/draft/finalize/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

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

  return {
    from: vi.fn().mockReturnValue(mockChain),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        download: vi.fn(),
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

function createJsonRequest(body: unknown, url = 'http://localhost:3000/api/test'): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
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
  (checkRateLimit as Mock).mockResolvedValue({
    data: {
      allowed: true,
      hourly_count: 0,
      daily_count: 0,
      hourly_remaining: 10,
      daily_remaining: 30,
    },
    error: null,
  });
  (logApiCall as Mock).mockResolvedValue(undefined);
});

// =========================================================================
// 1. GET /api/student/referral/leaderboard
// =========================================================================
describe('GET /api/student/referral/leaderboard', () => {
  function createLeaderboardRequest(limit?: number | string): NextRequest {
    const url = limit !== undefined
      ? `http://localhost:3000/api/student/referral/leaderboard?limit=${limit}`
      : 'http://localhost:3000/api/student/referral/leaderboard';
    return new NextRequest(url);
  }

  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const req = createLeaderboardRequest();
    const res = await getLeaderboard(req);
    expect(res.status).toBe(401);
  });

  it('returns leaderboard and userRank on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            rank: 1,
            first_name: 'Alice',
            completed_count: 10,
            total_credits_earned: 1000,
            is_current_user: false,
          },
          {
            rank: 2,
            first_name: 'Bob',
            completed_count: 5,
            total_credits_earned: 500,
            is_current_user: true,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            rank: 2,
            completed_count: 5,
            total_credits_earned: 500,
            total_participants: 42,
          },
        ],
        error: null,
      });

    const req = createLeaderboardRequest();
    const res = await getLeaderboard(req);
    expect(res.status).toBe(200);
    const body = await json(res);

    expect(body.leaderboard).toHaveLength(2);
    expect(body.leaderboard[0]).toEqual({
      rank: 1,
      firstName: 'Alice',
      completedCount: 10,
      creditsEarned: 1000,
      isCurrentUser: false,
    });
    expect(body.leaderboard[1]).toEqual({
      rank: 2,
      firstName: 'Bob',
      completedCount: 5,
      creditsEarned: 500,
      isCurrentUser: true,
    });
    expect(body.userRank).toEqual({
      rank: 2,
      completedCount: 5,
      creditsEarned: 500,
      totalParticipants: 42,
    });
  });

  it('uses default limit of 10 when no limit param', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest();
    await getLeaderboard(req);

    expect(supabase.rpc).toHaveBeenCalledWith('get_referral_leaderboard', { p_limit: 10 });
  });

  it('respects a valid custom limit', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest(5);
    await getLeaderboard(req);

    expect(supabase.rpc).toHaveBeenCalledWith('get_referral_leaderboard', { p_limit: 5 });
  });

  it('clamps limit exceeding 50 back to default 10', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest(100);
    await getLeaderboard(req);

    expect(supabase.rpc).toHaveBeenCalledWith('get_referral_leaderboard', { p_limit: 10 });
  });

  it('falls back to default 10 for non-numeric limit', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest('abc');
    await getLeaderboard(req);

    expect(supabase.rpc).toHaveBeenCalledWith('get_referral_leaderboard', { p_limit: 10 });
  });

  it('falls back to default 10 for negative limit', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest(-5);
    await getLeaderboard(req);

    expect(supabase.rpc).toHaveBeenCalledWith('get_referral_leaderboard', { p_limit: 10 });
  });

  it('falls back to default 10 for zero limit', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest(0);
    await getLeaderboard(req);

    expect(supabase.rpc).toHaveBeenCalledWith('get_referral_leaderboard', { p_limit: 10 });
  });

  it('returns 500 when leaderboard RPC errors', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest();
    const res = await getLeaderboard(req);
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toContain('leaderboard');
  });

  it('returns leaderboard with userRank=null when rank RPC errors (non-fatal)', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({
        data: [
          {
            rank: 1,
            first_name: 'Alice',
            completed_count: 10,
            total_credits_earned: 1000,
            is_current_user: false,
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: 'rank error' } });

    const req = createLeaderboardRequest();
    const res = await getLeaderboard(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.leaderboard).toHaveLength(1);
    expect(body.userRank).toBeNull();
  });

  it('returns empty leaderboard and null userRank when both return empty', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest();
    const res = await getLeaderboard(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.leaderboard).toEqual([]);
    expect(body.userRank).toBeNull();
  });

  it('handles null leaderboard data gracefully', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const req = createLeaderboardRequest();
    const res = await getLeaderboard(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.leaderboard).toEqual([]);
  });
});

// =========================================================================
// 2. GET /api/student/referral/list
// =========================================================================
describe('GET /api/student/referral/list', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await getReferralList();
    expect(res.status).toBe(401);
  });

  it('returns referrals list with camelCase keys on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({
      data: [
        {
          id: 'ref-1',
          first_name: 'Alice',
          status: 'completed',
          created_at: '2024-01-15T00:00:00Z',
          completed_at: '2024-02-01T00:00:00Z',
          credits_earned: 100,
        },
        {
          id: 'ref-2',
          first_name: 'Bob',
          status: 'pending',
          created_at: '2024-03-01T00:00:00Z',
          completed_at: null,
          credits_earned: 0,
        },
      ],
      error: null,
    });

    const res = await getReferralList();
    expect(res.status).toBe(200);
    const body = await json(res);

    expect(body.referrals).toHaveLength(2);
    expect(body.referrals[0]).toEqual({
      id: 'ref-1',
      firstName: 'Alice',
      status: 'completed',
      createdAt: '2024-01-15T00:00:00Z',
      completedAt: '2024-02-01T00:00:00Z',
      creditsEarned: 100,
    });
    expect(body.referrals[1]).toEqual({
      id: 'ref-2',
      firstName: 'Bob',
      status: 'pending',
      createdAt: '2024-03-01T00:00:00Z',
      completedAt: null,
      creditsEarned: 0,
    });
  });

  it('returns 403 when error message includes "talent accounts"', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Only talent accounts can use referrals' },
    });

    const res = await getReferralList();
    expect(res.status).toBe(403);
    const body = await json(res);
    expect(body.error).toContain('talent accounts');
  });

  it('returns 500 on non-talent RPC error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const res = await getReferralList();
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toContain('Failed to get referrals');
  });

  it('returns empty referrals array when data is null', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const res = await getReferralList();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.referrals).toEqual([]);
  });

  it('returns empty referrals array when data is empty', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const res = await getReferralList();
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.referrals).toEqual([]);
  });

  it('calls the correct RPC function', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.rpc.mockResolvedValue({ data: [], error: null });

    await getReferralList();
    expect(supabase.rpc).toHaveBeenCalledWith('get_my_referrals');
  });
});

// =========================================================================
// 3. GET /api/student/resume/download
// =========================================================================
describe('GET /api/student/resume/download', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const res = await downloadResume();
    expect(res.status).toBe(401);
  });

  it('returns PDF blob with correct headers on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const pdfBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
    supabase.storage.from.mockReturnValue({
      download: vi.fn().mockResolvedValue({ data: pdfBlob, error: null }),
    });

    const res = await downloadResume();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="resume.pdf"');

    // Verify the body content
    const responseBlob = await res.blob();
    const text = await responseBlob.text();
    expect(text).toBe('pdf-content');
  });

  it('downloads from the correct storage path using user id', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const mockDownload = vi.fn().mockResolvedValue({
      data: new Blob(['pdf']),
      error: null,
    });
    supabase.storage.from.mockReturnValue({ download: mockDownload });

    await downloadResume();

    expect(supabase.storage.from).toHaveBeenCalledWith('resumes');
    expect(mockDownload).toHaveBeenCalledWith('user-123/resume.pdf');
  });

  it('returns 404 when download errors (resume not found)', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.storage.from.mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Object not found' },
      }),
    });

    const res = await downloadResume();
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toBe('Resume not found');
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase.storage.from.mockReturnValue({
      download: vi.fn().mockRejectedValue(new Error('Network failure')),
    });

    const res = await downloadResume();
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toContain('Failed to download resume');
  });
});

// =========================================================================
// 4. POST /api/student/work-preferences/export-yaml
// =========================================================================
describe('POST /api/student/work-preferences/export-yaml', () => {
  const yamlUrl = 'http://localhost:3000/api/student/work-preferences/export-yaml';

  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const req = createJsonRequest({ yamlContent: 'key: value' }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when yamlContent is missing', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({}, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('YAML content is required');
  });

  it('returns 400 when yamlContent is empty string', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({ yamlContent: '' }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('YAML content is required');
  });

  it('returns 400 when yamlContent is not a string', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({ yamlContent: 12345 }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('YAML content must be a string');
  });

  it('returns 400 when yamlContent exceeds 100KB', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const bigContent = 'a'.repeat(100 * 1024 + 1);
    const req = createJsonRequest({ yamlContent: bigContent }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('YAML content exceeds maximum allowed size');
  });

  it('returns 400 when YAML parsing throws (invalid YAML)', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (parseYaml as Mock).mockImplementation(() => {
      throw new Error('Invalid YAML syntax');
    });

    const req = createJsonRequest({ yamlContent: '{ invalid yaml ::' }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Invalid YAML format');
  });

  it('returns 400 when parsed YAML is an array', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (parseYaml as Mock).mockReturnValue([1, 2, 3]);

    const req = createJsonRequest({ yamlContent: '- item1\n- item2' }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('YAML content must be a valid configuration object');
  });

  it('returns 400 when parsed YAML is null', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (parseYaml as Mock).mockReturnValue(null);

    const req = createJsonRequest({ yamlContent: 'null' }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('YAML content must be a valid configuration object');
  });

  it('returns 400 when parsed YAML is a primitive string', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (parseYaml as Mock).mockReturnValue('just a string');

    const req = createJsonRequest({ yamlContent: 'just a string' }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('YAML content must be a valid configuration object');
  });

  it('writes file and returns success on valid YAML config', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (parseYaml as Mock).mockReturnValue({ key: 'value', nested: { a: 1 } });
    (mkdir as Mock).mockResolvedValue(undefined);
    (writeFile as Mock).mockResolvedValue(undefined);

    const yamlContent = 'key: value\nnested:\n  a: 1';
    const req = createJsonRequest({ yamlContent }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(200);
    const body = await json(res);

    expect(body.success).toBe(true);
    expect(body.message).toContain('saved');

    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('config.yaml'),
      yamlContent,
      'utf-8',
    );
  });

  it('returns 500 when writeFile throws', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    (parseYaml as Mock).mockReturnValue({ key: 'value' });
    (mkdir as Mock).mockResolvedValue(undefined);
    (writeFile as Mock).mockRejectedValue(new Error('Permission denied'));

    const req = createJsonRequest({ yamlContent: 'key: value' }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe('Failed to save config.yaml');
  });

  it('accepts YAML content exactly at 100KB limit', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const exactContent = 'a'.repeat(100 * 1024);
    (parseYaml as Mock).mockReturnValue({ data: 'ok' });
    (mkdir as Mock).mockResolvedValue(undefined);
    (writeFile as Mock).mockResolvedValue(undefined);

    const req = createJsonRequest({ yamlContent: exactContent }, yamlUrl);
    const res = await exportYaml(req);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
  });
});

// =========================================================================
// 5. POST /api/student/profile/draft/finalize
// =========================================================================
describe('POST /api/student/profile/draft/finalize', () => {
  const validDraftId = '11111111-2222-3333-4444-555555555555';
  const finalizeUrl = 'http://localhost:3000/api/student/profile/draft/finalize';

  it('returns 401 when not authenticated', async () => {
    mockAuthFailure();
    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when draftId is missing', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({}, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Invalid ID format');
  });

  it('returns 400 when draftId is not a valid UUID', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({ draftId: 'not-a-uuid' }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Invalid ID format');
  });

  it('returns 400 when draftId is null', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const req = createJsonRequest({ draftId: null }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('Invalid ID format');
  });

  it('returns 404 when draft is not found (query error)', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({
      data: null,
      error: { message: 'No rows', code: 'PGRST116' },
    });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toBe('Draft not found');
  });

  it('returns 404 when draft data is null without error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({ data: null, error: null });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toBe('Draft not found');
  });

  it('returns 500 when RPC returns an error', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const draft = { id: validDraftId, student_id: 'user-123', status: 'editing' };
    supabase._chain.single.mockResolvedValue({ data: draft, error: null });
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Transaction failed' },
    });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe('Failed to save profile');
    expect(body.details).toBeUndefined();
  });

  it('returns 500 when RPC returns { success: false }', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const draft = { id: validDraftId, student_id: 'user-123', status: 'editing' };
    supabase._chain.single.mockResolvedValue({ data: draft, error: null });
    supabase.rpc.mockResolvedValue({
      data: { success: false, error: 'Validation failed', detail: 'Missing name' },
      error: null,
    });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeUndefined();
  });

  it('calls all 9 mapDraftTo* functions with draft and user id', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const draft = { id: validDraftId, student_id: 'user-123', status: 'editing', name: 'Test' };
    supabase._chain.single.mockResolvedValue({ data: draft, error: null });
    supabase.rpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    await finalizeProfile(req);

    expect(mapDraftToStudent).toHaveBeenCalledWith(draft, 'user-123');
    expect(mapDraftToAcademic).toHaveBeenCalledWith(draft, 'user-123');
    expect(mapDraftToExperience).toHaveBeenCalledWith(draft, 'user-123');
    expect(mapDraftToProjects).toHaveBeenCalledWith(draft, 'user-123');
    expect(mapDraftToSkills).toHaveBeenCalledWith(draft, 'user-123');
    expect(mapDraftToLanguages).toHaveBeenCalledWith(draft, 'user-123');
    expect(mapDraftToPublications).toHaveBeenCalledWith(draft, 'user-123');
    expect(mapDraftToCertifications).toHaveBeenCalledWith(draft, 'user-123');
    expect(mapDraftToSocialLinks).toHaveBeenCalledWith(draft, 'user-123');
  });

  it('calls finalize_student_profile RPC with mapped data', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const draft = { id: validDraftId, student_id: 'user-123', status: 'editing' };
    supabase._chain.single.mockResolvedValue({ data: draft, error: null });
    supabase.rpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    await finalizeProfile(req);

    expect(supabase.rpc).toHaveBeenCalledWith('finalize_student_profile', {
      p_user_id: 'user-123',
      p_profile: {},
      p_education: [],
      p_experience: [],
      p_projects: [],
      p_skills: [],
      p_languages: [],
      p_publications: [],
      p_certifications: [],
      p_social_links: {},
    });
  });

  it('updates draft status to published on success', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const draft = { id: validDraftId, student_id: 'user-123', status: 'editing' };
    supabase._chain.single.mockResolvedValue({ data: draft, error: null });
    supabase.rpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    await finalizeProfile(req);

    // Verify the draft status update
    expect(supabase.from).toHaveBeenCalledWith('student_profile_draft');
    expect(supabase._chain.update).toHaveBeenCalledWith({ status: 'published' });
  });

  it('returns success response with result data', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    const draft = { id: validDraftId, student_id: 'user-123', status: 'editing' };
    const rpcResult = { success: true, profile_id: 'p-1' };
    supabase._chain.single.mockResolvedValue({ data: draft, error: null });
    supabase.rpc.mockResolvedValue({ data: rpcResult, error: null });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(200);
    const body = await json(res);

    expect(body.success).toBe(true);
    expect(body.message).toBe('Profile data saved successfully');
    expect(body.data).toEqual(rpcResult);
  });

  it('fetches draft scoped to the authenticated user', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockResolvedValue({ data: null, error: null });

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    await finalizeProfile(req);

    // Verify it queries the right table with both draftId and user.id
    expect(supabase.from).toHaveBeenCalledWith('student_profile_draft');
    expect(supabase._chain.select).toHaveBeenCalledWith('*');
    expect(supabase._chain.eq).toHaveBeenCalledWith('id', validDraftId);
    expect(supabase._chain.eq).toHaveBeenCalledWith('student_id', 'user-123');
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    const supabase = createMockSupabase();
    mockAuthSuccess(supabase);

    supabase._chain.single.mockRejectedValue(new Error('Unexpected crash'));

    const req = createJsonRequest({ draftId: validDraftId }, finalizeUrl);
    const res = await finalizeProfile(req);
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error).toBe('Failed to finalize profile');
  });
});
