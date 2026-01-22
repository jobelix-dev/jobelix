/**
 * LOGIN API ROUTE (server-side)
 *
 * This file defines a backend endpoint that runs on the SERVER, not in the browser.
 *
 * When the frontend sends a POST request to /api/auth/login with:
 *   - an email
 *   - a password
 *
 * this code asks Supabase (our authentication service) to check the credentials.
 *
 * If the credentials are correct:
 *   - Supabase creates a login session
 *   - The session is stored in secure cookies automatically
 *
 * The frontend never sees the password or the session token directly.
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server/supabaseServer'
import { getServiceSupabase } from '@/lib/server/supabaseService'


/**
 * This function is called automatically when the server receives
 * a POST request to /api/auth/login.
 */
export async function POST(request: NextRequest) {
  try {
    /**
     * Read the JSON body sent by the browser.
     * We expect it to contain an email and a password.
     */
    const { email, password } = await request.json()

    /**
     * Basic validation:
     * If the user forgot to send the email or password,
     * we stop immediately and return an error.
     */

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }


    /**
     * Create a Supabase client that is allowed to:
     * - authenticate users
     * - set login cookies on the response
     *
     * IMPORTANT:
     * This client uses a public (anon) key,
     * not an admin/service key.
     */
    const supabase = await createClient()

    /**
     * Ask Supabase to check the email + password.
     *
     * If they are correct:
     * - Supabase logs the user in
     * - Secure session cookies are set automatically
     *
     * If they are wrong:
     * - Supabase returns an error
     */
    console.log('[Login] Attempting login for email:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('[Login] Login result - user exists:', !!data.user)
    console.log('[Login] Login result - session created:', !!data.session)
    console.log('[Login] Login error:', error ? { message: error.message, status: error.status } : null)

    /**
     * If login failed, let's check if the user account exists at all
     * This helps debug whether it's credentials vs account state issues
     */
    if (error) {
      console.log('[Login] Login failed, checking if user exists in database...')
      const serviceClient = getServiceSupabase()
      const { data: userData, error: userError } = await serviceClient.auth.admin.getUserByEmail(email)
      console.log('[Login] User exists in auth:', !!userData.user)
      console.log('[Login] User email confirmed:', userData.user?.email_confirmed_at ? true : false)
      console.log('[Login] User disabled:', userData.user?.disabled ? true : false)
      console.log('[Login] User check error:', userError)
    }

    /**
     * If login failed, return a generic error.
     * We do NOT reveal whether the email or password was incorrect
     * for security reasons.
     */
    if (error) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    /**
     * Login succeeded.
     * We return a simple success message.
     * The actual login state is stored in cookies.
     */
    return NextResponse.json({ success: true })
  } catch (error: any) {
    /**
     * Catch any unexpected error (bad JSON, server crash, etc.)
     * and return a generic server error.
     */
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
