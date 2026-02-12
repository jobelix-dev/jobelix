/**
 * Auth Callback Route Handler
 * 
 * Handles authentication flows from Supabase and applies referral codes.
 * 
 * Authentication Flows:
 * 
 * 1. TOKEN-BASED FLOW (Password Reset, Email Confirmation):
 *    - Supabase sends: /auth/callback?token_hash=xxx&type=recovery|signup
 *    - We verify with: supabase.auth.verifyOtp({ token_hash, type })
 * 
 * 2. CODE-BASED PKCE FLOW (OAuth):
 *    - Supabase sends: /auth/callback?code=xxx
 *    - We exchange with: supabase.auth.exchangeCodeForSession(code)
 * 
 * Referral Code Handling:
 * - Referral code can come from:
 *   1. URL parameter: ?referral_code=XXX (passed through OAuth redirect)
 *   2. Cookie: jobelix_referral (set when user lands on /signup?ref=XXX)
 * - Code is applied server-side after successful authentication
 * - This ensures referrals work across platforms (browser -> Electron)
 * 
 * For OAuth Signups:
 * - Automatically creates a student profile if user doesn't have one
 * - Saves GitHub OAuth connection for profile import
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server/supabaseServer'
import { getServiceSupabase } from '@/lib/server/supabaseService'
import type { EmailOtpType, User } from '@supabase/supabase-js'
import { 
  validateReferralCode, 
  REFERRAL_COOKIE_NAME,
  extractReferralCodeFromUrl 
} from '@/lib/shared/referral'

/**
 * Apply a referral code for a newly authenticated user.
 * This is called server-side to ensure reliability.
 * 
 * @param userId - The user's ID
 * @param referralCode - The referral code to apply
 * @returns true if applied successfully, false otherwise
 */
async function applyReferralCodeServerSide(userId: string, referralCode: string): Promise<boolean> {
  const supabaseAdmin = getServiceSupabase()
  
  console.log('[Callback] Applying referral code server-side for user:', userId)
  
  try {
    // Use the admin version that accepts user_id as parameter
    // The regular apply_referral_code uses auth.uid() which is NULL for service_role
    const { data: result, error } = await supabaseAdmin
      .rpc('apply_referral_code_admin', { p_user_id: userId, p_code: referralCode })
    
    if (error) {
      console.error('[Callback] Failed to apply referral code (RPC error):', error)
      return false
    }
    
    const row = result?.[0]
    if (!row?.success) {
      // This is expected for existing users, users who already used a code, etc.
      console.log('[Callback] Referral code not applied:', row?.error_message)
      return false
    }
    
    console.log('[Callback] Referral code applied successfully')
    return true
  } catch (error) {
    console.error('[Callback] Error applying referral code:', error)
    return false
  }
}

/**
 * Get referral code from URL params, cookie, or user metadata.
 * Priority: URL > Cookie > User metadata
 * 
 * URL param is most reliable for OAuth (passed through redirect)
 * Cookie works for same-browser email confirmation
 * User metadata works for cross-browser email confirmation
 */
function getReferralCodeFromRequest(
  request: NextRequest, 
  url: URL, 
  user?: User | null
): string | null {
  // Try URL parameter first (passed through OAuth redirect)
  const fromUrl = extractReferralCodeFromUrl(url.searchParams)
  if (fromUrl) {
    console.log('[Callback] Found referral code in URL:', fromUrl)
    return fromUrl
  }
  
  // Fall back to cookie (set when user landed on signup page)
  const fromCookie = request.cookies.get(REFERRAL_COOKIE_NAME)?.value
  const validatedCookie = validateReferralCode(fromCookie)
  if (validatedCookie) {
    console.log('[Callback] Found referral code in cookie:', validatedCookie)
    return validatedCookie
  }
  
  // Fall back to user metadata (stored during signup for cross-browser support)
  if (user?.user_metadata?.referral_code) {
    const fromMetadata = validateReferralCode(user.user_metadata.referral_code)
    if (fromMetadata) {
      console.log('[Callback] Found referral code in user metadata:', fromMetadata)
      return fromMetadata
    }
  }
  
  return null
}

/**
 * Create a response that clears the referral cookie.
 */
function clearReferralCookie(response: NextResponse): NextResponse {
  response.cookies.set(REFERRAL_COOKIE_NAME, '', {
    path: '/',
    expires: new Date(0), // Expire immediately
    httpOnly: false,
    sameSite: 'lax',
  })
  return response
}

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
  console.log('[Callback] Creating student profile for OAuth user')
  
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
 */
async function saveGitHubConnectionFromOAuth(user: User): Promise<void> {
  // Check if user signed in via GitHub
  const githubIdentity = user.identities?.find(id => id.provider === 'github')
  
  if (!githubIdentity) {
    return
  }
  
  // Get the provider token from user metadata
  const providerToken = user.user_metadata?.provider_token
  const githubUsername = githubIdentity.identity_data?.user_name || 
                         githubIdentity.identity_data?.preferred_username ||
                         user.user_metadata?.user_name
  const githubName = githubIdentity.identity_data?.name || user.user_metadata?.name
  const githubAvatarUrl = githubIdentity.identity_data?.avatar_url || user.user_metadata?.avatar_url
  
  if (!providerToken) {
    console.log('[Callback] No GitHub provider token available')
    return
  }
  
  console.log('[Callback] Saving GitHub OAuth connection for user')
  
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
    await supabaseAdmin
      .from('oauth_connections')
      .update({
        access_token: providerToken,
        token_type: 'bearer',
        scope: 'read:user',
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
    return
  }
  
  // Create new connection
  await supabaseAdmin
    .from('oauth_connections')
    .insert({
      user_id: user.id,
      provider: 'github',
      access_token: providerToken,
      token_type: 'bearer',
      scope: 'read:user',
      metadata: {
        username: githubUsername,
        name: githubName,
        avatar_url: githubAvatarUrl,
        profile_url: githubUsername ? `https://github.com/${githubUsername}` : null,
        synced_from_auth: true
      },
      connected_at: new Date().toISOString()
    })
  
  console.log('[Callback] GitHub OAuth connection saved')
}

/**
 * Process post-authentication tasks:
 * 1. Ensure user has a profile
 * 2. Apply referral code if present
 * 3. Save GitHub connection if applicable
 */
async function processPostAuth(
  user: User, 
  referralCode: string | null
): Promise<void> {
  // Ensure user has a student profile (for OAuth signups)
  if (user.email) {
    await ensureStudentProfile(user.id, user.email)
  }
  
  // Apply referral code if present
  if (referralCode) {
    await applyReferralCodeServerSide(user.id, referralCode)
  }
  
  // Save GitHub connection for profile import
  await saveGitHubConnectionFromOAuth(user)
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

  // Validate the 'next' parameter to prevent open redirect attacks
  // Must be a relative path starting with '/' but not '//' (protocol-relative URL)
  const safeNext = (next.startsWith('/') && !next.startsWith('//')) ? next : '/dashboard'

  console.log('[Callback] ===== STARTING CALLBACK PROCESS =====')
  console.log('[Callback] Code present:', !!code)
  console.log('[Callback] Token present:', !!token || !!token_hash)
  console.log('[Callback] Type:', type)
  console.log('[Callback] Is Popup:', isPopup)

  // Helper to redirect appropriately based on popup mode
  // Also clears the referral cookie after processing
  const redirectTo = (path: string) => {
    let response: NextResponse
    
    if (isPopup) {
      // For popups, redirect to a page that closes the popup
      const popupUrl = new URL('/auth/callback-success', requestUrl.origin)
      if (path.includes('error=')) {
        popupUrl.searchParams.set('error', new URL(path, requestUrl.origin).searchParams.get('error') || 'Unknown error')
      }
      response = NextResponse.redirect(popupUrl)
    } else {
      response = NextResponse.redirect(new URL(path, requestUrl.origin))
    }
    
    // Clear the referral cookie after processing
    return clearReferralCookie(response)
  }

  // WORKAROUND: If we're on the wrong domain, redirect to the correct one
  const currentHost = request.headers.get('host')
  const isWrongDomain = currentHost === 'www.jobelix.fr' || currentHost?.includes('jobelix.fr')
  
  if (isWrongDomain) {
    let correctUrl = process.env.NEXT_PUBLIC_APP_URL
    
    if (!correctUrl) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
      
      if (forwardedHost) {
        correctUrl = `${forwardedProto}://${forwardedHost}`
      }
    }
    
    if (correctUrl && correctUrl !== requestUrl.origin) {
      console.log('[Callback] Wrong domain detected! Redirecting to', correctUrl)
      const correctCallbackUrl = new URL(requestUrl.pathname + requestUrl.search, correctUrl)
      return NextResponse.redirect(correctCallbackUrl)
    }
  }

  const supabase = await createClient()

  // ===========================================
  // FLOW 1: Token-based flow (Password Reset, Email Confirmation)
  // ===========================================
  const effectiveToken = token_hash || token
  if (effectiveToken && type) {
    console.log('[Callback] Using token-based flow for type:', type)
    
    const validTypes: EmailOtpType[] = ['recovery', 'email', 'signup', 'invite', 'magiclink', 'email_change']
    if (!validTypes.includes(type)) {
      console.error('[Callback] Invalid OTP type:', type)
      return NextResponse.redirect(new URL(`/login?error=Invalid+link+type`, requestUrl.origin))
    }
    
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: effectiveToken,
      type: type,
    })
    
    if (error) {
      console.error('[Callback] verifyOtp error:', error.message)
      
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
    
    console.log('[Callback] Token verified for user:', data.user.id)
    
    // Get referral code from URL, cookie, or user metadata (for cross-browser email confirmation)
    const referralCode = getReferralCodeFromRequest(request, requestUrl, data.user)
    console.log('[Callback] Referral code:', referralCode || '(none)')
    
    // Process post-auth tasks (profile creation, referral application)
    // This is important for email confirmation flow - the user is now authenticated
    await processPostAuth(data.user, referralCode)
    
    return redirectTo(safeNext)
  }

  // ===========================================
  // FLOW 2: Code-based PKCE flow (OAuth)
  // ===========================================
  if (code) {
    console.log('[Callback] Using code-based PKCE flow')
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Callback] Error exchanging code:', error)
      if (error.message?.includes('expired') || error.message?.includes('invalid') || error.code === 'invalid_grant') {
        return redirectTo(`/login?error=This+link+has+expired.+Please+request+a+new+one.`)
      }
      return redirectTo(`/login?error=${encodeURIComponent(error.message)}`)
    }

    // Verify the session was created by getting the user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('[Callback] No user found after exchange')
      return redirectTo(`/login?error=Authentication+failed`)
    }
    
    console.log('[Callback] Session created for user:', user.id)
    
    // Get referral code from URL, cookie, or user metadata
    const referralCode = getReferralCodeFromRequest(request, requestUrl, user)
    console.log('[Callback] Referral code:', referralCode || '(none)')
    
    // Process post-auth tasks (profile creation, referral application, GitHub connection)
    await processPostAuth(user, referralCode)
    
    return redirectTo(safeNext)
  }
  
  // ===========================================
  // NO VALID AUTH PARAMETERS
  // ===========================================
  console.log('[Callback] No valid auth parameters')
  return redirectTo(`/login?error=Invalid+or+expired+link`)
}

export const dynamic = 'force-dynamic'
