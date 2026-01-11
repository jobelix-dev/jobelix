/**
 * Reset Password API Route
 * 
 * Sends password reset email to user.
 * Route: POST /api/auth/reset-password
 * Body: { email: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.nextUrl.origin}/update-password`,
    })

    if (error) {
      console.error('Reset password error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send reset email' },
      { status: 500 }
    )
  }
}
