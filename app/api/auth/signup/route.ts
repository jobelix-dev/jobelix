/**
 * Signup API Route
 * 
 * Creates new user account with Supabase Auth and initializes profile.
 * Route: POST /api/auth/signup
 * Called by: lib/api.ts signup() function
 * Creates: auth.users entry + student/company table entry
 * Validates: Email, password, role (student or company)
 * Rate Limiting: Max 3 signups per IP per 24 hours
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import serviceSupabase from '@/lib/supabaseService'

// Rate limiting configuration
const MAX_SIGNUPS_PER_IP = 3  // Maximum signups allowed per IP
const RATE_LIMIT_HOURS = 24    // Time window in hours

/**
 * Extract client IP address from request
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
  
  // Fallback for unknown IP
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      )
    }

    if (role !== 'student' && role !== 'company') {
      return NextResponse.json(
        { error: 'Role must be either "student" or "company"' },
        { status: 400 }
      )
    }

    // Get client IP for rate limiting
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    console.log(`[Signup] Attempt from IP: ${clientIP}`)

    // Check IP rate limit
    const { data: signupCount, error: countError } = await serviceSupabase
      .rpc('count_recent_signups_from_ip', {
        p_ip_address: clientIP,
        p_hours_ago: RATE_LIMIT_HOURS
      })

    if (countError) {
      console.error('[Signup] Error checking IP rate limit:', countError)
      // Don't block signup if rate limit check fails, just log it
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

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Signup error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (data.user && data.session) {
      // Track IP after successful signup
      const userAgent = request.headers.get('user-agent') || 'unknown'
      await serviceSupabase.from('signup_ip_tracking').insert({
        ip_address: clientIP,
        user_agent: userAgent
      })
      
      // Auto-confirm enabled (local dev)
      return NextResponse.json({ success: true, userId: data.user.id })
    } else if (data.user && !data.session) {
      // Track IP after successful signup
      const userAgent = request.headers.get('user-agent') || 'unknown'
      await serviceSupabase.from('signup_ip_tracking').insert({
        ip_address: clientIP,
        user_agent: userAgent
      })
      
      // Email confirmation required
      return NextResponse.json({ 
        success: true, 
        userId: data.user.id,
        message: 'Please check your email to confirm your account' 
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Signup failed' },
      { status: 500 }
    )
  }
}
