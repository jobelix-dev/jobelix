/**
 * Resume Download API Route
 * 
 * Downloads user's resume PDF from Supabase Storage.
 * Route: GET /api/student/resume/download
 * Called by: ResumeSection "Download Resume" button
 * Returns: PDF file as blob with proper Content-Disposition header
 * Security: Users can only download their own resumes
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id
    const filePath = `${userId}/resume.pdf`

    const { data, error } = await supabase.storage
      .from('resumes')
      .download(filePath)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Download failed' },
      { status: 500 }
    )
  }
}
