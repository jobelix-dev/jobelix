/**
 * Get Current Draft API Route
 * 
 * Retrieves or creates the current student_profile_draft for logged-in user.
 * Route: GET /api/resume/get-draft (no draftId parameter)
 * Called by: StudentDashboard on mount to load draft state
 * Returns: Most recent draft or creates empty draft for manual entry
 */

import { createClient } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get most recent draft
    const { data: existingDraft, error: fetchError } = await supabase
      .from('student_profile_draft')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('Fetch draft error:', fetchError)
      return new Response('Failed to fetch draft', { status: 500 })
    }

    if (existingDraft) {
      return Response.json({ draft: existingDraft })
    }

    // Create empty draft if none exists
    const { data: newDraft, error: createError } = await supabase
      .from('student_profile_draft')
      .insert({
        student_id: user.id,
        student_name: null,
        phone_number: null,
        email: null,
        address: null,
        education: [],
        experience: [],
        status: 'extracting',
      })
      .select()
      .single()

    if (createError || !newDraft) {
      console.error('Create draft error:', createError)
      return new Response('Failed to create draft', { status: 500 })
    }

    return Response.json({ draft: newDraft })
  } catch (error: any) {
    console.error('Get current draft error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
