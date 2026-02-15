/**
 * Password Reset Request API Route
 * 
 * Sends password reset email using server-side Supabase client.
 * 
 * WHY SERVER-SIDE?
 * When using client-side Supabase, the PKCE code_verifier is stored in the
 * initiating client's storage. If the user clicks the reset link in a different
 * browser/app (e.g., initiated from Electron, clicked in Chrome), the PKCE
 * verification fails because Chrome doesn't have the code_verifier.
 * 
 * By initiating from the server, we bypass client-side PKCE storage entirely.
 * The server handles the session exchange in /auth/callback using cookies.
 * 
 * SECURITY:
 * - Supabase has built-in rate limiting for resetPasswordForEmail
 * - We add IP-based rate limiting as defense in depth
 * - Email enumeration prevented by always returning success
 * - Captcha required on frontend (validated by Supabase)
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/server/supabaseService';
import { resetPasswordSchema } from '@/lib/server/validation';
import { getClientIp, hashToPseudoUuid } from '@/lib/server/requestSecurity';
import { enforceSameOrigin } from '@/lib/server/csrf';

/**
 * IP-based rate limiting using database
 * This survives server restarts and works across serverless instances
 */
async function checkIpRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabase = getServiceSupabase();
  
  // Use the existing rate limit RPC with a synthetic "user ID" based on IP hash
  // This is a pragmatic approach - we're reusing existing infrastructure
  // The IP is hashed to avoid storing raw IPs in the database
  const ipHash = await hashToPseudoUuid('password-reset', ip);
  
  const { data, error } = await supabase.rpc('check_api_rate_limit', {
    p_user_id: ipHash,
    p_endpoint: 'password-reset',
    p_hourly_limit: 5,  // 5 reset requests per IP per hour
    p_daily_limit: 10,  // 10 reset requests per IP per day
  });

  if (error) {
    // If rate limit check fails, allow the request but log
    // Failing open is acceptable here since Supabase has its own limits
    console.error('[ResetPassword] Rate limit check failed:', error);
    return { allowed: true };
  }

  const result = data?.[0];
  if (!result) {
    return { allowed: true };
  }

  if (!result.allowed) {
    // Calculate retry after (approximate - use 1 hour for simplicity)
    return { allowed: false, retryAfter: 3600 };
  }

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const body = await request.json();

    /**
     * Validate input using Zod schema.
     * If validation fails, return structured error messages.
     */
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: result.error.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, captchaToken } = result.data;

    // Normalize email for consistent handling
    const normalizedEmail = email.toLowerCase().trim();

    // IP-based rate limiting (defense in depth)
    const clientIp = getClientIp(request);
    const ipRateLimit = await checkIpRateLimit(clientIp);
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipRateLimit.retryAfter || 3600) } }
      );
    }

    // Use the service Supabase client for server-side operations
    // This bypasses client-side PKCE storage issues
    const supabaseAdmin = getServiceSupabase();

    // Build redirect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/auth/callback?next=/update-password`;

    // Send password reset email
    // Supabase has its own rate limiting (typically 4 emails/hour per email)
    // The captchaToken is validated by Supabase's backend
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectUrl,
      captchaToken: captchaToken || undefined,
    });

    if (error) {
      // Log error server-side for debugging (without PII)
      console.error('[ResetPassword] Supabase error code:', error.status, error.code);
      
      // Handle Supabase rate limiting
      if (error.message?.includes('rate limit') || error.status === 429) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }

      // For all other errors, return success to prevent email enumeration
      // The error is logged above for debugging
    }

    // Log the API call for rate limiting tracking
    try {
      const supabase = getServiceSupabase();
      const ipHash = await hashToPseudoUuid('password-reset', clientIp);
      await supabase.rpc('log_api_call', {
        p_user_id: ipHash,
        p_endpoint: 'password-reset',
      });
    } catch {
      // Ignore logging errors - not critical
    }

    // Always return success to prevent email enumeration attacks
    // This is standard security practice for password reset endpoints
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    });

  } catch {
    console.error('[ResetPassword] Unexpected error');
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
