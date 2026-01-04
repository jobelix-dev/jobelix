/**
 * Draft Profile API Route
 * 
 * Manages student_profile_draft CRUD operations.
 * Routes: 
 *   GET /api/student/profile/draft - Retrieve or create current draft
 *   PUT /api/student/profile/draft - Update draft fields
 * Called by: ProfileEditor for auto-save and loading draft state
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

/**
 * GET - Retrieve or create the current draft for logged-in user
 */
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
    console.error('Get draft error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * PUT - Update draft fields
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { draftId, updates } = await req.json()

    if (!draftId) {
      return new Response('Draft ID required', { status: 400 })
    }

    // Update the draft with new data
    const { data: draft, error: updateError } = await supabase
      .from('student_profile_draft')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('student_id', user.id)
      .select()
      .single()

    if (updateError || !draft) {
      console.error('Update error:', updateError)
      return new Response('Failed to update draft', { status: 500 })
    }

    return Response.json({
      success: true,
      draft,
    })
  } catch (error: any) {
    console.error('Update draft error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
