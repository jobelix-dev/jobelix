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
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rate limiting: simple in-memory store (resets on server restart)
// For production, use Redis or database-backed rate limiting
const resetAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = resetAttempts.get(key);

  if (!record || now > record.resetAt) {
    // First attempt or window expired
    resetAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many reset attempts. Please try again in ${rateLimit.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    // Create admin Supabase client for server-side operations
    // This bypasses PKCE since it's server-to-server
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Build redirect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/auth/callback?next=/update-password`;

    console.log('[ResetPassword] Sending reset email to:', email);
    console.log('[ResetPassword] Redirect URL:', redirectUrl);

    // Send password reset email
    // Using admin client means the email link will work regardless of which
    // browser/app opens it, since there's no client-side PKCE to verify
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
      captchaToken: captchaToken || undefined,
    });

    if (error) {
      console.error('[ResetPassword] Supabase error:', error);
      
      // Don't leak whether email exists in system
      // Always return success to prevent email enumeration
      if (error.message?.includes('rate limit') || error.status === 429) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }

      // For other errors, still return success to prevent enumeration
      // but log the error server-side
      console.error('[ResetPassword] Error (hidden from user):', error.message);
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    });

  } catch (error) {
    console.error('[ResetPassword] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
