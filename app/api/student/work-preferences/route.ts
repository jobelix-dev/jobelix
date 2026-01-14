/**
 * Work Preferences API Routes
 * 
 * GET - Fetch student's work preferences
 * POST - Save/update student's work preferences
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'

export async function GET() {
  try {
    const auth = await authenticateRequest()
    if (auth.error) return auth.error

    const { user, supabase } = auth

    const { data: preferences, error } = await supabase
      .from('student_work_preferences')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching work preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Work preferences fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.error) return auth.error

    const { user, supabase } = auth

    const preferences = await request.json()

    // Use UPSERT to handle both insert and update in one operation
    // This works with the RLS policy and avoids race conditions
    const { data, error } = await supabase
      .from('student_work_preferences')
      .upsert({
        student_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving work preferences:', error)
      return NextResponse.json({ error: 'Failed to save preferences', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: data })
  } catch (error: any) {
    console.error('Work preferences save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
