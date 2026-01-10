/**
 * POST /api/student/work-preferences/save
 * 
 * Save or update student's work preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await request.json()

    // Upsert preferences (insert or update)
    const { data, error } = await supabase
      .from('student_work_preferences')
      .upsert({
        student_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id'
      })
      .select()
      .single()

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
