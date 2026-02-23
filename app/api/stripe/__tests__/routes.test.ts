/**
 * Comprehensive tests for Stripe API routes
 *
 * Tests cover:
 * - POST /api/stripe/webhook  (Stripe webhook handler)
 *   - Signature verification
 *   - checkout.session.completed (full credit flow)
 *   - payment_intent.payment_failed
 *   - Idempotency layers (duplicate events, duplicate sessions, missing pending purchase)
 *   - Unknown price IDs, missing metadata, edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Environment variables — must be set BEFORE module import
// ---------------------------------------------------------------------------
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.STRIPE_PRICE_CREDITS_250 = 'price_250';
process.env.STRIPE_PRICE_CREDITS_750 = 'price_750';
process.env.STRIPE_PRICE_CREDITS_1500 = 'price_1500';

// ---------------------------------------------------------------------------
// Mock: stripe npm package
// The route does `new Stripe(key)` so the default export must be a constructor.
// We use a regular function (not arrow) so it works with `new`.
// ---------------------------------------------------------------------------
const mockConstructEvent = vi.fn();
const mockListLineItems = vi.fn();

const mockStripeInstance = {
  webhooks: {
    constructEvent: mockConstructEvent,
  },
  checkout: {
    sessions: {
      listLineItems: mockListLineItems,
    },
  },
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
const mockServiceRpc = vi.fn();

const mockServiceSupabaseClient = {
  from: mockServiceFrom,
  rpc: mockServiceRpc,
};

vi.mock('@/lib/server/supabaseService', () => ({
  getServiceSupabase: vi.fn(() => mockServiceSupabaseClient),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER_ID = '00000000-1111-2222-3333-444444444444';
const MOCK_SESSION_ID = 'cs_test_session_123';
const MOCK_EVENT_ID = 'evt_test_event_123';
const MOCK_PAYMENT_INTENT_ID = 'pi_test_intent_123';

function createWebhookRequest(body: string, signature: string = 'valid_sig'): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature,
    },
  });
}

/** Build a checkout.session.completed Stripe event */
function makeCheckoutEvent(overrides?: {
  paymentStatus?: string;
  userId?: string | null;
  sessionId?: string;
  eventId?: string;
  paymentIntentId?: string;
  amountTotal?: number | null;
  currency?: string | null;
}) {
  const o = overrides ?? {};
  return {
    id: o.eventId ?? MOCK_EVENT_ID,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: o.sessionId ?? MOCK_SESSION_ID,
        payment_status: o.paymentStatus ?? 'paid',
        payment_intent: o.paymentIntentId ?? MOCK_PAYMENT_INTENT_ID,
        amount_total: o.amountTotal !== undefined ? o.amountTotal : 999,
        currency: o.currency !== undefined ? o.currency : 'usd',
        metadata: {
          ...(o.userId !== null ? { user_id: o.userId ?? MOCK_USER_ID } : {}),
        },
      },
    },
  };
}

/** Build a payment_intent.payment_failed Stripe event */
function makePaymentFailedEvent(paymentIntentId?: string) {
  return {
    id: MOCK_EVENT_ID,
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: paymentIntentId ?? MOCK_PAYMENT_INTENT_ID,
      },
    },
  };
}

/** Build a chainable `.from().select().eq().maybeSingle()` mock */
function chainable(result: { data: unknown; error: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.update = vi.fn().mockReturnValue(chain);
  return chain;
}

/** Configure the default happy-path mocks for checkout.session.completed */
function setupHappyPathMocks() {
  // Line items return price_250
  mockListLineItems.mockResolvedValue({
    data: [{ price: { id: 'price_250' } }],
  });

  // Idempotency layer 1: no existing event
  const layer1Chain = chainable({ data: null, error: null });
  // Idempotency layer 2: no completed session
  const layer2Chain = chainable({ data: null, error: null });
  // Idempotency layer 3: pending purchase found
  const layer3Chain = chainable({
    data: { id: 'purchase_1', status: 'pending', user_id: MOCK_USER_ID },
    error: null,
  });

  let callCount = 0;
  mockServiceFrom.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return layer1Chain;
    if (callCount === 2) return layer2Chain;
    if (callCount === 3) return layer3Chain;
    return layer1Chain;
  });

  // RPC add_purchased_credits succeeds
  mockServiceRpc.mockResolvedValue({
    data: [{ success: true, error_message: null }],
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// POST /api/stripe/webhook
// ===========================================================================
describe('POST /api/stripe/webhook', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import('../webhook/route');
    POST = mod.POST;
  });

  // -----------------------------------------------------------------------
  // Signature verification
  // -----------------------------------------------------------------------
  describe('signature verification', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Missing signature' });
    });

    it('returns 400 when webhook signature is invalid', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Webhook signature verification failed');
      });

      const req = createWebhookRequest('{}', 'invalid_sig');
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Invalid signature' });
    });

    it('passes body, signature, and secret to constructEvent', async () => {
      const body = '{"test":"payload"}';
      const sig = 'sig_header_value';

      mockConstructEvent.mockReturnValue({
        id: 'evt_1',
        type: 'unknown.event',
        data: { object: {} },
      });

      const req = createWebhookRequest(body, sig);
      await POST(req);

      expect(mockConstructEvent).toHaveBeenCalledWith(
        body,
        sig,
        'whsec_test_fake',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Unknown / unhandled event types
  // -----------------------------------------------------------------------
  describe('unhandled event types', () => {
    it('returns { received: true } for unknown event types', async () => {
      mockConstructEvent.mockReturnValue({
        id: 'evt_1',
        type: 'customer.subscription.created',
        data: { object: {} },
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
    });
  });

  // -----------------------------------------------------------------------
  // checkout.session.completed
  // -----------------------------------------------------------------------
  describe('checkout.session.completed', () => {
    it('successfully adds credits on valid payment', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);
      setupHappyPathMocks();

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      // Verify RPC was called with correct params
      expect(mockServiceRpc).toHaveBeenCalledWith('add_purchased_credits', {
        p_user_id: MOCK_USER_ID,
        p_credits_amount: 250,
        p_payment_intent_id: MOCK_PAYMENT_INTENT_ID,
        p_stripe_event_id: MOCK_EVENT_ID,
        p_session_id: MOCK_SESSION_ID,
        p_amount_cents: 999,
        p_currency: 'usd',
      });
    });

    it('adds 750 credits for price_750', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);
      setupHappyPathMocks();

      // Override line items to return price_750
      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_750' } }],
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(mockServiceRpc).toHaveBeenCalledWith(
        'add_purchased_credits',
        expect.objectContaining({ p_credits_amount: 750 }),
      );
    });

    it('adds 1500 credits for price_1500', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);
      setupHappyPathMocks();

      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_1500' } }],
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(mockServiceRpc).toHaveBeenCalledWith(
        'add_purchased_credits',
        expect.objectContaining({ p_credits_amount: 1500 }),
      );
    });

    // ---- Not paid ----
    it('returns { received: true } when payment_status is not paid', async () => {
      const event = makeCheckoutEvent({ paymentStatus: 'unpaid' });
      mockConstructEvent.mockReturnValue(event);

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      // Should NOT attempt any DB operations
      expect(mockServiceFrom).not.toHaveBeenCalled();
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- Missing user_id in metadata ----
    it('returns { received: true } when user_id is missing from metadata', async () => {
      const event = makeCheckoutEvent({ userId: null });
      mockConstructEvent.mockReturnValue(event);

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- Line items fetch failure ----
    it('returns { received: true } when line items fetch fails', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockRejectedValue(new Error('Stripe API error'));

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- No price in line items ----
    it('returns { received: true } when line items have no price', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockResolvedValue({ data: [{ price: null }] });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- Empty line items ----
    it('returns { received: true } when line items are empty', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockResolvedValue({ data: [] });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- Unknown price ID ----
    it('returns { received: true } when price ID is unknown', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_unknown_999' } }],
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- Idempotency layer 1: duplicate event ----
    it('returns { received: true } when event was already processed (layer 1)', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_250' } }],
      });

      // Layer 1: event already exists
      const existingEventChain = chainable({
        data: { id: 'purchase_1', status: 'completed' },
        error: null,
      });
      mockServiceFrom.mockReturnValue(existingEventChain);

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      // Should NOT call RPC
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- Idempotency layer 2: session already completed ----
    it('returns { received: true } when session is already completed (layer 2)', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_250' } }],
      });

      let callCount = 0;
      mockServiceFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Layer 1: no existing event
          return chainable({ data: null, error: null });
        }
        // Layer 2: session already completed
        return chainable({
          data: { id: 'purchase_1', status: 'completed' },
          error: null,
        });
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- Idempotency layer 3: no pending purchase ----
    it('returns { received: true } when no pending purchase exists (layer 3)', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_250' } }],
      });

      mockServiceFrom.mockImplementation(() => {
        // All layers: no data
        return chainable({ data: null, error: null });
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- Pending purchase already completed (layer 3) ----
    it('returns { received: true } when pending purchase is already completed (layer 3)', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_250' } }],
      });

      let callCount = 0;
      mockServiceFrom.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return chainable({ data: null, error: null });
        }
        // Layer 3: purchase exists but already completed
        return chainable({
          data: { id: 'purchase_1', status: 'completed', user_id: MOCK_USER_ID },
          error: null,
        });
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });

    // ---- RPC error adding credits ----
    it('returns 500 when add_purchased_credits RPC fails', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);
      setupHappyPathMocks();

      mockServiceRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed', code: '99999' },
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Failed to add credits' });
    });

    // ---- Handles RPC result with success: false ----
    it('returns 200 even when RPC result has success: false (already processed)', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);
      setupHappyPathMocks();

      mockServiceRpc.mockResolvedValue({
        data: [{ success: false, error_message: 'Already processed' }],
        error: null,
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
    });

    // ---- Defaults for missing amount/currency ----
    it('defaults to 0 amount and "usd" when missing from session', async () => {
      const event = makeCheckoutEvent({ amountTotal: null, currency: null });
      mockConstructEvent.mockReturnValue(event);
      setupHappyPathMocks();

      await POST(createWebhookRequest('{}'));

      expect(mockServiceRpc).toHaveBeenCalledWith(
        'add_purchased_credits',
        expect.objectContaining({
          p_amount_cents: 0,
          p_currency: 'usd',
        }),
      );
    });

    // ---- Line items where price is a string ----
    it('returns { received: true } when price is a string (not expanded)', async () => {
      const event = makeCheckoutEvent();
      mockConstructEvent.mockReturnValue(event);

      mockListLineItems.mockResolvedValue({
        data: [{ price: 'price_string_id' }],
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockServiceRpc).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // payment_intent.payment_failed
  // -----------------------------------------------------------------------
  describe('payment_intent.payment_failed', () => {
    it('updates purchase status to failed', async () => {
      const event = makePaymentFailedEvent();
      mockConstructEvent.mockReturnValue(event);

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockServiceFrom.mockReturnValue(updateChain);

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      // Verify from('credit_purchases') was called
      expect(mockServiceFrom).toHaveBeenCalledWith('credit_purchases');
      // Verify update with correct fields
      expect(updateChain.update).toHaveBeenCalledWith({
        status: 'failed',
        stripe_event_id: MOCK_EVENT_ID,
      });
      // Verify eq filter for the payment intent
      expect(updateChain.eq).toHaveBeenCalledWith(
        'stripe_payment_intent_id',
        MOCK_PAYMENT_INTENT_ID,
      );
    });

    it('returns { received: true } even when update fails', async () => {
      const event = makePaymentFailedEvent();
      mockConstructEvent.mockReturnValue(event);

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }),
      };
      mockServiceFrom.mockReturnValue(updateChain);

      const res = await POST(createWebhookRequest('{}'));
      // Route doesn't check for error on this path — just returns received
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('returns 500 on unexpected exception in handler', async () => {
      mockConstructEvent.mockReturnValue(makeCheckoutEvent());

      // Make listLineItems succeed but then make serviceFrom throw
      mockListLineItems.mockResolvedValue({
        data: [{ price: { id: 'price_250' } }],
      });

      // Make from() throw an unexpected error
      mockServiceFrom.mockImplementation(() => {
        throw new Error('Unexpected DB failure');
      });

      const res = await POST(createWebhookRequest('{}'));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Internal server error' });
    });
  });
});
