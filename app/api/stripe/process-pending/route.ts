/**
 * POST /api/stripe/process-pending
 * 
 * Development helper: Process pending purchases manually
 * This simulates what webhooks do in production
 * 
 * Call this after completing a test Stripe checkout to add your credits
 */

import "server-only";

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getServiceSupabase } from '@/lib/server/supabaseService';

export async function POST() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user } = auth;
    const serviceSupabase = getServiceSupabase();

    // Find pending purchases for this user
    const { data: pendingPurchases, error: fetchError } = await serviceSupabase
      .from('credit_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('purchased_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingPurchases || pendingPurchases.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No pending purchases to process' 
      });
    }

    // Process each pending purchase
    const results = [];
    for (const purchase of pendingPurchases) {
      const { data, error: rpcError } = await serviceSupabase.rpc('add_purchased_credits', {
        p_user_id: purchase.user_id,
        p_credits_amount: purchase.credits_amount,
        p_payment_intent_id: `manual_${purchase.id}`,
        p_stripe_event_id: `evt_manual_${Date.now()}_${purchase.id}`,
        p_session_id: purchase.stripe_checkout_session_id,
        p_amount_cents: purchase.price_cents,
        p_currency: purchase.currency,
      });

      const result = data?.[0];
      results.push({
        purchase_id: purchase.id,
        credits_amount: purchase.credits_amount,
        success: result?.success || false,
        new_balance: result?.new_balance,
        error: rpcError?.message || result?.error_message,
      });
    }

    return NextResponse.json({
      success: true,
      processed: pendingPurchases.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
