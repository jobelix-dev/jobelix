/**
 * Auth Callback Route Handler
 * 
 * When link in email is clicked
 * // Supabase internally validates the PKCE token
// Confirms the email address
// Creates a temporary authorization code and then calls :
// GET https://www.jobelix.fr/auth/callback?code=temp-auth-code
 * 
 * Handles email confirmation and password reset redirects from Supabase Auth.
 * When user clicks confirmation/reset link in email, Supabase redirects here with a code.
 * This route exchanges the code for a session and redirects to the appropriate page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server/supabaseServer'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  console.log('[Callback] ===== STARTING CALLBACK PROCESS =====')
  console.log('[Callback] Full URL:', requestUrl.toString())
  console.log('[Callback] Code present:', !!code)
  console.log('[Callback] Code value:', code ? code.substring(0, 10) + '...' : 'null')
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

  if (code) {
    const supabase = await createClient()
    
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
        return NextResponse.redirect(new URL(`/login?error=This+password+reset+link+has+expired.+Please+request+a+new+one.`, requestUrl.origin))
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
    
  } else {
    console.log('[Callback] No code provided, redirecting to login')
    // No code provided, redirect with error
    return NextResponse.redirect(new URL(`/login?error=Invalid+or+expired+link`, requestUrl.origin))
  }

  console.log('[Callback] Redirecting to:', next)
  // Redirect to the specified next URL (dashboard or update-password)
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

export const dynamic = 'force-dynamic';
