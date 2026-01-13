/**
 * Resume Upload/Retrieve API Route
 * 
 * Handles PDF upload to Supabase Storage and fetches resume metadata.
 * Routes: GET /api/student/resume (fetch info), POST /api/student/resume (upload PDF)
 * Called by: ResumeSection for resume management
 * Storage: Supabase 'resumes' bucket
 * Returns: Upload success, filename, and upload timestamp
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'

// GET - Fetch resume metadata
export async function GET() {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    const { data, error } = await supabase
      .from('resume')
      .select('*')
      .eq('student_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No resume found
        return NextResponse.json({ data: null })
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch resume' },
      { status: 500 }
    )
  }
}

// POST - Upload resume
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    const userId = user.id
    const filePath = `${userId}/resume.pdf`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file, {
        upsert: true,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      console.error('[Resume Upload] Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Save metadata to database
    const { error: dbError } = await supabase
      .from('resume')
      .upsert(
        {
          student_id: userId,
          file_name: file.name,
        },
        {
          onConflict: 'student_id',
        }
      )

    if (dbError) {
      console.error('[Resume Upload] Database error:', dbError)
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Resume Upload] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
