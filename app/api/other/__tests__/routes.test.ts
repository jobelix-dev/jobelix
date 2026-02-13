/**
 * Comprehensive tests for newsletter and feedback API routes
 *
 * Tests cover: POST /api/newsletter, POST /api/feedback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock modules – must be declared before any import that triggers them
// ---------------------------------------------------------------------------

// Mock Resend – both routes create a module-level `resend` instance
const mockContactsCreate = vi.fn();
const mockEmailsSend = vi.fn();
const mockResendInstance = {
  contacts: { create: mockContactsCreate },
  emails: { send: mockEmailsSend },
};

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      contacts = mockResendInstance.contacts;
      emails = mockResendInstance.emails;
    },
  };
});

// Mock newsletter unsubscribe helper
vi.mock('@/app/api/newsletter/unsubscribe/route', () => ({
  generateUnsubscribeUrl: vi.fn().mockReturnValue('https://example.com/unsubscribe?token=xxx'),
}));

// Mock supabase server client (for feedback auth check)
const mockGetUser = vi.fn();
const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
};

vi.mock('@/lib/server/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

// Mock supabase service client (for feedback DB operations)
const mockServiceFrom = vi.fn();
const mockServiceSupabaseClient = {
  from: mockServiceFrom,
};

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => mockServiceSupabaseClient),
}));

// Mock validation (for feedback route)
const mockValidateRequest = vi.fn();

vi.mock('@/lib/server/validation', () => ({
  validateRequest: (...args: unknown[]) => mockValidateRequest(...args),
  feedbackSchema: {},
}));

// Mock email templates (for feedback route)
vi.mock('@/lib/server/emailTemplates', () => ({
  generateFeedbackEmail: vi.fn().mockReturnValue('<html>test</html>'),
  getFeedbackEmailSubject: vi.fn().mockReturnValue('[Bug] Test Subject'),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(
  body: unknown,
  options?: { headers?: Record<string, string> },
): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/** Build a chainable `.from().insert().select().single()` mock */
function chainable(result: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

// Constant fixtures
const MOCK_USER_ID = '00000000-1111-2222-3333-444444444444';
const MOCK_EMAIL = 'test@example.com';

// ---------------------------------------------------------------------------
// Reset all mocks between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. POST /api/newsletter
// ===========================================================================
describe('POST /api/newsletter', () => {
  let POST: (req: NextRequest) => Promise<NextResponse>;

  beforeEach(async () => {
    // Ensure RESEND_API_KEY is set so the module-level `resend` is created
    process.env.RESEND_API_KEY = 'test_resend_key';
    // Dynamic import so mocks are in place
    const mod = await import('../../newsletter/route');
    POST = mod.POST;
  });

  it('returns success for valid email', async () => {
    mockContactsCreate.mockResolvedValueOnce({ data: {}, error: null });
    mockEmailsSend.mockResolvedValueOnce({ data: {}, error: null });

    const res = await POST(createMockRequest({ email: MOCK_EMAIL }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Successfully subscribed!');
  });

  it('returns 400 for invalid email', async () => {
    const res = await POST(createMockRequest({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid email address');
  });

  it('returns 400 for missing email', async () => {
    const res = await POST(createMockRequest({}));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid email address');
  });

  it('calls Resend contacts.create with correct params', async () => {
    mockContactsCreate.mockResolvedValueOnce({ data: {}, error: null });
    mockEmailsSend.mockResolvedValueOnce({ data: {}, error: null });

    await POST(createMockRequest({ email: MOCK_EMAIL }));

    expect(mockContactsCreate).toHaveBeenCalledWith({
      email: MOCK_EMAIL,
      unsubscribed: false,
    });
  });

  it('handles duplicate subscriber gracefully', async () => {
    mockContactsCreate.mockRejectedValueOnce(new Error('Contact already exists'));
    mockEmailsSend.mockResolvedValueOnce({ data: {}, error: null });

    const res = await POST(createMockRequest({ email: MOCK_EMAIL }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('handles Resend contact creation failure gracefully', async () => {
    mockContactsCreate.mockRejectedValueOnce(new Error('API limit exceeded'));
    mockEmailsSend.mockResolvedValueOnce({ data: {}, error: null });

    const res = await POST(createMockRequest({ email: MOCK_EMAIL }));

    // Should still return success - contact failure doesn't block
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('handles email send failure gracefully', async () => {
    mockContactsCreate.mockResolvedValueOnce({ data: {}, error: null });
    mockEmailsSend.mockRejectedValueOnce(new Error('Email send failed'));

    const res = await POST(createMockRequest({ email: MOCK_EMAIL }));

    // Should still return success - email failure doesn't block
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('returns 500 for unexpected errors', async () => {
    // Force a throw by making request.json() fail
    const badReq = new NextRequest('http://localhost:3000/api/newsletter', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(badReq);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to subscribe');
  });
});

// ===========================================================================
// 2. POST /api/feedback
// ===========================================================================
describe('POST /api/feedback', () => {
  let POST: (req: NextRequest) => Promise<NextResponse>;

  const MOCK_FEEDBACK_ID = 'fb-001';
  const MOCK_FEEDBACK_ROW = {
    id: MOCK_FEEDBACK_ID,
    created_at: '2026-01-15T12:00:00Z',
    feedback_type: 'bug',
    subject: 'Something broke',
    description: 'The page crashed when I clicked the button',
  };

  const validFeedbackBody = {
    feedback_type: 'bug',
    subject: 'Something broke',
    description: 'The page crashed when I clicked the button',
    user_email: 'user@example.com',
  };

  beforeEach(async () => {
    process.env.RESEND_API_KEY = 'test_resend_key';
    const mod = await import('../../feedback/route');
    POST = mod.POST;
  });

  it('returns success for valid feedback (authenticated user)', async () => {
    // Auth: user is logged in
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
    });

    // Validation passes
    mockValidateRequest.mockReturnValueOnce({
      data: { ...validFeedbackBody },
      error: null,
    });

    // DB insert succeeds
    const dbChain = chainable({ data: MOCK_FEEDBACK_ROW, error: null });
    mockServiceFrom.mockReturnValue(dbChain);

    // Email send succeeds
    mockEmailsSend.mockResolvedValueOnce({ data: {}, error: null });

    const res = await POST(
      createMockRequest(validFeedbackBody, {
        headers: { 'user-agent': 'TestBrowser/1.0', referer: 'http://localhost:3000/dashboard' },
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Thank you for your feedback!');
    expect(json.feedbackId).toBe(MOCK_FEEDBACK_ID);
  });

  it('returns success for anonymous feedback (no user)', async () => {
    // Auth: no user
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
    });

    // Validation passes
    mockValidateRequest.mockReturnValueOnce({
      data: { ...validFeedbackBody },
      error: null,
    });

    // DB insert succeeds
    const dbChain = chainable({ data: MOCK_FEEDBACK_ROW, error: null });
    mockServiceFrom.mockReturnValue(dbChain);

    // Email send succeeds
    mockEmailsSend.mockResolvedValueOnce({ data: {}, error: null });

    const res = await POST(createMockRequest(validFeedbackBody));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.feedbackId).toBe(MOCK_FEEDBACK_ID);
  });

  it('returns validation error for invalid body', async () => {
    // Auth: no user
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
    });

    // Validation fails
    mockValidateRequest.mockReturnValueOnce({
      data: null,
      error: { status: 400, message: 'Validation failed', errors: [{ path: 'subject', message: 'Required' }] },
    });

    const res = await POST(createMockRequest({ feedback_type: 'bug' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toBe('Validation failed');
  });

  it('returns 500 for DB error', async () => {
    // Auth: user is logged in
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
    });

    // Validation passes
    mockValidateRequest.mockReturnValueOnce({
      data: { ...validFeedbackBody },
      error: null,
    });

    // DB insert fails
    const dbChain = chainable({ data: null, error: { message: 'connection refused' } });
    mockServiceFrom.mockReturnValue(dbChain);

    const res = await POST(createMockRequest(validFeedbackBody));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Failed to store feedback');
  });

  it('handles email send failure gracefully (feedback still stored)', async () => {
    // Auth: user is logged in
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
    });

    // Validation passes
    mockValidateRequest.mockReturnValueOnce({
      data: { ...validFeedbackBody },
      error: null,
    });

    // DB insert succeeds
    const dbChain = chainable({ data: MOCK_FEEDBACK_ROW, error: null });
    mockServiceFrom.mockReturnValue(dbChain);

    // Email send fails
    mockEmailsSend.mockRejectedValueOnce(new Error('Resend API down'));

    const res = await POST(
      createMockRequest(validFeedbackBody, {
        headers: { 'user-agent': 'TestBrowser/1.0' },
      }),
    );

    // Should still return success – email failure doesn't block
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.feedbackId).toBe(MOCK_FEEDBACK_ID);
  });

  it('sets correct fields in DB insert', async () => {
    // Auth: user is logged in
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: MOCK_USER_ID } },
    });

    // Validation passes
    mockValidateRequest.mockReturnValueOnce({
      data: { ...validFeedbackBody },
      error: null,
    });

    // DB insert succeeds
    const dbChain = chainable({ data: MOCK_FEEDBACK_ROW, error: null });
    mockServiceFrom.mockReturnValue(dbChain);
    mockEmailsSend.mockResolvedValueOnce({ data: {}, error: null });

    await POST(
      createMockRequest(validFeedbackBody, {
        headers: {
          'user-agent': 'TestBrowser/1.0',
          referer: 'http://localhost:3000/dashboard',
        },
      }),
    );

    // Verify DB insert was called with correct table
    expect(mockServiceFrom).toHaveBeenCalledWith('user_feedback');

    // Verify insert payload
    expect(dbChain.insert).toHaveBeenCalledWith({
      user_id: MOCK_USER_ID,
      feedback_type: validFeedbackBody.feedback_type,
      subject: validFeedbackBody.subject,
      description: validFeedbackBody.description,
      user_email: validFeedbackBody.user_email,
      user_agent: 'TestBrowser/1.0',
      page_url: 'http://localhost:3000/dashboard',
      status: 'new',
    });
  });

  it('returns feedbackId in response', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
    });
    mockValidateRequest.mockReturnValueOnce({
      data: { ...validFeedbackBody },
      error: null,
    });
    const dbChain = chainable({ data: { ...MOCK_FEEDBACK_ROW, id: 'unique-feedback-42' }, error: null });
    mockServiceFrom.mockReturnValue(dbChain);
    mockEmailsSend.mockResolvedValueOnce({ data: {}, error: null });

    const res = await POST(createMockRequest(validFeedbackBody));
    const json = await res.json();

    expect(json.feedbackId).toBe('unique-feedback-42');
  });

  it('returns 500 for unexpected errors', async () => {
    // Force a throw by making request.json() fail
    const badReq = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    // Auth call happens before json parsing in the real code, so mock it
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
    });

    const res = await POST(badReq);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});
