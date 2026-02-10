/**
 * POST /api/student/referral/apply
 *
 * Applies a referral code to the current user.
 * Can only be done once per user (within 7 days of signup).
 * 
 * Security:
 * - Rate limited: 5 attempts per hour, 20 per day
 * - Students only (enforced at database level)
 * - 7-day time limit (enforced at database level)
 * - Uniform error messages (prevents code enumeration)
 * 
 * Body: { code: string }
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting';

// Rate limit config: strict limits to prevent brute-force attempts
const RATE_LIMIT_CONFIG = {
  endpoint: 'referral-apply',
  hourlyLimit: 5,   // 5 attempts per hour
  dailyLimit: 20,   // 20 attempts per day
};

export async function POST(req: NextRequest) {
  console.log('[Referral Apply] ===== STARTING REFERRAL APPLY =====');
  
  try {
    const auth = await authenticateRequest();
    if (auth.error) {
      console.log('[Referral Apply] Auth failed');
      return auth.error;
    }

    const { user, supabase } = auth;
    console.log('[Referral Apply] User:', user.id, user.email);

    // Check rate limit before processing
    const rateLimitResult = await checkRateLimit(user.id, RATE_LIMIT_CONFIG);
    if (rateLimitResult.error) return rateLimitResult.error;
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(RATE_LIMIT_CONFIG, rateLimitResult.data);
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { code } = body;

    if (!code || typeof code !== 'string') {
      console.log('[Referral Apply] Missing code in request body');
      // Log the attempt for rate limiting
      await logApiCall(user.id, RATE_LIMIT_CONFIG.endpoint);
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }

    console.log('[Referral Apply] Received code:', code);

    // Validate code format (8 alphanumeric chars)
    const normalizedCode = code.toLowerCase().trim();
    if (!/^[a-z0-9]{8}$/.test(normalizedCode)) {
      console.log('[Referral Apply] Invalid code format:', normalizedCode);
      // Log the attempt for rate limiting
      await logApiCall(user.id, RATE_LIMIT_CONFIG.endpoint);
      // Use generic error to prevent format enumeration
      return NextResponse.json({ error: 'Invalid or expired referral code' }, { status: 400 });
    }

    console.log('[Referral Apply] Applying normalized code:', normalizedCode);

    // Apply the referral code (database handles all security checks)
    const { data: result, error: applyError } = await supabase
      .rpc('apply_referral_code', { p_code: normalizedCode });

    // Log the attempt for rate limiting (regardless of success)
    await logApiCall(user.id, RATE_LIMIT_CONFIG.endpoint);

    if (applyError) {
      console.error('[Referral Apply] Database error:', applyError);
      return NextResponse.json({ error: 'Failed to apply referral code' }, { status: 500 });
    }

    const row = result?.[0];
    console.log('[Referral Apply] Database result:', row);
    
    if (!row?.success) {
      console.log('[Referral Apply] Failed:', row?.error_message);
      return NextResponse.json(
        { error: row?.error_message || 'Invalid or expired referral code' },
        { status: 400 }
      );
    }

    console.log('[Referral Apply] SUCCESS - Referral code applied');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Apply referral error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
