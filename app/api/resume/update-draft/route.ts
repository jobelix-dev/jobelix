import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
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
