/**
 * Logout API Route
 * 
 * Signs out the current user and clears session.
 * Route: POST /api/auth/logout
 * Called by: Dashboard logout buttons
 * Clears: Supabase auth cookies and session data
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Logout failed' },
      { status: 500 }
    )
  }
}
