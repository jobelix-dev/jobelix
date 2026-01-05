/**
 * Finalize Profile API Route
 * 
 * Transfers validated data from draft to permanent student/academic/experience tables.
 * Route: POST /api/student/profile/draft/finalize
 * Called by: ProfileEditor after all fields are validated
 * Strategy: Transform draft → DB records, then call PostgreSQL RPC for atomic save
 * 
 * Architecture:
 * - Pure functions handle data transformation (lib/draftMappers.ts)
 * - PostgreSQL RPC handles all DB operations atomically (single transaction)
 * - API route is pure orchestration (no business logic)
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { 
  mapDraftToStudent, 
  mapDraftToAcademic, 
  mapDraftToExperience,
  mapDraftToProjects,
  mapDraftToSkills,
  mapDraftToLanguages,
  mapDraftToPublications,
  mapDraftToCertifications,
  mapDraftToSocialLinks
} from '@/lib/draftMappers'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth
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

    // Transform draft data using pure functions
    const studentData = mapDraftToStudent(draft, user.id)
    const academicData = mapDraftToAcademic(draft, user.id)
    const experienceData = mapDraftToExperience(draft, user.id)
    const projectsData = mapDraftToProjects(draft, user.id)
    const skillsData = mapDraftToSkills(draft, user.id)
    const languagesData = mapDraftToLanguages(draft, user.id)
    const publicationsData = mapDraftToPublications(draft, user.id)
    const certificationsData = mapDraftToCertifications(draft, user.id)
    const socialLinksData = mapDraftToSocialLinks(draft, user.id)

    console.log('Social links data being sent to RPC:', JSON.stringify(socialLinksData, null, 2))

    // Call PostgreSQL RPC for atomic database operations
    const { data: result, error: rpcError } = await supabase.rpc('finalize_student_profile', {
      p_user_id: user.id,
      p_profile: studentData,
      p_education: academicData,
      p_experience: experienceData,
      p_projects: projectsData,
      p_skills: skillsData,
      p_languages: languagesData,
      p_publications: publicationsData,
      p_certifications: certificationsData,
      p_social_links: socialLinksData
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Failed to save profile', details: rpcError.message },
        { status: 500 }
      )
    }

    // Check if RPC returned an error (in success:false format)
    if (result && !result.success) {
      console.error('Profile finalization failed:', result)
      return NextResponse.json(
        { error: result.error || 'Failed to save profile', details: result.detail },
        { status: 500 }
      )
    }

    // Mark draft as confirmed
    await supabase
      .from('student_profile_draft')
      .update({ status: 'confirmed' })
      .eq('id', draftId)
      .eq('student_id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Profile data saved successfully',
      data: result
    })
  } catch (error: any) {
    console.error('Finalize profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to finalize profile' },
      { status: 500 }
    )
  }
}
