/**
 * Tests for POST /api/stripe/create-checkout
 *
 * Tests cover:
 * - Authentication enforcement
 * - Plan validation (missing, wrong type, unknown plan)
 * - Price verification via Stripe API
 * - Purchase record creation in database
 * - Stripe checkout session creation with correct params
 * - Idempotency key format
 * - Metadata correctness (purchase_id, user_id)
 * - Non-blocking DB update failure after session creation
 * - Generic error handling (500 catch-all)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Environment variables — must be set BEFORE module import
// ---------------------------------------------------------------------------
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_PRICE_CREDITS_250 = 'price_250';
process.env.STRIPE_PRICE_CREDITS_750 = 'price_750';
process.env.STRIPE_PRICE_CREDITS_1500 = 'price_1500';
process.env.NEXT_PUBLIC_APP_URL = 'https://www.jobelix.fr';

// ---------------------------------------------------------------------------
// Mock: @/lib/server/auth
// ---------------------------------------------------------------------------
import { authenticateRequest } from '@/lib/server/auth';
vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: vi.fn(),
}));
const mockAuthenticateRequest = vi.mocked(authenticateRequest);

// ---------------------------------------------------------------------------
// Mock: stripe npm package
// The route does `new Stripe(key)` so the default export must be a constructor.
// We use a regular function (not arrow) so it works with `new`.
// ---------------------------------------------------------------------------
const mockPricesRetrieve = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();

const mockStripeInstance = {
  prices: { retrieve: mockPricesRetrieve },
  checkout: { sessions: { create: mockCheckoutSessionsCreate } },
};

vi.mock('stripe', () => {
  // Must be a regular function (constructor-compatible)
  function MockStripe() {
    return mockStripeInstance;
  }
  return { default: MockStripe };
});

// ---------------------------------------------------------------------------
// Mock: supabaseService
// ---------------------------------------------------------------------------
const mockServiceFrom = vi.fn();

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({ from: mockServiceFrom })),
}));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MOCK_USER_ID = '00000000-1111-2222-3333-444444444444';
const MOCK_PURCHASE_ID = 'purchase-uuid-123';
const MOCK_SESSION_ID = 'cs_test_session_456';
const MOCK_SESSION_URL = 'https://checkout.stripe.com/pay/cs_test_session_456';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Set up authenticateRequest to return a valid user */
function mockAuthSuccess(userId: string = MOCK_USER_ID) {
  mockAuthenticateRequest.mockResolvedValue({
    user: { id: userId } as import('@supabase/supabase-js').User,
    supabase: {} as import('@supabase/supabase-js').SupabaseClient,
    error: null,
  });
}

/** Set up authenticateRequest to return an error */
function mockAuthFailure() {
  const { NextResponse } = require('next/server');
  mockAuthenticateRequest.mockResolvedValue({
    user: null,
    supabase: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  });
}

/**
 * Build a chainable `.from("credit_purchases").insert(...).select("id").single()`
 * or `.from("credit_purchases").update(...).eq("id", ...)`
 */
function chainableInsert(result: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  return chain;
}

function chainableUpdate(result: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockResolvedValue(result);
  return chain;
}

/**
 * Set up the full happy-path mocks.
 * - Auth succeeds
 * - prices.retrieve succeeds (called twice: validation + price fetch)
 * - DB insert succeeds
 * - Stripe session creation succeeds
 * - DB update succeeds
 */
function setupHappyPathMocks(plan: string = 'credits_250') {
  mockAuthSuccess();

  // prices.retrieve is called TWICE:
  //   1) Validation check (line 127)
  //   2) Fetch price details for audit trail (line 152)
  mockPricesRetrieve.mockResolvedValue({
    id: `price_${plan.split('_')[1]}`,
    unit_amount: 999,
    currency: 'eur',
  });

  // DB insert: create purchase record
  const insertChain = chainableInsert({
    data: { id: MOCK_PURCHASE_ID },
    error: null,
  });

  // DB update: store session ID on purchase record
  const updateChain = chainableUpdate({
    data: null,
    error: null,
  });

  let fromCallCount = 0;
  mockServiceFrom.mockImplementation(() => {
    fromCallCount++;
    if (fromCallCount === 1) return insertChain;
    return updateChain;
  });

  // Stripe checkout session creation
  mockCheckoutSessionsCreate.mockResolvedValue({
    id: MOCK_SESSION_ID,
    url: MOCK_SESSION_URL,
  });
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// POST /api/stripe/create-checkout
// ===========================================================================
describe('POST /api/stripe/create-checkout', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../create-checkout/route');
    POST = mod.POST;
  });

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------
  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuthFailure();

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('calls authenticateRequest', async () => {
      mockAuthFailure();

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      expect(mockAuthenticateRequest).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Plan validation
  // -----------------------------------------------------------------------
  describe('plan validation', () => {
    it('returns 400 when plan is missing from body', async () => {
      mockAuthSuccess();

      const req = createJsonRequest({});
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing or invalid plan');
    });

    it('returns 400 when plan is null', async () => {
      mockAuthSuccess();

      const req = createJsonRequest({ plan: null });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing or invalid plan');
    });

    it('returns 400 when plan is not a string (number)', async () => {
      mockAuthSuccess();

      const req = createJsonRequest({ plan: 250 });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing or invalid plan');
    });

    it('returns 400 when plan is not a string (boolean)', async () => {
      mockAuthSuccess();

      const req = createJsonRequest({ plan: true });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing or invalid plan');
    });

    it('returns 400 when plan is an empty string', async () => {
      mockAuthSuccess();

      const req = createJsonRequest({ plan: '' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing or invalid plan');
    });

    it('returns 400 for unknown plan (credits_9999)', async () => {
      mockAuthSuccess();

      const req = createJsonRequest({ plan: 'credits_9999' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid plan configuration');
    });

    it('returns 400 for plan with valid-looking name but not in whitelist', async () => {
      mockAuthSuccess();

      const req = createJsonRequest({ plan: 'credits_100' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Invalid plan configuration');
    });
  });

  // -----------------------------------------------------------------------
  // Price verification (stripe.prices.retrieve)
  // -----------------------------------------------------------------------
  describe('price verification', () => {
    it('returns 400 when stripe.prices.retrieve throws (invalid price config)', async () => {
      mockAuthSuccess();
      mockPricesRetrieve.mockRejectedValue(new Error('No such price'));

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid payment configuration');
    });

    it('calls stripe.prices.retrieve with the correct price ID for credits_250', async () => {
      mockAuthSuccess();
      mockPricesRetrieve.mockRejectedValue(new Error('test'));

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      expect(mockPricesRetrieve).toHaveBeenCalledWith('price_250');
    });

    it('calls stripe.prices.retrieve with the correct price ID for credits_750', async () => {
      mockAuthSuccess();
      mockPricesRetrieve.mockRejectedValue(new Error('test'));

      const req = createJsonRequest({ plan: 'credits_750' });
      await POST(req);

      expect(mockPricesRetrieve).toHaveBeenCalledWith('price_750');
    });

    it('calls stripe.prices.retrieve with the correct price ID for credits_1500', async () => {
      mockAuthSuccess();
      mockPricesRetrieve.mockRejectedValue(new Error('test'));

      const req = createJsonRequest({ plan: 'credits_1500' });
      await POST(req);

      expect(mockPricesRetrieve).toHaveBeenCalledWith('price_1500');
    });
  });

  // -----------------------------------------------------------------------
  // Purchase record creation
  // -----------------------------------------------------------------------
  describe('purchase record creation', () => {
    it('returns 500 when purchase record insert fails', async () => {
      mockAuthSuccess();

      // prices.retrieve succeeds (both calls)
      mockPricesRetrieve.mockResolvedValue({
        id: 'price_250',
        unit_amount: 999,
        currency: 'eur',
      });

      // DB insert fails
      const insertChain = chainableInsert({
        data: null,
        error: { message: 'Insert failed', code: '23505' },
      });
      mockServiceFrom.mockReturnValue(insertChain);

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Failed to create purchase record');
    });

    it('returns 500 when purchase record insert returns no data', async () => {
      mockAuthSuccess();

      mockPricesRetrieve.mockResolvedValue({
        id: 'price_250',
        unit_amount: 999,
        currency: 'eur',
      });

      // DB insert returns null data without error
      const insertChain = chainableInsert({
        data: null,
        error: null,
      });
      mockServiceFrom.mockReturnValue(insertChain);

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Failed to create purchase record');
    });

    it('inserts purchase record with correct fields', async () => {
      setupHappyPathMocks('credits_750');

      const req = createJsonRequest({ plan: 'credits_750' });
      await POST(req);

      // First call to from() is the insert
      expect(mockServiceFrom).toHaveBeenCalledWith('credit_purchases');

      // Get the insert chain from the first from() call
      const insertChain = mockServiceFrom.mock.results[0].value;
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: MOCK_USER_ID,
          credits_amount: 750,
          status: 'pending',
        }),
      );
    });

    it('inserts purchase record with price_cents and currency from Stripe', async () => {
      setupHappyPathMocks();

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      const insertChain = mockServiceFrom.mock.results[0].value;
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          price_cents: 999,
          currency: 'eur',
        }),
      );
    });

    it('defaults price_cents to 0 and currency to usd when price fetch fails', async () => {
      mockAuthSuccess();

      // First call: validation succeeds
      // Second call: price detail fetch fails
      let priceCallCount = 0;
      mockPricesRetrieve.mockImplementation(() => {
        priceCallCount++;
        if (priceCallCount === 1) {
          return Promise.resolve({ id: 'price_250', unit_amount: 999, currency: 'eur' });
        }
        return Promise.reject(new Error('Stripe error'));
      });

      const insertChain = chainableInsert({
        data: { id: MOCK_PURCHASE_ID },
        error: null,
      });
      const updateChain = chainableUpdate({ data: null, error: null });

      let fromCallCount = 0;
      mockServiceFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return insertChain;
        return updateChain;
      });

      mockCheckoutSessionsCreate.mockResolvedValue({
        id: MOCK_SESSION_ID,
        url: MOCK_SESSION_URL,
      });

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      // Should still succeed — price fetch failure is non-fatal
      expect(res.status).toBe(200);

      // Verify defaults were used
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          price_cents: 0,
          currency: 'usd',
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Stripe checkout session creation
  // -----------------------------------------------------------------------
  describe('checkout session creation', () => {
    it('returns sessionId and url on happy path', async () => {
      setupHappyPathMocks();

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        sessionId: MOCK_SESSION_ID,
        url: MOCK_SESSION_URL,
      });
    });

    it('creates checkout session with correct line items', async () => {
      setupHappyPathMocks();

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [{ price: 'price_250', quantity: 1 }],
        }),
        expect.any(Object),
      );
    });

    it('creates checkout session with correct success and cancel URLs', async () => {
      setupHappyPathMocks();

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('https://www.jobelix.fr/dashboard'),
          cancel_url: expect.stringContaining('https://www.jobelix.fr/dashboard'),
        }),
        expect.any(Object),
      );
    });

    it('includes purchase_id and user_id in session metadata', async () => {
      setupHappyPathMocks();

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            purchase_id: String(MOCK_PURCHASE_ID),
            user_id: MOCK_USER_ID,
          }),
        }),
        expect.any(Object),
      );
    });

    it('uses idempotency key format purchase_${purchaseId}', async () => {
      setupHappyPathMocks();

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          idempotencyKey: `purchase_${MOCK_PURCHASE_ID}`,
        }),
      );
    });

    it('sets session expires_at to approximately 30 minutes from now', async () => {
      setupHappyPathMocks();

      const now = Math.floor(Date.now() / 1000);
      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      const sessionConfig = mockCheckoutSessionsCreate.mock.calls[0][0];
      // Should be within ~5 seconds of expected value
      expect(sessionConfig.expires_at).toBeGreaterThanOrEqual(now + 30 * 60 - 5);
      expect(sessionConfig.expires_at).toBeLessThanOrEqual(now + 30 * 60 + 5);
    });

    it('sets locale to "en"', async () => {
      setupHappyPathMocks();

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'en' }),
        expect.any(Object),
      );
    });
  });

  // -----------------------------------------------------------------------
  // DB update after session creation (non-blocking)
  // -----------------------------------------------------------------------
  describe('DB update after session creation', () => {
    it('updates purchase record with stripe session ID', async () => {
      setupHappyPathMocks();

      const req = createJsonRequest({ plan: 'credits_250' });
      await POST(req);

      // Second from() call is the update
      expect(mockServiceFrom).toHaveBeenCalledTimes(2);
      const updateChain = mockServiceFrom.mock.results[1].value;
      expect(updateChain.update).toHaveBeenCalledWith({
        stripe_checkout_session_id: MOCK_SESSION_ID,
      });
      expect(updateChain.eq).toHaveBeenCalledWith('id', MOCK_PURCHASE_ID);
    });

    it('still returns success when DB update after session creation fails', async () => {
      mockAuthSuccess();

      mockPricesRetrieve.mockResolvedValue({
        id: 'price_250',
        unit_amount: 999,
        currency: 'eur',
      });

      // Insert succeeds
      const insertChain = chainableInsert({
        data: { id: MOCK_PURCHASE_ID },
        error: null,
      });

      // Update fails (non-blocking)
      const updateChain = chainableUpdate({
        data: null,
        error: { message: 'Update failed', code: '99999' },
      });

      let fromCallCount = 0;
      mockServiceFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return insertChain;
        return updateChain;
      });

      mockCheckoutSessionsCreate.mockResolvedValue({
        id: MOCK_SESSION_ID,
        url: MOCK_SESSION_URL,
      });

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      // Should still return success
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        sessionId: MOCK_SESSION_ID,
        url: MOCK_SESSION_URL,
      });
    });
  });

  // -----------------------------------------------------------------------
  // All three valid plans
  // -----------------------------------------------------------------------
  describe('all valid plans', () => {
    it.each([
      { plan: 'credits_250', priceId: 'price_250', credits: 250 },
      { plan: 'credits_750', priceId: 'price_750', credits: 750 },
      { plan: 'credits_1500', priceId: 'price_1500', credits: 1500 },
    ])('returns success for $plan with $credits credits', async ({ plan, priceId }) => {
      setupHappyPathMocks(plan);

      const req = createJsonRequest({ plan });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sessionId).toBe(MOCK_SESSION_ID);
      expect(json.url).toBe(MOCK_SESSION_URL);

      // Verify correct price ID was used
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: priceId, quantity: 1 }],
        }),
        expect.any(Object),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('returns 500 on unexpected error during checkout session creation', async () => {
      mockAuthSuccess();

      mockPricesRetrieve.mockResolvedValue({
        id: 'price_250',
        unit_amount: 999,
        currency: 'eur',
      });

      const insertChain = chainableInsert({
        data: { id: MOCK_PURCHASE_ID },
        error: null,
      });
      mockServiceFrom.mockReturnValue(insertChain);

      // Stripe session creation throws unexpected error
      mockCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe network error'));

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Failed to create checkout session');
    });

    it('returns 500 when an unexpected error occurs before Stripe calls', async () => {
      // Simulate authenticateRequest throwing unexpectedly
      mockAuthenticateRequest.mockRejectedValue(new Error('Unexpected auth crash'));

      const req = createJsonRequest({ plan: 'credits_250' });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Failed to create checkout session');
    });

    it('returns 500 when request body JSON parsing fails', async () => {
      mockAuthSuccess();

      // Create a request with invalid JSON
      const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Failed to create checkout session');
    });
  });
});
