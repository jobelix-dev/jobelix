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
 *    - For OAuth signups: automatically creates a student profile
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
import { getServiceSupabase } from '@/lib/server/supabaseService'
import type { EmailOtpType, User } from '@supabase/supabase-js'

/**
 * Ensure OAuth user has a student profile.
 * OAuth users don't have a role in user_metadata, so the trigger doesn't create a profile.
 * We default all OAuth signups to student (talent) role.
 */
async function ensureStudentProfile(userId: string, email: string): Promise<void> {
  const supabaseAdmin = getServiceSupabase()
  
  // Check if user already has a profile (student or company)
  const { data: studentData } = await supabaseAdmin
    .from('student')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  
  if (studentData) {
    console.log('[Callback] User already has student profile')
    return
  }
  
  const { data: companyData } = await supabaseAdmin
    .from('company')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  
  if (companyData) {
    console.log('[Callback] User already has company profile')
    return
  }
  
  // No profile exists - create student profile for OAuth user
  console.log('[Callback] Creating student profile for OAuth user:', email)
  
  const { error: insertError } = await supabaseAdmin
    .from('student')
    .insert({ id: userId, mail_adress: email })
  
  if (insertError) {
    console.error('[Callback] Failed to create student profile:', insertError)
    // Don't throw - user can still log in, just won't have a profile yet
    return
  }
  
  // Also create API token for the user (matching the trigger behavior)
  const { error: tokenError } = await supabaseAdmin.rpc('create_api_token_if_missing', {
    p_user_id: userId
  })
  
  if (tokenError) {
    // Try direct insert as fallback
    console.log('[Callback] RPC failed, trying direct insert for API token')
    const { error: directTokenError } = await supabaseAdmin
      .from('api_tokens')
      .insert({ user_id: userId, token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '') })
    
    if (directTokenError) {
      console.warn('[Callback] Failed to create API token:', directTokenError)
    }
  }
  
  console.log('[Callback] Student profile created successfully')
}

/**
 * Save GitHub OAuth connection for users who signed in via GitHub.
 * This allows them to use GitHub profile import without reconnecting.
 * 
 * Supabase provides the GitHub access token in the user's identities array.
 */
async function saveGitHubConnectionFromOAuth(user: User): Promise<void> {
  // Check if user signed in via GitHub
  const githubIdentity = user.identities?.find(id => id.provider === 'github')
  
  if (!githubIdentity) {
    console.log('[Callback] Not a GitHub OAuth login, skipping connection save')
    return
  }
  
  // Get the provider token from user metadata
  // Supabase stores OAuth provider data in app_metadata and identity_data
  const providerToken = user.user_metadata?.provider_token
  const githubUsername = githubIdentity.identity_data?.user_name || 
                         githubIdentity.identity_data?.preferred_username ||
                         user.user_metadata?.user_name
  const githubName = githubIdentity.identity_data?.name || user.user_metadata?.name
  const githubAvatarUrl = githubIdentity.identity_data?.avatar_url || user.user_metadata?.avatar_url
  
  if (!providerToken) {
    console.log('[Callback] No GitHub provider token available, cannot save connection')
    console.log('[Callback] user_metadata:', JSON.stringify(user.user_metadata, null, 2))
    return
  }
  
  console.log('[Callback] Saving GitHub OAuth connection for user:', user.email, 'github:', githubUsername)
  
  const supabaseAdmin = getServiceSupabase()
  
  // Check if connection already exists
  const { data: existingConnection } = await supabaseAdmin
    .from('oauth_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'github')
    .maybeSingle()
  
  if (existingConnection) {
    // Update existing connection with new token
    console.log('[Callback] Updating existing GitHub connection')
    const { error: updateError } = await supabaseAdmin
      .from('oauth_connections')
      .update({
        access_token: providerToken,
        token_type: 'bearer',
        scope: 'read:user', // Supabase default scope
        metadata: {
          username: githubUsername,
          name: githubName,
          avatar_url: githubAvatarUrl,
          profile_url: githubUsername ? `https://github.com/${githubUsername}` : null,
          synced_from_auth: true
        },
        connected_at: new Date().toISOString()
      })
      .eq('id', existingConnection.id)
    
    if (updateError) {
      console.error('[Callback] Failed to update GitHub connection:', updateError)
    }
    return
  }
  
  // Create new connection
  const { error: insertError } = await supabaseAdmin
    .from('oauth_connections')
    .insert({
      user_id: user.id,
      provider: 'github',
      access_token: providerToken,
      token_type: 'bearer',
      scope: 'read:user', // Supabase default scope
      metadata: {
        username: githubUsername,
        name: githubName,
        avatar_url: githubAvatarUrl,
        profile_url: githubUsername ? `https://github.com/${githubUsername}` : null,
        synced_from_auth: true
      },
      connected_at: new Date().toISOString()
    })
  
  if (insertError) {
    console.error('[Callback] Failed to save GitHub connection:', insertError)
  } else {
    console.log('[Callback] GitHub OAuth connection saved successfully')
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // Extract all possible auth parameters
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const isPopup = requestUrl.searchParams.get('popup') === 'true'

  console.log('[Callback] ===== STARTING CALLBACK PROCESS =====')
  console.log('[Callback] Full URL:', requestUrl.toString())
  console.log('[Callback] Code present:', !!code)
  console.log('[Callback] Token present:', !!token)
  console.log('[Callback] Token hash present:', !!token_hash)
  console.log('[Callback] Type:', type)
  console.log('[Callback] Next URL:', next)
  console.log('[Callback] Is Popup:', isPopup)
  console.log('[Callback] Origin:', requestUrl.origin)
  console.log('[Callback] Host:', request.headers.get('host'))

  // Helper to redirect appropriately based on popup mode
  const redirectTo = (path: string) => {
    if (isPopup) {
      // For popups, redirect to a page that closes the popup
      const popupUrl = new URL('/auth/callback-success', requestUrl.origin)
      if (path.includes('error=')) {
        // Pass error to popup
        popupUrl.searchParams.set('error', new URL(path, requestUrl.origin).searchParams.get('error') || 'Unknown error')
      }
      return NextResponse.redirect(popupUrl)
    }
    return NextResponse.redirect(new URL(path, requestUrl.origin))
  }

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
        return redirectTo(`/login?error=This+link+has+expired.+Please+request+a+new+one.`)
      }
      console.log('[Callback] Redirecting to login due to other error')
      return redirectTo(`/login?error=${encodeURIComponent(error.message)}`)
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
      return redirectTo(`/login?error=Authentication+failed`)
    }
    
    if (!user.email_confirmed_at) {
      console.log('[Callback] User email not confirmed yet, but exchange succeeded')
    } else {
      console.log('[Callback] User email confirmed at:', user.email_confirmed_at)
    }
    
    // For OAuth signups, ensure the user has a student profile
    // This handles new OAuth users who don't have a role in metadata
    if (user.email) {
      await ensureStudentProfile(user.id, user.email)
    }
    
    // For GitHub OAuth, save the connection for profile import
    // This allows users to immediately sync their GitHub repos/projects
    await saveGitHubConnectionFromOAuth(user)
    
    console.log('[Callback] Redirecting to:', isPopup ? '/auth/callback-success' : next)
    return redirectTo(next)
  }
  
  // ===========================================
  // NO VALID AUTH PARAMETERS
  // ===========================================
  console.log('[Callback] No valid auth parameters (code, token, or token_hash)')
  return redirectTo(`/login?error=Invalid+or+expired+link`)
}

export const dynamic = 'force-dynamic'
