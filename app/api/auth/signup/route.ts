/**
 * Signup API Route
 * 
 * Creates new user account with Supabase Auth and initializes profile.
 * Route: POST /api/auth/signup
 * Called by: lib/api.ts signup() function
 * Creates: auth.users entry + student/company table entry
 * Validates: Email, password, role (student or company)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      )
    }

    if (role !== 'student' && role !== 'company') {
      return NextResponse.json(
        { error: 'Role must be either "student" or "company"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Signup error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (data.user && data.session) {
      // Auto-confirm enabled (local dev)
      return NextResponse.json({ success: true, userId: data.user.id })
    } else if (data.user && !data.session) {
      // Email confirmation required
      return NextResponse.json({ 
        success: true, 
        userId: data.user.id,
        message: 'Please check your email to confirm your account' 
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Signup failed' },
      { status: 500 }
    )
  }
}
