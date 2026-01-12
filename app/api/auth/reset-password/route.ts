/**
 * Reset Password API Route
 * 
 * DEPRECATED: This route is no longer used.
 * Password reset should be initiated from the client side to properly handle PKCE flow.
 * See app/reset-password/ResetPasswordForm.tsx for the client-side implementation.
 */

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use client-side password reset.' },
    { status: 410 }
  )
}
