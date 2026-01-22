/**
 * Auth Callback Route Handler
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

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      // Check for expired/invalid code errors
      if (error.message?.includes('expired') || error.message?.includes('invalid') || error.code === 'invalid_grant') {
        return NextResponse.redirect(new URL(`/login?error=This+password+reset+link+has+expired.+Please+request+a+new+one.`, requestUrl.origin))
      }
      // Redirect to login with error
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }
  } else {
    // No code provided, redirect with error
    return NextResponse.redirect(new URL(`/login?error=Invalid+or+expired+link`, requestUrl.origin))
  }

  // Redirect to the specified next URL (dashboard or update-password)
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

export const dynamic = 'force-dynamic';
