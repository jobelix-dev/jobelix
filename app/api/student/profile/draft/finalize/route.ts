/**
 * Finalize Profile API Route
 * 
 * Transfers validated data from draft to permanent student/academic/experience tables.
 * Route: POST /api/student/profile/draft/finalize
 * Called by: ProfileEditor after all fields are validated
 * Strategy: Delete child records (academic/experience) then UPSERT student record
 * Stores: Year/month as separate INTEGER fields
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { draftId } = await request.json()
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 })
    }

    // Fetch draft
    const { data: draft, error: draftError } = await supabase
      .from('student_profile_draft')
      .select('*')
      .eq('id', draftId)
      .eq('student_id', user.id)
      .single()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Parse name
    const nameParts = draft.student_name?.trim().split(/\s+/) || []
    const firstName = nameParts[0] || null
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null

    // === STEP 1: Delete child records (foreign key dependencies) ===
    await supabase.from('experience').delete().eq('student_id', user.id)
    await supabase.from('academic').delete().eq('student_id', user.id)
    
    // === STEP 2: Upsert student record (insert or update if exists) ===
    const { error: studentError } = await supabase
      .from('student')
      .upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone_number: draft.phone_number || null,
        mail_adress: draft.email || null,
        address: draft.address || null,
      }, {
        onConflict: 'id'
      })

    if (studentError) {
      console.error('Failed to upsert student:', studentError)
      return NextResponse.json(
        { error: 'Failed to save student information', details: studentError.message },
        { status: 500 }
      )
    }

    // === STEP 3: Insert education records ===
    if (draft.education?.length > 0) {
      const educationRecords = draft.education.map((edu: any) => ({
        student_id: user.id,
        school_name: edu.school_name,
        degree: edu.degree,
        description: edu.description || null,
        start_year: edu.start_year,
        start_month: edu.start_month,
        end_year: edu.end_year,
        end_month: edu.end_month,
      }))

      const { error: eduError } = await supabase
        .from('academic')
        .insert(educationRecords)

      if (eduError) {
        console.error('Failed to insert education:', eduError)
        return NextResponse.json(
          { error: 'Failed to save education records', details: eduError.message },
          { status: 500 }
        )
      }
    }

    // === STEP 4: Insert experience records ===
    if (draft.experience?.length > 0) {
      const experienceRecords = draft.experience.map((exp: any) => ({
        student_id: user.id,
        organisation_name: exp.organisation_name,
        position_name: exp.position_name,
        description: exp.description || null,
        start_year: exp.start_year,
        start_month: exp.start_month || null,
        end_year: exp.end_year || null,
        end_month: exp.end_month || null,
      }))

      const { error: expError } = await supabase
        .from('experience')
        .insert(experienceRecords)

      if (expError) {
        console.error('Failed to insert experience:', expError)
        return NextResponse.json(
          { error: 'Failed to save experience records', details: expError.message },
          { status: 500 }
        )
      }
    }

    // === STEP 5: Mark draft as confirmed ===
    await supabase
      .from('student_profile_draft')
      .update({ status: 'confirmed' })
      .eq('id', draftId)
      .eq('student_id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Profile data saved successfully',
    })
  } catch (error: any) {
    console.error('Finalize profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to finalize profile' },
      { status: 500 }
    )
  }
}
