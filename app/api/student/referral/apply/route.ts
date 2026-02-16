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
import { enforceSameOrigin } from '@/lib/server/csrf';

// Rate limit config: strict limits to prevent brute-force attempts
const RATE_LIMIT_CONFIG = {
  endpoint: 'referral-apply',
  hourlyLimit: 5,   // 5 attempts per hour
  dailyLimit: 20,   // 20 attempts per day
};

export async function POST(req: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(req);
    if (csrfError) return csrfError;

    const auth = await authenticateRequest();
    if (auth.error) {
      return auth.error;
    }

    const { user, supabase } = auth;

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
      // Log the attempt for rate limiting
      await logApiCall(user.id, RATE_LIMIT_CONFIG.endpoint);
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }

    // Validate code format (8 alphanumeric chars)
    const normalizedCode = code.toLowerCase().trim();
    if (!/^[a-z0-9]{8}$/.test(normalizedCode)) {
      // Log the attempt for rate limiting
      await logApiCall(user.id, RATE_LIMIT_CONFIG.endpoint);
      // Use generic error to prevent format enumeration
      return NextResponse.json({ error: 'Invalid or expired referral code' }, { status: 400 });
    }

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
    
    if (!row?.success) {
      return NextResponse.json(
        { error: 'Invalid or expired referral code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Apply referral error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
