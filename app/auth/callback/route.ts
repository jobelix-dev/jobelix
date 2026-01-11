/**
 * Auth Callback Route
 * 
 * Handles email confirmation and magic link redirects from Supabase Auth.
 * When user clicks confirmation link in email, Supabase redirects here with a code.
 * This route exchanges the code for a session and redirects to dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

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
      // Redirect to login with error
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }
  }

  // Redirect to the dashboard or specified next URL
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
