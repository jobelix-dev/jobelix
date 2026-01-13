/**
 * Signup API Route
 *
 * Route: POST /api/auth/signup
 *
 * What this route does:
 * 1) Receives { email, password, role } from the frontend
 * 2) Rate-limits signups by IP (to reduce abuse/bots)
 * 3) Creates a Supabase Auth user (auth.users)
 * 4) Records the signup IP in a secure table (signup_ip_tracking)
 * 5) Returns success + userId (and sometimes a message about email confirmation)
 *
 * Important security idea:
 * - The frontend is NOT trusted.
 * - The server validates inputs and enforces rate limiting.
 * - Sensitive tables (like signup_ip_tracking) must be written with a service key
 *   because anonymous users cannot pass RLS safely.
 */

import "server-only";


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server/supabaseServer'
import { getServiceSupabase } from '@/lib/server/supabaseService'

// Rate limiting configuration
const MAX_SIGNUPS_PER_IP = 10  // Maximum signups allowed per IP
const RATE_LIMIT_HOURS = 48    // Time window in hours

/**
 * getClientIP(request)
 *
 * Beginner note:
 * - When your app runs on Vercel (or most hosting providers),
 *   requests go through a proxy/load balancer first.
 * - The "real" client IP is usually in HTTP headers like x-forwarded-for.
 *
 * WARNING:
 * - Headers can be spoofed in some setups. In practice, on Vercel the platform
 *   sets x-forwarded-for and it is commonly used for rate limiting.
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP (useful when behind proxies/CDN)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
  
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  
    // If we can't find an IP, return a placeholder.
  // Your DB function should handle this carefully (e.g. treat 'unknown' as risky).
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    /**
     * Basic input validation.
     * Never rely on frontend validation alone.
     */

    // -----------------------------
    // 1) Read the request body
    // -----------------------------
    const { email, password, role } = await request.json()

    // -----------------------------
    // 2) Validate input (server-side)
    // -----------------------------
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      )
    }

      // Only allow expected roles (never accept random strings from the client)
    if (role !== 'student' && role !== 'company') {
      return NextResponse.json(
        { error: 'Role must be either "student" or "company"' },
        { status: 400 }
      )
    }

    // -----------------------------
    // 3) Compute the "client fingerprint" for rate limiting
    // -----------------------------
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // -----------------------------
    // 4) Rate limit check (server role)
    // -----------------------------
    // Beginner note:
    // - getServiceSupabase() uses the SERVICE ROLE key.
    // - That key bypasses RLS, so only use it on the server (never in the browser).
    // - We need it here because the user is not authenticated yet.
    const { data: signupCount, error: countError } = await getServiceSupabase()
      .rpc('count_recent_signups_from_ip', {
        p_ip_address: clientIP,
        p_hours_ago: RATE_LIMIT_HOURS
      })

    if (countError) {
      // If rate-limit check fails, we don't block signup (your current behavior).
      // This avoids locking out real users if the DB function breaks.
      console.error('[Signup] Error checking IP rate limit:', countError)
      // Don't block signup if rate limit check fails, just log it
    } else if (signupCount >= MAX_SIGNUPS_PER_IP) {
      // Too many signups from the same IP → block
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
    // 5) Create the Auth user (cookie-based client)
    // -----------------------------
    // Beginner note:
    // - createClient() is your "normal" Supabase client.
    // - It is meant to behave like a real user session (cookies, RLS, etc.)
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This gets saved in auth.users.user_metadata
        data: {
          role,
        },
        // When the user clicks the email confirmation link, they come back here
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
      },
    })

    // -----------------------------
    // 6) Handle signup errors safely
    // -----------------------------
    if (error) {
      console.error('[Signup] Supabase signup error:', error)
      
      // 🔐 SECURITY BALANCE:
      // We show "user already exists" for better UX (low security risk)
      // But hide internal/database errors (high security risk)
      
      // Check for weak password error first (status 422 with code 'weak_password')
      if (error.code === 'weak_password' || error.message?.toLowerCase().includes('password should')) {
        return NextResponse.json(
          { 
            error: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers',
            code: 'WEAK_PASSWORD'
          },
          { status: 400 }
        )
      }
      
      // Check if user already exists
      if (error.message?.toLowerCase().includes('already registered') || 
          error.message?.toLowerCase().includes('user already exists')) {
        return NextResponse.json(
          { 
            error: 'An account with this email already exists',
            code: 'USER_ALREADY_EXISTS'
          },
          { status: 400 }
        )
      }
      
      // For any other error, return generic message (security)
      return NextResponse.json(
        { error: 'Signup failed. Please try again.' },
        { status: 400 }
      )
    }

    // -----------------------------
    // 7) Track signup IP (service role)
    // -----------------------------
    // We do this only if a user was created.
    if (data.user) {
      // This table must NOT be writable by normal users (RLS should block it),
      // so we insert using the service role.
      await getServiceSupabase()
        .from('signup_ip_tracking')
        .insert({
          ip_address: clientIP,
          user_agent: userAgent
        })
    }

    // -----------------------------
    // 8) Return response to frontend
    // -----------------------------
    // Two possible outcomes:
    // - data.session exists: user is immediately logged in (usually dev / auto-confirm)
    // - data.session is null: email confirmation is required
    if (data.user && data.session) {
      return NextResponse.json({ success: true, userId: data.user.id })
    }

    if (data.user && !data.session) {
      return NextResponse.json({
        success: true,
        userId: data.user.id,
        message: 'Please check your email to confirm your account'
      })
    }
    
    // Fallback (rare): user is null but no error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // 🔐 SECURITY:
    // Don't expose raw error.message — it can leak internal info.
    return NextResponse.json(
      { error: 'Signup failed' }, // 🔐
      { status: 500 }
    )
  }
}