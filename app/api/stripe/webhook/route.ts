/**
 * Stripe Webhook Handler
 * Processes payment events and credits user accounts
 * Security: Signature verification, idempotent processing, server-side validation
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import serviceSupabase from '@/lib/supabaseService';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Server-side source of truth for price to credits mapping
// SECURITY: Must match create-checkout route exactly
const PRICE_TO_CREDITS: Record<string, number> = {
//   // Test mode prices
//   'price_1SoYLdRkZ3GWynzuYzRcNCuG': 1000,
  
  // Live mode prices - Replace with your actual live price ID from Stripe Dashboard
  'price_1SoYrLGqCDc9J776dZtKmYGQ': 1000,  // €5 for 1000 credits
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

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
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
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
      const { data: existingByEvent } = await serviceSupabase
        .from('credit_purchases')
        .select('id')
        .eq('stripe_event_id', event.id)
        .maybeSingle();

      if (existingByEvent) {
        return NextResponse.json({ received: true });
      }

      // SECURITY: Idempotency check by session ID (in case event ID changes on retry)
      const { data: existingBySession } = await serviceSupabase
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
      const { data, error: creditsError } = await serviceSupabase.rpc('add_purchased_credits', {
        p_user_id: userId,
        p_credits_amount: creditsAmount,
        p_payment_intent_id: paymentIntentId,
        p_stripe_event_id: event.id,
        p_session_id: session.id,
        p_amount_cents: session.amount_total || 0,
        p_currency: session.currency || 'usd',
      });

      if (creditsError) {
        console.error('Error adding credits:', creditsError);
        return NextResponse.json(
          { error: 'Failed to add credits' },
          { status: 500 }
        );
      }

      // Log the result for monitoring
      const result = data?.[0];
      if (result && !result.success) {
        console.warn('Credit addition result:', result.error_message);
      }

      return NextResponse.json({ received: true });
    }

    // Handle payment_intent.payment_failed event
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      await serviceSupabase
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
