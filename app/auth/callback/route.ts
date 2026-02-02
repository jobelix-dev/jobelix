/**
 * Auth Callback Route Handler
 * 
 * Handles two authentication flows from Supabase:
 * 
 * 1. TOKEN-BASED FLOW (Password Reset Emails):
 *    - Supabase sends: /auth/callback?token=xxx&type=recovery&redirect_to=...
 *    - Or newer: /auth/callback?token_hash=xxx&type=recovery
 *    - We verify with: supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
 * 
 * 2. CODE-BASED PKCE FLOW (OAuth, Email Confirmation):
 *    - Supabase sends: /auth/callback?code=xxx
 *    - We exchange with: supabase.auth.exchangeCodeForSession(code)
 * 
 * WHY BOTH FLOWS?
 * When using resetPasswordForEmail() with service role key (server-side),
 * Supabase uses the token-based flow (not PKCE). This is actually MORE secure
 * for cross-browser scenarios (user requests reset in Electron, clicks in Chrome)
 * because there's no PKCE code_verifier that needs to match.
 * 
 * SECURITY:
 * - verifyOtp() validates token server-side with Supabase
 * - Token is single-use and expires after otp_expiry (1 hour)
 * - Session is created and stored in HTTP-only cookies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server/supabaseServer'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // Extract all possible auth parameters
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  console.log('[Callback] ===== STARTING CALLBACK PROCESS =====')
  console.log('[Callback] Full URL:', requestUrl.toString())
  console.log('[Callback] Code present:', !!code)
  console.log('[Callback] Token present:', !!token)
  console.log('[Callback] Token hash present:', !!token_hash)
  console.log('[Callback] Type:', type)
  console.log('[Callback] Next URL:', next)
  console.log('[Callback] Origin:', requestUrl.origin)
  console.log('[Callback] Host:', request.headers.get('host'))

  // WORKAROUND: If we're on the wrong domain (www.jobelix.fr instead of preview URL),
  // redirect to the correct preview URL
  const currentHost = request.headers.get('host')
  const isWrongDomain = currentHost === 'www.jobelix.fr' || currentHost?.includes('jobelix.fr')
  
  if (isWrongDomain) {
    // Determine the correct preview URL from environment or headers
    let correctUrl = process.env.NEXT_PUBLIC_APP_URL
    
    if (!correctUrl) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
      
      if (forwardedHost) {
        correctUrl = `${forwardedProto}://${forwardedHost}`
      }
    }
    
    if (correctUrl && correctUrl !== requestUrl.origin) {
      console.log('[Callback] Wrong domain detected! Redirecting from', requestUrl.origin, 'to', correctUrl)
      const correctCallbackUrl = new URL(requestUrl.pathname + requestUrl.search, correctUrl)
      return NextResponse.redirect(correctCallbackUrl)
    }
  }

  const supabase = await createClient()

  // ===========================================
  // FLOW 1: Token-based flow (Password Reset)
  // ===========================================
  // Supabase password reset emails use token/token_hash with type=recovery
  const effectiveToken = token_hash || token
  if (effectiveToken && type) {
    console.log('[Callback] Using token-based flow for type:', type)
    
    // Validate that type is a valid recovery/verification type
    const validTypes: EmailOtpType[] = ['recovery', 'email', 'signup', 'invite', 'magiclink', 'email_change']
    if (!validTypes.includes(type)) {
      console.error('[Callback] Invalid OTP type:', type)
      return NextResponse.redirect(new URL(`/login?error=Invalid+link+type`, requestUrl.origin))
    }
    
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: effectiveToken,
      type: type,
    })
    
    console.log('[Callback] verifyOtp result - session exists:', !!data?.session)
    console.log('[Callback] verifyOtp result - user exists:', !!data?.user)
    
    if (error) {
      console.error('[Callback] verifyOtp error:', error.message, error.code)
      
      // User-friendly error messages
      if (error.message?.includes('expired') || error.code === 'otp_expired') {
        return NextResponse.redirect(
          new URL(`/login?error=This+link+has+expired.+Please+request+a+new+one.`, requestUrl.origin)
        )
      }
      
      if (error.message?.includes('invalid') || error.code === 'otp_disabled') {
        return NextResponse.redirect(
          new URL(`/login?error=This+link+is+invalid+or+has+already+been+used.`, requestUrl.origin)
        )
      }
      
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message || 'Authentication failed')}`, requestUrl.origin)
      )
    }
    
    if (!data?.user) {
      console.error('[Callback] No user after verifyOtp')
      return NextResponse.redirect(new URL(`/login?error=Authentication+failed`, requestUrl.origin))
    }
    
    console.log('[Callback] Token verified successfully for user:', data.user.email)
    console.log('[Callback] Redirecting to:', next)
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // ===========================================
  // FLOW 2: Code-based PKCE flow (OAuth, etc.)
  // ===========================================
  if (code) {
    console.log('[Callback] Using code-based PKCE flow')
    console.log('[Callback] Code value:', code.substring(0, 10) + '...')
    
    console.log('[Callback] Exchanging code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('[Callback] Exchange result - data.session exists:', !!data?.session)
    console.log('[Callback] Exchange result - data.user exists:', !!data?.user)
    console.log('[Callback] Exchange error:', error)
    
    if (error) {
      console.error('[Callback] Error exchanging code for session:', error)
      // Check for expired/invalid code errors
      if (error.message?.includes('expired') || error.message?.includes('invalid') || error.code === 'invalid_grant') {
        console.log('[Callback] Redirecting to login due to expired/invalid code')
        return NextResponse.redirect(new URL(`/login?error=This+link+has+expired.+Please+request+a+new+one.`, requestUrl.origin))
      }
      console.log('[Callback] Redirecting to login due to other error')
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }

    console.log('[Callback] Session exchange successful, checking user...')
    
    // Verify the session was created
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('[Callback] User after exchange:', user ? { id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at } : 'null')
    
    // Get session information separately
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('[Callback] Session after exchange:', session ? { access_token: session.access_token ? 'present' : 'missing', refresh_token: session.refresh_token ? 'present' : 'missing' } : 'null')
    console.log('[Callback] Session error:', sessionError)
    
    console.log('[Callback] User error:', userError)
    
    if (!user) {
      console.error('[Callback] No user found after successful exchange!')
      return NextResponse.redirect(new URL(`/login?error=Authentication+failed`, requestUrl.origin))
    }
    
    if (!user.email_confirmed_at) {
      console.log('[Callback] User email not confirmed yet, but exchange succeeded')
    } else {
      console.log('[Callback] User email confirmed at:', user.email_confirmed_at)
    }
    
    console.log('[Callback] Redirecting to:', next)
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }
  
  // ===========================================
  // NO VALID AUTH PARAMETERS
  // ===========================================
  console.log('[Callback] No valid auth parameters (code, token, or token_hash)')
  return NextResponse.redirect(new URL(`/login?error=Invalid+or+expired+link`, requestUrl.origin))
}

export const dynamic = 'force-dynamic'
