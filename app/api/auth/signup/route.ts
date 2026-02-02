/**
 * Signup API Route
 *
 * Route: POST /api/auth/signup
 *
 * Sends confirmation email using server-side Supabase client.
 *
 * WHY SERVER-SIDE?
 * When using client-side Supabase, the PKCE code_verifier is stored in the
 * initiating client's storage. If the user clicks the confirmation email link
 * in a different browser/app (e.g., signed up in Electron, clicked in Chrome),
 * the PKCE verification fails because Chrome doesn't have the code_verifier.
 *
 * By using the service role client, we bypass client-side PKCE storage entirely.
 * The email template uses token_hash directly, and our /auth/callback verifies
 * it with verifyOtp() - no PKCE needed.
 *
 * FLOW:
 * 1. User submits email/password/role
 * 2. Server creates user with service role (bypasses PKCE)
 * 3. Supabase sends confirmation email with token_hash
 * 4. User clicks link → /auth/callback?token_hash=xxx&type=signup
 * 5. Callback verifies token with verifyOtp() → session created
 *
 * SECURITY:
 * - IP-based rate limiting (10 signups per IP per 48h)
 * - Captcha validation (passed to Supabase)
 * - Input validation (email format, role whitelist)
 * - Signup IP tracking for abuse detection
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server/supabaseServer'
import { getServiceSupabase } from '@/lib/server/supabaseService'
import { validateRequest, signupSchema } from '@/lib/server/validation'

// Rate limiting configuration
const MAX_SIGNUPS_PER_IP = 10  // Maximum signups allowed per IP
const RATE_LIMIT_HOURS = 48    // Time window in hours

/**
 * Get client IP from request headers
 * 
 * When behind proxies/CDN, the real client IP is in headers like x-forwarded-for.
 * On Vercel, this header is set by the platform and commonly used for rate limiting.
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare

  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, take the first (client) IP
    return forwarded.split(',')[0].trim()
  }

  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP

  // Fallback - treat 'unknown' as potentially risky in rate limiting
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    // -----------------------------
    // 1) Parse and validate input
    // -----------------------------
    const body = await request.json()
    const validation = validateRequest(body, signupSchema)

    if (validation.error) {
      return NextResponse.json(validation.error, { status: validation.error.status })
    }

    const { email, password, role, captchaToken } = validation.data

    // Normalize email for consistent handling
    const normalizedEmail = email.toLowerCase().trim()

    // -----------------------------
    // 2) IP-based rate limiting
    // -----------------------------
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const { data: signupCount, error: countError } = await getServiceSupabase()
      .rpc('count_recent_signups_from_ip', {
        p_ip_address: clientIP,
        p_hours_ago: RATE_LIMIT_HOURS
      })

    if (countError) {
      // If rate-limit check fails, allow signup but log the error
      // Failing open is acceptable here - we don't want to lock out real users
      console.error('[Signup] Error checking IP rate limit:', countError)
    } else if (signupCount >= MAX_SIGNUPS_PER_IP) {
      console.warn(`[Signup] Rate limit exceeded for IP: ${clientIP} (${signupCount} signups in ${RATE_LIMIT_HOURS}h)`)
      return NextResponse.json(
        {
          error: `Too many signups from this IP address. Please try again in ${RATE_LIMIT_HOURS} hours.`,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }

    // -----------------------------
    // 3) Build redirect URL
    // -----------------------------
    // Note: The email template constructs the full URL using {{ .SiteURL }} and {{ .TokenHash }}
    // This redirectTo is a fallback and ensures Supabase knows where to send users
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!baseUrl) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

      if (forwardedHost) {
        baseUrl = `${forwardedProto}://${forwardedHost}`
      } else {
        baseUrl = request.nextUrl.origin
      }
    }

    baseUrl = baseUrl.replace(/\/+$/, '')
    const redirectTo = `${baseUrl}/auth/callback?next=/dashboard`

    console.log('[Signup] Base URL:', baseUrl)
    console.log('[Signup] Redirect URL:', redirectTo)

    // -----------------------------
    // 4) Create user with SERVICE ROLE
    // -----------------------------
    // IMPORTANT: We use getServiceSupabase() here, NOT createClient()
    //
    // Why? Using the service role client:
    // - Bypasses PKCE entirely (no code_verifier stored client-side)
    // - Email contains token_hash which our /auth/callback verifies with verifyOtp()
    // - Works reliably when user clicks email link in a different browser/app
    //
    // This matches the pattern used in /api/auth/reset-password for consistency.
    const supabaseAdmin = getServiceSupabase()

    // Use the regular signUp method from service role context
    // This creates the user AND sends the confirmation email in one call
    // The captchaToken is validated by Supabase's backend
    const { data, error } = await supabaseAdmin.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          role,
        },
        emailRedirectTo: redirectTo,
        captchaToken: captchaToken ?? undefined,
      },
    })

    // -----------------------------
    // 5) Handle signup errors
    // -----------------------------
    if (error) {
      console.error('[Signup] Supabase signup error:', error.message, error.status)

      // Check for weak password
      if (error.code === 'weak_password' ||
          error.message?.toLowerCase().includes('password should')) {
        return NextResponse.json(
          {
            error: 'Password must be at least 8 characters',
            code: 'WEAK_PASSWORD'
          },
          { status: 400 }
        )
      }

      // Check if user already exists
      if (error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('user already exists')) {

        // Try to log them in with the provided credentials
        const supabase = await createClient()
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        if (!loginError) {
          // Login succeeded - user already had an account with these credentials
          return NextResponse.json({
            success: true,
            loggedIn: true,
            message: 'Welcome back! You have been logged in.'
          })
        }

        // Login failed - account exists but wrong password
        return NextResponse.json(
          {
            error: 'An account with this email already exists.',
            code: 'USER_ALREADY_EXISTS'
          },
          { status: 400 }
        )
      }

      // Generic error for other cases (don't leak internal details)
      return NextResponse.json(
        { error: 'Signup failed. Please try again.' },
        { status: 400 }
      )
    }

    // -----------------------------
    // 6) Track signup IP
    // -----------------------------
    if (data.user) {
      await getServiceSupabase()
        .from('signup_ip_tracking')
        .insert({
          ip_address: clientIP,
          user_agent: userAgent
        })
    }

    // -----------------------------
    // 7) Return success response
    // -----------------------------
    // With service role signup, user needs to confirm email
    // data.session is null when email confirmation is required
    if (data.user && data.session) {
      // Auto-confirm is enabled (usually local dev)
      // Sign in with the regular client to establish browser cookies
      console.log('[Signup] Auto-confirm enabled, establishing browser session')
      const supabase = await createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      
      if (signInError) {
        console.error('[Signup] Failed to establish session after auto-confirm:', signInError.message)
        // User was created but session failed - they can log in manually
        return NextResponse.json({ 
          success: true, 
          userId: data.user.id,
          message: 'Account created. Please log in.'
        })
      }
      
      console.log('[Signup] Session established successfully')
      return NextResponse.json({ success: true, userId: data.user.id })
    }

    return NextResponse.json({
      success: true,
      userId: data.user?.id,
      message: 'Please check your email to confirm your account'
    })

  } catch (error) {
    console.error('[Signup] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    )
  }
}
