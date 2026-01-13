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

    // Check if preferences already exist
    const { data: existing } = await supabase
      .from('student_work_preferences')
      .select('id')
      .eq('student_id', user.id)
      .maybeSingle()

    let data, error

    if (existing) {
      // Update existing preferences
      const result = await supabase
        .from('student_work_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', user.id)
        .select()
        .single()
      
      data = result.data
      error = result.error
    } else {
      // Insert new preferences
      const result = await supabase
        .from('student_work_preferences')
        .insert({
          student_id: user.id,
          ...preferences
        })
        .select()
        .single()
      
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Error saving work preferences:', error)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: data })
  } catch (error: any) {
    console.error('Work preferences save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
