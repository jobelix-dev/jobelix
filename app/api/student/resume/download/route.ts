/**
 * Resume Download API Route
 * 
 * Downloads user's resume PDF from Supabase Storage.
 * Route: GET /api/student/resume/download
 * Called by: ResumeSection "Download Resume" button
 * Returns: PDF file as blob with proper Content-Disposition header
 * Security: Users can only download their own resumes
 */

import "server-only";

import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'

export async function GET() {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    const userId = user.id
    const filePath = `${userId}/resume.pdf`

    const { data, error } = await supabase.storage
      .from('resumes')
      .download(filePath)

    if (error) {
      console.error('Resume download error:', error)
      return NextResponse.json(
        { error: 'Resume not found' },
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
    console.error('Resume download error:', error)
    return NextResponse.json(
      { error: 'Failed to download resume' },
      { status: 500 }
    )
  }
}
