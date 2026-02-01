/**
 * Work Preferences API Routes
 * 
 * GET - Fetch student's work preferences
 * POST - Save/update student's work preferences
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'
import { validateRequest, workPreferencesSchema } from '@/lib/server/validation'
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting'

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
  } catch (error: unknown) {
    console.error('Work preferences fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.error) return auth.error

    const { user, supabase } = auth

    // Rate limiting: 20 updates per hour, 100 per day
    const rateLimitResult = await checkRateLimit(user.id, {
      endpoint: 'work-preferences',
      hourlyLimit: 20,
      dailyLimit: 100,
    })

    if (rateLimitResult.error) return rateLimitResult.error
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(
        { endpoint: 'work-preferences', hourlyLimit: 20, dailyLimit: 100 },
        rateLimitResult.data
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateRequest(body, workPreferencesSchema)
    
    if (validation.error) {
      return NextResponse.json(validation.error, { status: validation.error.status })
    }

    const preferences = validation.data

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
      return NextResponse.json({ 
        error: 'Failed to save preferences' 
      }, { status: 500 })
    }

    // Log the API call for rate limiting
    await logApiCall(user.id, 'work-preferences')

    return NextResponse.json({ success: true, preferences: data })
  } catch (error: unknown) {
    console.error('Work preferences save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
