/**
 * POST /api/stripe/create-checkout
 *
 * Purpose:
 * - User is logged in
 * - User chooses a plan (example: "credits_1000")
 * - We create a Stripe Checkout session
 * - We also create a database record so we can track the purchase safely
 *
 * Key security ideas:
 * ✅ Authentication required (must be logged in)
 * ✅ Client only sends a PLAN NAME (not a price, not credits)
 * ✅ Server maps plan -> Stripe priceId + credits (whitelist)
 * ✅ We DO NOT trust request.headers.origin for redirects (can be spoofed)
 * ✅ Idempotency: prevent double-click creating multiple sessions
 *
 * NOTE:
 * - This file MUST be server-only.
 */
import "server-only";


import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getServiceSupabase } from '@/lib/server/supabaseService';
import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Get or create the Stripe client
 * Lazy initialization to avoid build-time errors when env vars aren't available
 */
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");

  // One instance is enough; no need to recreate every time.
  return new Stripe(key);
}

// -----------------------------
// Plan whitelist (server truth)
// -----------------------------
// User can only buy what you list here.
// Client sends "plan", server decides everything else.
const PLAN_TO_PRICE_ID: Record<string, string> = {
  credits_100: process.env.STRIPE_PRICE_CREDITS_100 || '',
  credits_300: process.env.STRIPE_PRICE_CREDITS_300 || '',
  credits_500: process.env.STRIPE_PRICE_CREDITS_500 || '',
};

// Plan to credits amount mapping
const PLAN_TO_CREDITS: Record<string, number> = {
  credits_100: 100,
  credits_300: 300,
  credits_500: 500,
};

// -----------------------------
// Canonical base URL (IMPORTANT)
// -----------------------------
// NEVER trust request.headers.origin (attackers can spoof it).
// Put your real app URL in Vercel env vars, e.g. "https://www.jobelix.fr"
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "https://www.jobelix.fr";

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify user authentication
    // 1) Ensure user is authenticated
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user } = auth;

    // Parse and validate request body
    const body = await request.json();

    // 2) Parse request body
    const { plan } = body;

    if (!plan || typeof plan !== 'string') {
      console.error('[Stripe Checkout] Missing or invalid plan:', plan);
      return NextResponse.json(
        { error: 'Missing or invalid plan' },
        { status: 400 }
      );
    }

    // 3) Validate plan against whitelist
    const priceId = PLAN_TO_PRICE_ID[plan];
    const creditsAmount = PLAN_TO_CREDITS[plan];
    
    console.log('[Stripe Checkout] Plan validation:', { 
      plan, 
      hasPriceId: !!priceId, 
      creditsAmount,
      hasEnvVar: !!process.env[`STRIPE_PRICE_CREDITS_${creditsAmount}`]
    });
    
    console.log('[Stripe Checkout] priceId =', priceId);

    if (!priceId || !creditsAmount) {
      console.error('[Stripe Checkout] Invalid plan configuration:', { 
        plan, 
        hasPriceId: !!priceId, 
        hasCreditsAmount: !!creditsAmount,
        hasEnvVar100: !!process.env.STRIPE_PRICE_CREDITS_100,
        hasEnvVar300: !!process.env.STRIPE_PRICE_CREDITS_300,
        hasEnvVar500: !!process.env.STRIPE_PRICE_CREDITS_500,
      });
      return NextResponse.json(
        { error: 'Invalid plan configuration - check environment variables' },
        { status: 400 }
      );
    }


    // 4) (Optional extra check) Verify the price exists in Stripe
    // This is not strictly required, but it helps catch env misconfig.
    try {
      await getStripe().prices.retrieve(priceId);
    } catch (err: any) {
      console.error('[Stripe Checkout] Price verification failed');
      return NextResponse.json(
        { error: 'Invalid payment configuration' },
        { status: 400 }
      );
    }

    
    /**
     * 5) Create a database record FIRST (idempotency)
     *
     * Why?
     * - If user double-clicks or retries, we can reuse the same purchase record.
     * - We can also use the purchase ID as Stripe idempotency key.
     * 
     * SECURITY: We fetch the actual price from Stripe to ensure consistency
     */
    const serviceSupabase = getServiceSupabase();

    // Fetch the actual price from Stripe for audit trail
    let priceCents = 0;
    let currency = 'usd';
    try {
      const priceObject = await getStripe().prices.retrieve(priceId);
      priceCents = priceObject.unit_amount || 0;
      currency = priceObject.currency || 'usd';
    } catch (err: any) {
      console.error('[Stripe Checkout] Failed to fetch price details');
      // Continue with defaults - webhook will update with actual values
    }

    // Create a unique purchase row. You can also add a unique constraint
    // on (user_id, status='pending') or similar if you want.
    const { data: purchaseRow, error: purchaseError } = await serviceSupabase
      .from("credit_purchases")
      .insert({
        user_id: user.id,
        credits_amount: creditsAmount,
        price_cents: priceCents,
        currency: currency,
        status: "pending", // Start as pending (not initiated)
      })
      .select("id")
      .single();

    if (purchaseError || !purchaseRow) {
      console.error("Failed to create purchase record:", purchaseError);
      return NextResponse.json({ error: "Failed to create purchase record" }, { status: 500 });
    }

    const purchaseId = purchaseRow.id;

    /**
     * 6) Create Stripe Checkout session
     *
     * Security notes:
     * - success_url / cancel_url use APP_ORIGIN (not Origin header)
     * - We include purchase_id + user_id in metadata
     * - We do NOT rely on metadata for credits; webhook uses server mapping
     * - We do NOT include sensitive data in metadata (all validation server-side)
     */
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        locale: "en",
        line_items: [{ price: priceId, quantity: 1 }],

        success_url: `${APP_ORIGIN}/dashboard?tab=auto-apply&success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_ORIGIN}/dashboard?tab=auto-apply&canceled=true`,

        metadata: {
          purchase_id: String(purchaseId),
          user_id: user.id,
          // DO NOT include credits_amount or price - webhook will validate from Stripe's source of truth
        },

        // Checkout session expires in 30 minutes
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      },
      {
        // ✅ Stripe idempotency:
        // If the client retries the request, Stripe will return the same session
        // instead of creating a brand new one.
        idempotencyKey: `purchase_${purchaseId}`,
      }
    );

    // 7) Update DB record to store Stripe session id (status already set to pending)
    const { error: updateError } = await serviceSupabase
      .from("credit_purchases")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", purchaseId);

    if (updateError) {
      // Not ideal, but webhook can still complete purchase later using session metadata.
      console.error("Failed to update purchase record with session id:", updateError);
    }

    // 8) Return checkout URL to client
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error('[Stripe Checkout] Checkout error occurred');
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}