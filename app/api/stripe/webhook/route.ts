/**
 * POST /api/stripe/webhook
 *
 * Purpose:
 * - Stripe calls this endpoint after payment events
 * - We verify the signature (so only Stripe can call it)
 * - On successful payment, we add credits to the user
 *
 * Key security ideas:
 * ✅ Verify Stripe signature (very important)
 * ✅ Do NOT trust client-side values
 * ✅ Do NOT trust session.metadata for price/credits
 * ✅ Read the actual paid line item price from Stripe
 * ✅ Idempotency: handle retries safely (Stripe may send same event again)
 * ✅ Use DB/RPC to do atomic "mark purchase completed + add credits"
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/server/supabaseService";

let stripeInstance: Stripe | null = null;
let webhookSecretCache: string | null = null;

/**
 * Get or create the Stripe client
 * Lazy initialization to avoid build-time errors when env vars aren't available
 */
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  // ℹ️ (Optional) Stripe usually recommends setting the API version explicitly,
  // but leaving default is okay for MVP.
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeInstance;
}

/**
 * Get webhook secret
 * Lazy initialization to avoid build-time errors when env vars aren't available
 */
function getWebhookSecret(): string {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  webhookSecretCache = process.env.STRIPE_WEBHOOK_SECRET;
  return webhookSecretCache;
}

// Price ID to credits mapping (built from environment variables)
// ✅ Server-side truth: if the paid priceId is not in this mapping, we refuse to credit.
const PRICE_TO_CREDITS: Record<string, number> = {};

if (process.env.STRIPE_PRICE_CREDITS_100) {
  PRICE_TO_CREDITS[process.env.STRIPE_PRICE_CREDITS_100] = 100;
}
if (process.env.STRIPE_PRICE_CREDITS_300) {
  PRICE_TO_CREDITS[process.env.STRIPE_PRICE_CREDITS_300] = 300;
}
if (process.env.STRIPE_PRICE_CREDITS_500) {
  PRICE_TO_CREDITS[process.env.STRIPE_PRICE_CREDITS_500] = 500;
}



export async function POST(request: NextRequest) {
  try {
    // 1) Read raw body (required for Stripe signature verification)
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // SECURITY: Require signature header
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // 2) Verify webhook signature to ensure request is from Stripe
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ✅ Small optimization: reuse a single service supabase instance in this request
    const serviceSupabase = getServiceSupabase();

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only process paid sessions
      if (session.payment_status !== "paid") {
        return NextResponse.json({ received: true });
      }

      const userId = session.metadata?.user_id;
      const paymentIntentId = session.payment_intent as string;

      // SECURITY: metadata is for reference only - we validate everything from Stripe's source of truth
      if (!userId) {
        console.error("❌ Missing user_id in session metadata:", {
          sessionId: session.id,
        });
        return NextResponse.json({ received: true });
      }

      // SECURITY: Get the REAL paid priceId from Stripe line items (source of truth)
      // Why? Metadata can be tampered with or incorrect. Line items reflect what was actually purchased.
      let paidPriceId: string | null = null;
      try {
        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 10 });

        const first = lineItems.data[0];
        if (first?.price && typeof first.price !== "string") {
          paidPriceId = first.price.id;
        }
      } catch (err: any) {
        console.error("❌ Failed to fetch line items for session:", session.id, err?.message);
        return NextResponse.json({ received: true });
      }

      if (!paidPriceId) {
        console.error("❌ Could not determine paid priceId from line items:", session.id);
        return NextResponse.json({ received: true });
      }

      // SECURITY: Map paidPriceId -> credits using server-side config (never trust client/metadata)
      const creditsAmount = PRICE_TO_CREDITS[paidPriceId];
      if (!creditsAmount) {
        console.error("❌ Unknown/invalid paid priceId (not in server mapping):", {
          sessionId: session.id,
          paidPriceId,
        });
        return NextResponse.json({ received: true });
      }

      // Log successful validation
      console.log("✅ Payment validated:", {
        sessionId: session.id,
        userId,
        paidPriceId,
        creditsAmount,
        amountPaid: session.amount_total,
        currency: session.currency,
      });

      // SECURITY: Multiple layers of idempotency protection

      // Layer 1: Check if this exact event was already processed
      const { data: existingByEvent } = await serviceSupabase
        .from("credit_purchases")
        .select("id, status")
        .eq("stripe_event_id", event.id)
        .maybeSingle();

      if (existingByEvent) {
        console.log("✅ Event already processed (duplicate webhook):", {
          eventId: event.id,
          purchaseId: existingByEvent.id,
          status: existingByEvent.status,
        });
        return NextResponse.json({ received: true });
      }

      // Layer 2: Check if this session was already completed
      const { data: existingBySession } = await serviceSupabase
        .from("credit_purchases")
        .select("id, status")
        .eq("stripe_checkout_session_id", session.id)
        .eq("status", "completed")
        .maybeSingle();

      if (existingBySession) {
        console.log("✅ Session already completed (duplicate webhook):", {
          sessionId: session.id,
          purchaseId: existingBySession.id,
        });
        return NextResponse.json({ received: true });
      }

      // Layer 3: Verify pending purchase exists for this session/user
      // This prevents crediting if something is inconsistent (e.g., session not created via our API)
      const { data: pendingPurchase } = await serviceSupabase
        .from("credit_purchases")
        .select("id, status, user_id")
        .eq("stripe_checkout_session_id", session.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!pendingPurchase) {
        console.error("❌ No pending purchase found for this session/user:", {
          sessionId: session.id,
          userId,
        });
        return NextResponse.json({ received: true });
      }

      if (pendingPurchase.status === "completed") {
        console.log("✅ Purchase already completed:", {
          purchaseId: pendingPurchase.id,
        });
        return NextResponse.json({ received: true });
      }

      // SECURITY: Add credits using transaction-safe RPC function
      // This function uses database locks to prevent race conditions
      const { data, error: creditsError } = await serviceSupabase.rpc("add_purchased_credits", {
        p_user_id: userId,
        p_credits_amount: creditsAmount,
        p_payment_intent_id: paymentIntentId,
        p_stripe_event_id: event.id,
        p_session_id: session.id,
        p_amount_cents: session.amount_total || 0,
        p_currency: session.currency || "usd",
      });

      if (creditsError) {
        console.error("Error adding credits:", creditsError);
        return NextResponse.json({ error: "Failed to add credits" }, { status: 500 });
      }

      // Log the result for monitoring
      const result = data?.[0];
      console.log("✅ Credit addition final result:", result);
      if (result && !result.success) {
        console.warn("⚠️ Credit addition result:", result.error_message);
      }

      return NextResponse.json({ received: true });
    }

    // Handle payment_intent.payment_failed event
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await getServiceSupabase()
        .from("credit_purchases")
        .update({
          status: "failed",
          stripe_event_id: event.id,
        })
        .eq("stripe_payment_intent_id", paymentIntent.id);

      return NextResponse.json({ received: true });
    }

    // Acknowledge other event types
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
