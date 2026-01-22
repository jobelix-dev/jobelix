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

  console.log('[Callback] Starting callback process')
  console.log('[Callback] Code present:', !!code)
  console.log('[Callback] Next URL:', next)

  if (code) {
    const supabase = await createClient()
    
    console.log('[Callback] Exchanging code for session...')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
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
    console.log('[Callback] User after exchange:', user ? user.id : 'null')
    console.log('[Callback] User error:', userError)
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
