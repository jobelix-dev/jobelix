/**
 * Update Password API Route
 *
 * Route: POST /api/auth/update-password
 *
 * What this route does:
 * - Allows a user to set a NEW password
 * - This is typically called AFTER the user clicks the password reset email link
 *
 * Important security assumption (VERY IMPORTANT):
 * - The reset link logs the user in temporarily (via cookies)
 * - supabase.auth.updateUser() ONLY works if the user is authenticated
 * - If someone calls this route without a valid reset session → it will fail
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    /**
     * 1) Read the request body
     *
     * Expected shape:
     * { password: string }
     */
    const { password } = await request.json()

    /**
     * 2) Basic server-side validation
     * Never trust frontend validation alone.
     */
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    /**
     * Beginner note:
     * - Supabase itself has password rules
     * - This check is an EARLY guard to give faster feedback
     */
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    /**
     * 3) Create a Supabase client using cookies
     *
     * IMPORTANT:
     * - This client reads auth cookies automatically
     * - If the user clicked the reset link, Supabase set a temporary session
     * - If there is NO valid session, updateUser() will fail
     */
    const supabase = await createClient()
    
    /**
     * 4) Update the password for the currently authenticated user
     *
     * SECURITY NOTE:
     * - We do NOT pass a user id here
     * - Supabase updates ONLY the logged-in user
     * - This prevents changing someone else's password
     */
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      /**
       * 🔐 SECURITY:
       * - Do NOT return error.message to the client directly
       * - Check for specific known errors and return user-friendly messages
       */
      console.error('Supabase updateUser error:', error);
      
      // Check for specific password-related errors
      if (error.code === 'same_password' || error.message?.includes('same_password') || error.message?.includes('Password should be different')) {
        return NextResponse.json(
          { error: 'New password should be different from your current password' },
          { status: 400 }
        )
      }
      
      // Check for expired/invalid session errors (when reset link has expired)
      if (error.code === 'invalid_grant' || error.code === 'expired_token' || error.code === 'session_not_found' || 
          error.message?.includes('invalid') || error.message?.includes('expired') || error.message?.includes('session')) {
        return NextResponse.json(
          { error: 'This password reset link has expired. Please request a new password reset.' },
          { status: 400 }
        )
      }
      
      // Check for weak password errors
      if (error.message?.includes('weak') || error.message?.includes('Password should be at least')) {
        return NextResponse.json(
          { error: 'Password is too weak. Please choose a stronger password.' },
          { status: 400 }
        )
      }

      // Generic error for other cases
      return NextResponse.json(
        { error: 'Failed to update password' }, // 🔐
        { status: 400 }
      )
    }

    /**
     * 5) Success
     *
     * At this point:
     * - Password has been updated
     * - Supabase invalidates old sessions automatically
     */
    return NextResponse.json({ success: true })
  } catch (error: any) {
    /**
     * 🔐 SECURITY:
     * - Never expose raw server errors to the client
     * - They may leak internal implementation details
     */
    return NextResponse.json(
      { error: 'Failed to update password' }, // 🔐
      { status: 500 }
    )
  }
}
