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
import { loginSchema } from '@/lib/server/validation'


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
    const body = await request.json()

    /**
     * Validate input using Zod schema.
     * If validation fails, return structured error messages.
     */
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors: result.error.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    const { email, password, captchaToken } = result.data


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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken: captchaToken ?? undefined,
      },
    })

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
  } catch {
    /**
     * Catch any unexpected error (bad JSON, server crash, etc.)
     * and return a generic server error.
     */
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
