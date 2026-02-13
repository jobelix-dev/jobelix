/**
 * Tests for POST /api/autoapply/gpt4
 *
 * Covers:
 * - Input validation (token, messages array, roles, content, length limits)
 * - Temperature clamping
 * - API token authentication via service supabase
 * - Rate limiting
 * - Credit deduction
 * - OpenAI call and response transformation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Environment variables — must be set BEFORE module import
// ---------------------------------------------------------------------------
process.env.OPENAI_API_KEY = 'sk-test-fake';

// ---------------------------------------------------------------------------
// Mock: OpenAI
// ---------------------------------------------------------------------------
const mockChatCreate = vi.fn();
const mockOpenAIInstance = { chat: { completions: { create: mockChatCreate } } };
vi.mock('openai', () => {
  // Must be a regular function (constructor-compatible with `new`)
  function MockOpenAI() { return mockOpenAIInstance; }
  return { default: MockOpenAI };
});

// ---------------------------------------------------------------------------
// Mock: service supabase
// ---------------------------------------------------------------------------
const mockServiceFrom = vi.fn();
const mockServiceRpc = vi.fn();

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({ from: mockServiceFrom, rpc: mockServiceRpc })),
}));

// ---------------------------------------------------------------------------
// Mock: rate limiting
// ---------------------------------------------------------------------------
const mockCheckRateLimit = vi.fn();
const mockLogApiCall = vi.fn();
const mockAddRateLimitHeaders = vi.fn((res: unknown) => res);
const mockRateLimitExceededResponse = vi.fn();

vi.mock('@/lib/server/rateLimiting', () => ({
  checkRateLimit: mockCheckRateLimit,
  logApiCall: mockLogApiCall,
  addRateLimitHeaders: mockAddRateLimitHeaders,
  rateLimitExceededResponse: mockRateLimitExceededResponse,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER_ID = '00000000-1111-2222-3333-444444444444';
const MOCK_TOKEN = 'test-api-token-abc123';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/autoapply/gpt4', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build a chainable `.from('api_tokens').select().eq().maybeSingle()` mock */
function chainableTokenLookup(result: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

/** Default happy-path rate limit result */
const happyRateLimit = {
  allowed: true,
  hourly_count: 1,
  daily_count: 1,
  hourly_remaining: 199,
  daily_remaining: 999,
};

/** Default happy-path OpenAI completion */
const happyCompletion = {
  choices: [{ message: { content: 'Hello from GPT!' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  model: 'gpt-4o-mini',
};

/** Set up all mocks for a successful end-to-end call */
function setupHappyPath() {
  // Token lookup succeeds
  mockServiceFrom.mockReturnValue(
    chainableTokenLookup({ data: { user_id: MOCK_USER_ID }, error: null })
  );

  // Rate limit passes
  mockCheckRateLimit.mockResolvedValue({ data: happyRateLimit, error: null });

  // Credit deduction succeeds
  mockServiceRpc.mockResolvedValue({
    data: [{ success: true }],
    error: null,
  });

  // OpenAI returns completion
  mockChatCreate.mockResolvedValue(happyCompletion);

  // logApiCall succeeds silently
  mockLogApiCall.mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// POST /api/autoapply/gpt4
// ===========================================================================
describe('POST /api/autoapply/gpt4', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../../autoapply/gpt4/route');
    POST = mod.POST;
  });

  // -----------------------------------------------------------------------
  // Input validation
  // -----------------------------------------------------------------------
  describe('input validation', () => {
    it('returns 400 when token is missing', async () => {
      const req = createRequest({ messages: [{ role: 'user', content: 'hi' }] });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('token required');
    });

    it('returns 400 when messages is missing', async () => {
      const req = createRequest({ token: MOCK_TOKEN });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('messages array required');
    });

    it('returns 400 when messages is not an array', async () => {
      const req = createRequest({ token: MOCK_TOKEN, messages: 'hello' });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('messages array required');
    });

    it('returns 400 when messages is an empty array', async () => {
      const req = createRequest({ token: MOCK_TOKEN, messages: [] });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('messages too large');
    });

    it('returns 400 when messages has more than 5 items', async () => {
      const msgs = Array.from({ length: 6 }, () => ({ role: 'user', content: 'x' }));
      const req = createRequest({ token: MOCK_TOKEN, messages: msgs });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('messages too large');
    });

    it('returns 400 when messages is exactly at max (5) items', async () => {
      // 5 items should be accepted (not rejected), so we need the rest of the flow
      setupHappyPath();
      const msgs = Array.from({ length: 5 }, () => ({ role: 'user', content: 'x' }));
      const req = createRequest({ token: MOCK_TOKEN, messages: msgs });
      const res = await POST(req);
      // Should NOT be 400 for "messages too large"
      expect(res.status).not.toBe(400);
    });

    it('returns 400 when message has invalid role', async () => {
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'admin', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid message role');
    });

    it('returns 400 when message role is missing (null message)', async () => {
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [null],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid message role');
    });

    it('returns 400 when message content is not a string', async () => {
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 123 }],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid message content');
    });

    it('returns 400 when a single message exceeds 30,000 chars', async () => {
      const longContent = 'a'.repeat(30_001);
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: longContent }],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('message too long');
    });

    it('returns 400 when total chars across messages exceeds 30,000', async () => {
      // 3 messages × 15,000 chars each = 45,000 total (over the 30,000 limit)
      const msgs = Array.from({ length: 3 }, () => ({
        role: 'user',
        content: 'a'.repeat(15_000),
      }));
      const req = createRequest({ token: MOCK_TOKEN, messages: msgs });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('payload too large');
    });

    it('accepts valid roles: user, assistant, system', async () => {
      setupHappyPath();
      const msgs = [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
        { role: 'system', content: 'you are helpful' },
      ];
      const req = createRequest({ token: MOCK_TOKEN, messages: msgs });
      const res = await POST(req);
      // Should pass validation (not 400)
      expect(res.status).not.toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // Token authentication
  // -----------------------------------------------------------------------
  describe('token authentication', () => {
    it('returns 401 when API token is not found', async () => {
      mockServiceFrom.mockReturnValue(
        chainableTokenLookup({ data: null, error: null })
      );
      const req = createRequest({
        token: 'invalid-token',
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid token');
    });

    it('returns 401 when token lookup has a database error', async () => {
      mockServiceFrom.mockReturnValue(
        chainableTokenLookup({ data: null, error: { message: 'DB failure' } })
      );
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid token');
    });
  });

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------
  describe('rate limiting', () => {
    it('returns 500 when rate limit check errors', async () => {
      mockServiceFrom.mockReturnValue(
        chainableTokenLookup({ data: { user_id: MOCK_USER_ID }, error: null })
      );
      const errorResponse = new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
      mockCheckRateLimit.mockResolvedValue({ data: null, error: errorResponse });

      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });

    it('returns 429 when rate limited', async () => {
      mockServiceFrom.mockReturnValue(
        chainableTokenLookup({ data: { user_id: MOCK_USER_ID }, error: null })
      );
      mockCheckRateLimit.mockResolvedValue({
        data: {
          allowed: false,
          hourly_count: 200,
          daily_count: 200,
          hourly_remaining: 0,
          daily_remaining: 800,
        },
        error: null,
      });
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
      mockRateLimitExceededResponse.mockReturnValue(rateLimitResponse);

      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(mockRateLimitExceededResponse).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Credit deduction
  // -----------------------------------------------------------------------
  describe('credit deduction', () => {
    it('returns 402 when credit deduction fails (insufficient credits)', async () => {
      mockServiceFrom.mockReturnValue(
        chainableTokenLookup({ data: { user_id: MOCK_USER_ID }, error: null })
      );
      mockCheckRateLimit.mockResolvedValue({ data: happyRateLimit, error: null });
      mockServiceRpc.mockResolvedValue({
        data: [{ success: false }],
        error: null,
      });

      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toBe('Insufficient credits');
    });

    it('returns 402 when credit deduction returns empty result', async () => {
      mockServiceFrom.mockReturnValue(
        chainableTokenLookup({ data: { user_id: MOCK_USER_ID }, error: null })
      );
      mockCheckRateLimit.mockResolvedValue({ data: happyRateLimit, error: null });
      mockServiceRpc.mockResolvedValue({ data: [], error: null });

      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(402);
    });

    it('returns 402 when credit deduction has a database error', async () => {
      mockServiceFrom.mockReturnValue(
        chainableTokenLookup({ data: { user_id: MOCK_USER_ID }, error: null })
      );
      mockCheckRateLimit.mockResolvedValue({ data: happyRateLimit, error: null });
      mockServiceRpc.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(402);
    });
  });

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------
  describe('successful response', () => {
    it('returns content, usage, model, and finish_reason on happy path', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'What is 2+2?' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.content).toBe('Hello from GPT!');
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.finish_reason).toBe('stop');
      expect(body.usage).toEqual({
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
        total_cost: expect.any(Number),
      });
    });

    it('calls OpenAI with gpt-4o-mini model', async () => {
      setupHappyPath();
      const msgs = [{ role: 'user', content: 'hello' }];
      const req = createRequest({ token: MOCK_TOKEN, messages: msgs });
      await POST(req);

      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o-mini' })
      );
    });

    it('deducts exactly 1 credit via use_credits RPC', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      await POST(req);

      // First rpc call is use_credits, second is update_token_usage
      expect(mockServiceRpc).toHaveBeenCalledWith('use_credits', {
        p_user_id: MOCK_USER_ID,
        p_amount: 1,
      });
    });

    it('logs the API call after successful OpenAI response', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      await POST(req);

      expect(mockLogApiCall).toHaveBeenCalledWith(MOCK_USER_ID, 'gpt4');
    });

    it('updates token usage stats after successful call', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      await POST(req);

      expect(mockServiceRpc).toHaveBeenCalledWith('update_token_usage', {
        p_token: MOCK_TOKEN,
        p_tokens_used: 30,
        p_cost_usd: expect.any(Number),
      });
    });

    it('adds rate limit headers to response', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      await POST(req);

      expect(mockAddRateLimitHeaders).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ endpoint: 'gpt4' }),
        happyRateLimit,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Temperature clamping
  // -----------------------------------------------------------------------
  describe('temperature clamping', () => {
    it('clamps temperature > 2 down to 2', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
        temperature: 5,
      });
      await POST(req);

      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 2 })
      );
    });

    it('clamps temperature < 0 up to 0', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
        temperature: -1,
      });
      await POST(req);

      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0 })
      );
    });

    it('defaults NaN temperature to 0.8', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
        temperature: 'not-a-number',
      });
      await POST(req);

      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.8 })
      );
    });

    it('passes valid temperature through unchanged', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
        temperature: 1.5,
      });
      await POST(req);

      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 1.5 })
      );
    });

    it('uses default temperature 0.8 when not provided', async () => {
      setupHappyPath();
      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      await POST(req);

      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.8 })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('returns 500 on generic error (e.g. OpenAI throws)', async () => {
      setupHappyPath();
      mockChatCreate.mockRejectedValue(new Error('OpenAI is down'));

      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal error');
    });

    it('does not leak internal error messages to the client', async () => {
      setupHappyPath();
      mockChatCreate.mockRejectedValue(new Error('secret internal detail'));

      const req = createRequest({
        token: MOCK_TOKEN,
        messages: [{ role: 'user', content: 'hi' }],
      });
      const res = await POST(req);
      const body = await res.json();
      expect(body.error).toBe('Internal error');
      expect(JSON.stringify(body)).not.toContain('secret internal detail');
    });
  });
});
