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

/**
 * IP-based rate limiting using database
 * This survives server restarts and works across serverless instances
 */
async function checkIpRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabase = getServiceSupabase();
  
  // Use the existing rate limit RPC with a synthetic "user ID" based on IP hash
  // This is a pragmatic approach - we're reusing existing infrastructure
  // The IP is hashed to avoid storing raw IPs in the database
  const ipHash = await hashIp(ip);
  
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

/**
 * Hash IP address for privacy-preserving rate limiting
 * We don't want to store raw IPs in the database
 */
async function hashIp(ip: string): Promise<string> {
  // Use a consistent prefix so these don't collide with real user IDs
  const encoder = new TextEncoder();
  const data = encoder.encode(`password-reset:${ip}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // Return as UUID format for compatibility with existing RPC
  return `00000000-0000-0000-0000-${hashHex.slice(0, 12)}`;
}

/**
 * Get client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback - this may not be accurate behind proxies
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, captchaToken } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

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
      const ipHash = await hashIp(clientIp);
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

  } catch (error) {
    console.error('[ResetPassword] Unexpected error');
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
