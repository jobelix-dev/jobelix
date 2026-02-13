/**
 * Security Tests: Stripe Payment Security
 *
 * Tests for:
 * - Webhook signature forgery / missing signature
 * - Replay attacks via 3-layer idempotency
 * - Price tampering (unknown price IDs, missing metadata)
 * - RPC failure handling
 * - Checkout session auth enforcement
 * - Plan whitelist validation
 * - Redirect URL safety (APP_ORIGIN, not request headers)
 * - Idempotency key usage in checkout creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Env vars — set BEFORE any route imports so module-level code picks them up
// ---------------------------------------------------------------------------
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.STRIPE_PRICE_CREDITS_250 = 'price_250';
process.env.STRIPE_PRICE_CREDITS_750 = 'price_750';
process.env.STRIPE_PRICE_CREDITS_1500 = 'price_1500';
process.env.NEXT_PUBLIC_APP_URL = 'https://www.jobelix.fr';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Auth mock
const mockAuthenticateRequest = vi.fn();
vi.mock('@/lib/server/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
}));

// Service supabase mock
const mockServiceRpc = vi.fn();
const mockServiceFromSelect = vi.fn();
const mockServiceFromInsert = vi.fn();
const mockServiceFromUpdate = vi.fn();
const mockServiceFrom = vi.fn().mockImplementation(() => {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation(() => ({
        maybeSingle: mockServiceFromSelect,
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockServiceFromSelect,
        }),
      })),
    }),
    insert: vi.fn().mockImplementation((data: unknown) => {
      mockServiceFromInsert(data);
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'purchase-123' }, error: null }),
        }),
      };
    }),
    update: vi.fn().mockImplementation((data: unknown) => {
      mockServiceFromUpdate(data);
      return {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  };
});

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => ({
    rpc: mockServiceRpc,
    from: mockServiceFrom,
  })),
}));

// Stripe mock — MUST use regular function (not arrow) for `new Stripe()`
const mockConstructEvent = vi.fn();
const mockListLineItems = vi.fn();
const mockPricesRetrieve = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();

vi.mock('stripe', () => ({
  default: function MockStripe() {
    return {
      webhooks: { constructEvent: mockConstructEvent },
      checkout: {
        sessions: {
          listLineItems: mockListLineItems,
          create: mockCheckoutSessionsCreate,
        },
      },
      prices: { retrieve: mockPricesRetrieve },
    };
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWebhookRequest(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
  if (signature !== undefined) {
    headers['stripe-signature'] = signature;
  }
  return new NextRequest('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

function createCheckoutRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function authSuccess(userId = 'user-123') {
  const mockChain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  mockAuthenticateRequest.mockResolvedValue({
    user: { id: userId, email: `${userId}@test.com` },
    supabase: mockChain,
    error: null,
  });
  return mockChain;
}

function authFailure() {
  const { NextResponse } = require('next/server');
  mockAuthenticateRequest.mockResolvedValue({
    user: null,
    supabase: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  });
}

const validEvent = {
  id: 'evt_123',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_123',
      payment_status: 'paid',
      payment_intent: 'pi_123',
      metadata: { user_id: 'user-123' },
      amount_total: 999,
      currency: 'usd',
    },
  },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Stripe Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // WEBHOOK — Signature Verification
  // =========================================================================
  describe('Webhook — Signature verification', () => {
    let webhookPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/webhook/route');
      webhookPOST = mod.POST;
    });

    it('1. rejects requests with missing stripe-signature header (400)', async () => {
      const req = createWebhookRequest('{}');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Missing signature');
      expect(mockConstructEvent).not.toHaveBeenCalled();
    });

    it('2. rejects requests with forged/invalid signature (400)', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      const req = createWebhookRequest('{"forged": true}', 'sig_forged');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Invalid signature');
    });

    it('3. accepts requests with valid signature and processes event', async () => {
      mockConstructEvent.mockReturnValue(validEvent);
      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_250' } }],
      });
      // Layer 1: no existing event
      mockServiceFromSelect
        .mockResolvedValueOnce({ data: null })
        // Layer 2: no existing completed session
        .mockResolvedValueOnce({ data: null })
        // Layer 3: pending purchase exists
        .mockResolvedValueOnce({ data: { id: 'purchase-1', status: 'pending', user_id: 'user-123' } });
      mockServiceRpc.mockResolvedValue({ data: [{ success: true }], error: null });

      const req = createWebhookRequest('valid-body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).toHaveBeenCalledWith(
        'add_purchased_credits',
        expect.objectContaining({
          p_user_id: 'user-123',
          p_credits_amount: 250,
        }),
      );
    });
  });

  // =========================================================================
  // WEBHOOK — Replay Attacks (Idempotency)
  // =========================================================================
  describe('Webhook — Replay attacks (idempotency)', () => {
    let webhookPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/webhook/route');
      webhookPOST = mod.POST;
      mockConstructEvent.mockReturnValue(validEvent);
      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_250' } }],
      });
    });

    it('4. duplicate event ID — returns received:true without double-crediting', async () => {
      // Layer 1: event already processed
      mockServiceFromSelect.mockResolvedValueOnce({
        data: { id: 'purchase-1', status: 'completed' },
      });

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    it('5. duplicate session ID (already completed) — returns received:true', async () => {
      // Layer 1: no event match
      mockServiceFromSelect.mockResolvedValueOnce({ data: null });
      // Layer 2: session already completed
      mockServiceFromSelect.mockResolvedValueOnce({
        data: { id: 'purchase-1', status: 'completed' },
      });

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    it('6. no pending purchase found for session — returns received:true without crediting', async () => {
      // Layer 1: no event match
      mockServiceFromSelect.mockResolvedValueOnce({ data: null });
      // Layer 2: no completed session
      mockServiceFromSelect.mockResolvedValueOnce({ data: null });
      // Layer 3: no pending purchase
      mockServiceFromSelect.mockResolvedValueOnce({ data: null });

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    it('7. pending purchase already completed — returns received:true', async () => {
      // Layer 1: no event match
      mockServiceFromSelect.mockResolvedValueOnce({ data: null });
      // Layer 2: no completed session by session+status query
      mockServiceFromSelect.mockResolvedValueOnce({ data: null });
      // Layer 3: purchase exists but already completed
      mockServiceFromSelect.mockResolvedValueOnce({
        data: { id: 'purchase-1', status: 'completed', user_id: 'user-123' },
      });

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // WEBHOOK — Price Tampering
  // =========================================================================
  describe('Webhook — Price tampering', () => {
    let webhookPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/webhook/route');
      webhookPOST = mod.POST;
    });

    it('8. unknown/invalid price ID not in PRICE_TO_CREDITS — returns received:true without crediting', async () => {
      const event = {
        ...validEvent,
        id: 'evt_unknown_price',
      };
      mockConstructEvent.mockReturnValue(event);
      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_evil_9999' } }],
      });

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    it('9. metadata user_id missing — returns received:true without crediting', async () => {
      const event = {
        ...validEvent,
        id: 'evt_no_user',
        data: {
          object: {
            ...validEvent.data.object,
            metadata: {}, // no user_id
          },
        },
      };
      mockConstructEvent.mockReturnValue(event);

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockListLineItems).not.toHaveBeenCalled();
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    it('10. payment_status !== "paid" — returns received:true without crediting', async () => {
      const event = {
        ...validEvent,
        id: 'evt_unpaid',
        data: {
          object: {
            ...validEvent.data.object,
            payment_status: 'unpaid',
          },
        },
      };
      mockConstructEvent.mockReturnValue(event);

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockListLineItems).not.toHaveBeenCalled();
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    it('11. line items fetch failure — returns received:true without crediting', async () => {
      mockConstructEvent.mockReturnValue(validEvent);
      mockListLineItems.mockRejectedValue(new Error('Stripe API error'));

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // WEBHOOK — Event Type Handling
  // =========================================================================
  describe('Webhook — Event type handling', () => {
    let webhookPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/webhook/route');
      webhookPOST = mod.POST;
    });

    it('12. checkout.session.completed with valid data — processes and adds credits', async () => {
      mockConstructEvent.mockReturnValue(validEvent);
      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_750' } }],
      });
      // All 3 idempotency layers pass
      mockServiceFromSelect
        .mockResolvedValueOnce({ data: null }) // Layer 1
        .mockResolvedValueOnce({ data: null }) // Layer 2
        .mockResolvedValueOnce({ data: { id: 'purchase-1', status: 'pending', user_id: 'user-123' } }); // Layer 3
      mockServiceRpc.mockResolvedValue({ data: [{ success: true }], error: null });

      const req = createWebhookRequest('valid-body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).toHaveBeenCalledWith(
        'add_purchased_credits',
        expect.objectContaining({
          p_user_id: 'user-123',
          p_credits_amount: 750,
          p_payment_intent_id: 'pi_123',
          p_stripe_event_id: 'evt_123',
          p_session_id: 'cs_123',
          p_amount_cents: 999,
          p_currency: 'usd',
        }),
      );
    });

    it('13. payment_intent.payment_failed — updates purchase status to failed', async () => {
      const failedEvent = {
        id: 'evt_fail',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_failed_123',
          },
        },
      };
      mockConstructEvent.mockReturnValue(failedEvent);

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceFromUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          stripe_event_id: 'evt_fail',
        }),
      );
    });

    it('14. unknown event type — returns received:true (acknowledged)', async () => {
      const unknownEvent = {
        id: 'evt_unknown',
        type: 'customer.subscription.updated',
        data: { object: {} },
      };
      mockConstructEvent.mockReturnValue(unknownEvent);

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
      expect(mockServiceFromUpdate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // WEBHOOK — RPC Failure
  // =========================================================================
  describe('Webhook — RPC failure', () => {
    let webhookPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/webhook/route');
      webhookPOST = mod.POST;
    });

    it('15. add_purchased_credits RPC error — returns 500', async () => {
      mockConstructEvent.mockReturnValue(validEvent);
      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_250' } }],
      });
      // All 3 idempotency layers pass
      mockServiceFromSelect
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: { id: 'purchase-1', status: 'pending', user_id: 'user-123' } });
      mockServiceRpc.mockResolvedValue({ data: null, error: { message: 'DB connection failed' } });

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Failed to add credits');
    });
  });

  // =========================================================================
  // CREATE CHECKOUT — Authentication
  // =========================================================================
  describe('Create Checkout — Authentication', () => {
    let checkoutPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/create-checkout/route');
      checkoutPOST = mod.POST;
    });

    it('16. unauthenticated request — returns 401', async () => {
      authFailure();

      const req = createCheckoutRequest({ plan: 'credits_250' });
      const res = await checkoutPOST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
      expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
    });

    it('17. authenticated request — proceeds to plan validation', async () => {
      authSuccess();
      mockPricesRetrieve.mockResolvedValue({ id: 'price_250', unit_amount: 499, currency: 'usd' });
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_new', url: 'https://checkout.stripe.com/test' });

      const req = createCheckoutRequest({ plan: 'credits_250' });
      const res = await checkoutPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.url).toBe('https://checkout.stripe.com/test');
    });
  });

  // =========================================================================
  // CREATE CHECKOUT — Plan Validation
  // =========================================================================
  describe('Create Checkout — Plan validation', () => {
    let checkoutPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/create-checkout/route');
      checkoutPOST = mod.POST;
      authSuccess();
    });

    it('18. missing plan — returns 400', async () => {
      const req = createCheckoutRequest({});
      const res = await checkoutPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Missing or invalid plan');
    });

    it('19. invalid plan name (e.g. "credits_9999") — returns 400', async () => {
      const req = createCheckoutRequest({ plan: 'credits_9999' });
      const res = await checkoutPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Invalid plan configuration');
    });

    it('20. plan is not a string (number) — returns 400', async () => {
      const req = createCheckoutRequest({ plan: 42 });
      const res = await checkoutPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Missing or invalid plan');
    });

    it('21. valid plan "credits_250" — creates checkout session', async () => {
      mockPricesRetrieve.mockResolvedValue({ id: 'price_250', unit_amount: 499, currency: 'usd' });
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_250', url: 'https://checkout.stripe.com/250' });

      const req = createCheckoutRequest({ plan: 'credits_250' });
      const res = await checkoutPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.sessionId).toBe('cs_250');
      expect(json.url).toBe('https://checkout.stripe.com/250');
    });
  });

  // =========================================================================
  // CREATE CHECKOUT — Price Verification
  // =========================================================================
  describe('Create Checkout — Price verification', () => {
    let checkoutPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/create-checkout/route');
      checkoutPOST = mod.POST;
      authSuccess();
    });

    it('22. Stripe price not found — returns 400', async () => {
      mockPricesRetrieve.mockRejectedValue(new Error('No such price: price_250'));

      const req = createCheckoutRequest({ plan: 'credits_250' });
      const res = await checkoutPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Invalid payment configuration');
    });
  });

  // =========================================================================
  // CREATE CHECKOUT — URL Safety
  // =========================================================================
  describe('Create Checkout — URL safety', () => {
    let checkoutPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/create-checkout/route');
      checkoutPOST = mod.POST;
      authSuccess();
      mockPricesRetrieve.mockResolvedValue({ id: 'price_250', unit_amount: 499, currency: 'usd' });
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_url', url: 'https://checkout.stripe.com/url' });
    });

    it('23. redirect URLs use APP_ORIGIN from env, not request origin/referer', async () => {
      // Create request with a malicious origin header
      const req = new NextRequest('http://localhost:3000/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://evil-site.com',
          'Referer': 'https://evil-site.com/steal',
        },
        body: JSON.stringify({ plan: 'credits_250' }),
      });

      await checkoutPOST(req);

      expect(mockCheckoutSessionsCreate).toHaveBeenCalled();
      const createCallArgs = mockCheckoutSessionsCreate.mock.calls[0][0];
      // Verify URLs use the safe APP_ORIGIN, not the attacker's origin
      expect(createCallArgs.success_url).toContain('https://www.jobelix.fr');
      expect(createCallArgs.cancel_url).toContain('https://www.jobelix.fr');
      expect(createCallArgs.success_url).not.toContain('evil-site.com');
      expect(createCallArgs.cancel_url).not.toContain('evil-site.com');
    });
  });

  // =========================================================================
  // CREATE CHECKOUT — Idempotency
  // =========================================================================
  describe('Create Checkout — Idempotency', () => {
    let checkoutPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/create-checkout/route');
      checkoutPOST = mod.POST;
      authSuccess();
      mockPricesRetrieve.mockResolvedValue({ id: 'price_250', unit_amount: 499, currency: 'usd' });
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_idem', url: 'https://checkout.stripe.com/idem' });
    });

    it('24. purchase DB record is created before Stripe session', async () => {
      const insertCallOrder: string[] = [];

      mockServiceFromInsert.mockImplementation(() => {
        insertCallOrder.push('db_insert');
      });
      mockCheckoutSessionsCreate.mockImplementation(() => {
        insertCallOrder.push('stripe_create');
        return { id: 'cs_idem', url: 'https://checkout.stripe.com/idem' };
      });

      const req = createCheckoutRequest({ plan: 'credits_250' });
      await checkoutPOST(req);

      expect(insertCallOrder.indexOf('db_insert')).toBeLessThan(
        insertCallOrder.indexOf('stripe_create'),
      );
    });

    it('25. idempotencyKey uses purchase_id', async () => {
      const req = createCheckoutRequest({ plan: 'credits_250' });
      await checkoutPOST(req);

      expect(mockCheckoutSessionsCreate).toHaveBeenCalled();
      const options = mockCheckoutSessionsCreate.mock.calls[0][1];
      expect(options.idempotencyKey).toBe('purchase_purchase-123');
    });
  });

  // =========================================================================
  // WEBHOOK — Additional edge cases
  // =========================================================================
  describe('Webhook — Edge cases', () => {
    let webhookPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/webhook/route');
      webhookPOST = mod.POST;
    });

    it('26. line items with no price object (string price) — returns received:true without crediting', async () => {
      mockConstructEvent.mockReturnValue(validEvent);
      // Line item has price as a string (not expanded), so first.price is a string
      mockListLineItems.mockResolvedValue({
        data: [{ price: 'price_250' }], // string, not object
      });

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    it('27. empty line items array — returns received:true without crediting', async () => {
      mockConstructEvent.mockReturnValue(validEvent);
      mockListLineItems.mockResolvedValue({ data: [] });

      const req = createWebhookRequest('body', 'sig_valid');
      const res = await webhookPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    it('28. constructEvent receives raw body text, not parsed JSON', async () => {
      const rawBody = '{"raw":"webhook-payload"}';
      mockConstructEvent.mockReturnValue({
        id: 'evt_raw',
        type: 'unknown.event',
        data: { object: {} },
      });

      const req = createWebhookRequest(rawBody, 'sig_raw');
      await webhookPOST(req);

      // Verify constructEvent was called with the raw string, not parsed object
      expect(mockConstructEvent).toHaveBeenCalledWith(
        rawBody,
        'sig_raw',
        'whsec_test_fake',
      );
    });
  });

  // =========================================================================
  // CREATE CHECKOUT — Additional edge cases
  // =========================================================================
  describe('Create Checkout — Edge cases', () => {
    let checkoutPOST: (req: NextRequest) => Promise<Response>;

    beforeEach(async () => {
      const mod = await import('@/app/api/stripe/create-checkout/route');
      checkoutPOST = mod.POST;
      authSuccess();
    });

    it('29. plan as array — returns 400', async () => {
      const req = createCheckoutRequest({ plan: ['credits_250'] });
      const res = await checkoutPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Missing or invalid plan');
    });

    it('30. checkout session metadata includes user_id but NOT credits amount', async () => {
      mockPricesRetrieve.mockResolvedValue({ id: 'price_1500', unit_amount: 1999, currency: 'usd' });
      mockCheckoutSessionsCreate.mockResolvedValue({ id: 'cs_meta', url: 'https://checkout.stripe.com/meta' });

      const req = createCheckoutRequest({ plan: 'credits_1500' });
      await checkoutPOST(req);

      const sessionArgs = mockCheckoutSessionsCreate.mock.calls[0][0];
      // Should include user_id for webhook reference
      expect(sessionArgs.metadata.user_id).toBe('user-123');
      // Should NOT include credits_amount (webhook validates from Stripe source of truth)
      expect(sessionArgs.metadata.credits_amount).toBeUndefined();
      expect(sessionArgs.metadata.price).toBeUndefined();
    });
  });
});
