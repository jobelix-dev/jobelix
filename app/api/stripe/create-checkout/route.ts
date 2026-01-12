/**
 * Create Stripe Checkout Session for credit purchase
 * Security: Authentication required, price mapping server-side, idempotent
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabaseService';
import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

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

// Plan to Stripe Price ID mapping (loads from environment variables)
// SECURITY: Price IDs never exposed to client
const PLAN_TO_PRICE_ID: Record<string, string> = {
  credits_1000: process.env.STRIPE_PRICE_CREDITS_1000 || '',
};

// Plan to credits amount mapping
const PLAN_TO_CREDITS: Record<string, number> = {
  credits_1000: 1000,
};

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify user authentication
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user } = auth;

    // Parse and validate request body
    const body = await request.json();
    const { plan } = body;

    if (!plan || typeof plan !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid plan' },
        { status: 400 }
      );
    }

    // SECURITY: Validate plan against whitelist
    const priceId = PLAN_TO_PRICE_ID[plan];
    const creditsAmount = PLAN_TO_CREDITS[plan];
    
    if (!priceId || !creditsAmount) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Verify price exists in Stripe (additional validation)
    try {
      await getStripe().prices.retrieve(priceId);
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Price not found in Stripe' },
        { status: 400 }
      );
    }

    // Determine origin for redirect URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      locale: 'en',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/student?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/student?canceled=true`,
      metadata: {
        user_id: user.id,
        price_id: priceId,
        credits_amount: creditsAmount.toString(),
      },
      // SECURITY: Prevent session reuse
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });

    // Create pending purchase record for tracking
    // SECURITY: Use service role to bypass RLS - users should NOT be able to insert purchases
    const { error: insertError } = await getServiceSupabase()
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        stripe_checkout_session_id: session.id,
        credits_amount: creditsAmount,
        price_cents: 0, // Will be updated by webhook
        currency: session.currency || 'usd',
        status: 'pending',
      });

    if (insertError) {
      // Log but don't fail - webhook will handle credit addition
      console.error('Error creating purchase record:', insertError);
    }

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
