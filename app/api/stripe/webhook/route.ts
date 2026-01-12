/**
 * Stripe Webhook Handler
 * Processes payment events and credits user accounts
 * Security: Signature verification, idempotent processing, server-side validation
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/supabaseService';

let stripeInstance: Stripe | null = null;
let webhookSecretCache: string | null = null;

/**
 * Get or create the Stripe client
 * Lazy initialization to avoid build-time errors when env vars aren't available
 */
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  // Always create new instance to pick up environment variable changes
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeInstance;
}

/**
 * Get webhook secret
 * Lazy initialization to avoid build-time errors when env vars aren't available
 */
function getWebhookSecret(): string {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  // Always get fresh value
  webhookSecretCache = process.env.STRIPE_WEBHOOK_SECRET;
  return webhookSecretCache;
}

// Price ID to credits mapping (dynamically built from environment variables)
// SECURITY: Must validate price IDs from Stripe metadata
const PRICE_TO_CREDITS: Record<string, number> = {};

// Build mapping from environment variables
if (process.env.STRIPE_PRICE_CREDITS_1000) {
  PRICE_TO_CREDITS[process.env.STRIPE_PRICE_CREDITS_1000] = 1000;
}

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received at:', new Date().toISOString());
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    console.log('📝 Webhook body length:', body.length);
    console.log('🔐 Signature present:', !!signature);

    // SECURITY: Require signature header
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // SECURITY: Verify webhook signature to ensure request is from Stripe
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
      console.log('✅ Signature verified! Event type:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process paid sessions
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ received: true });
      }

      const userId = session.metadata?.user_id;
      const priceId = session.metadata?.price_id;
      const creditsFromMetadata = session.metadata?.credits_amount;
      const paymentIntentId = session.payment_intent as string;

      // Validate required metadata
      if (!userId || !priceId) {
        console.error('Missing metadata in session:', {
          sessionId: session.id,
          hasUserId: !!userId,
          hasPriceId: !!priceId,
        });
        return NextResponse.json({ received: true });
      }

      // SECURITY: Get credits from server-side config, never trust metadata
      const creditsAmount = PRICE_TO_CREDITS[priceId];
      if (!creditsAmount) {
        console.error('Invalid price_id:', priceId);
        return NextResponse.json({ received: true });
      }

      // Validate credits match (extra safety check)
      if (creditsFromMetadata && parseInt(creditsFromMetadata) !== creditsAmount) {
        console.warn('Credits mismatch:', {
          priceId,
          expected: creditsAmount,
          received: creditsFromMetadata,
        });
      }

      // SECURITY: Idempotency check by event ID
      const { data: existingByEvent } = await getServiceSupabase()
        .from('credit_purchases')
        .select('id')
        .eq('stripe_event_id', event.id)
        .maybeSingle();

      if (existingByEvent) {
        return NextResponse.json({ received: true });
      }

      // SECURITY: Idempotency check by session ID (in case event ID changes on retry)
      const { data: existingBySession } = await getServiceSupabase()
        .from('credit_purchases')
        .select('id')
        .eq('stripe_checkout_session_id', session.id)
        .eq('status', 'completed')
        .maybeSingle();

      if (existingBySession) {
        return NextResponse.json({ received: true });
      }

      // SECURITY: Add credits using transaction-safe RPC function
      // This function atomically updates purchase record AND adds credits
      // Includes idempotency checks with row-level locks to prevent race conditions
      console.log('Calling add_purchased_credits with:', {
        p_user_id: userId,
        p_credits_amount: creditsAmount,
        p_payment_intent_id: paymentIntentId,
        p_stripe_event_id: event.id,
        p_session_id: session.id,
        p_amount_cents: session.amount_total || 0,
        p_currency: session.currency || 'usd',
      });

      const { data, error: creditsError } = await getServiceSupabase().rpc('add_purchased_credits', {
        p_user_id: userId,
        p_credits_amount: creditsAmount,
        p_payment_intent_id: paymentIntentId,
        p_stripe_event_id: event.id,
        p_session_id: session.id,
        p_amount_cents: session.amount_total || 0,
        p_currency: session.currency || 'usd',
      });

      console.log('RPC result:', { data, error: creditsError });

      if (creditsError) {
        console.error('Error adding credits:', creditsError);
        return NextResponse.json(
          { error: 'Failed to add credits' },
          { status: 500 }
        );
      }

      // Log the result for monitoring
      const result = data?.[0];
      console.log('Credit addition final result:', result);
      if (result && !result.success) {
        console.warn('Credit addition result:', result.error_message);
      }

      return NextResponse.json({ received: true });
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      await getServiceSupabase()
        .from('credit_purchases')
        .update({ 
          status: 'failed',
          stripe_event_id: event.id,
        })
        .eq('stripe_payment_intent_id', paymentIntent.id);

      return NextResponse.json({ received: true });
    }

    // Acknowledge other event types
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
