/**
 * LOGOUT API ROUTE (server-side)
 *
 * This endpoint runs on the SERVER.
 *
 * When the frontend sends a POST request to /api/auth/logout,
 * we ask Supabase to log the user out.
 *
 * Logging out means:
 * - Supabase clears the authentication cookies (the "login session")
 * - The user will no longer be considered logged in on future requests
 *
 * IMPORTANT:
 * - We do not delete the user's data
 * - We only remove the login session
 */

import "server-only";

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/server/supabaseServer'
import { enforceSameOrigin } from '@/lib/server/csrf'

export async function POST(request?: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request)
    if (csrfError) return csrfError

    /**
     * Create a Supabase client that can read/clear the user's session cookies.
     * This should be the normal server client (anon key + cookie handling),
     * NOT the service role key.
     */
    const supabase = await createClient()

    /**
     * Ask Supabase to sign the user out.
     * If the user is already logged out, this should still be safe to call.
     */
    const { error } = await supabase.auth.signOut();

    if (error) {
      const isMissingSession =
        error.name === 'AuthSessionMissingError' ||
        error.message?.toLowerCase().includes('auth session missing');

      if (isMissingSession) {
        // Treat missing session as a successful logout (idempotent).
        return NextResponse.json({ success: true, alreadyLoggedOut: true });
      }
      // Log full details on the server for debugging
      console.error("Supabase signOut error:", error);
      // Return a generic message to the browser
      return NextResponse.json({ error: "Logout failed" }, { status: 500 });
    }

    /**
     * Logout succeeded. Cookies are cleared.
     */
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    /**
     * Catch unexpected server errors and return a generic message.
     * Avoid returning internal error details to the browser.
     */
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
