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
import { enforceSameOrigin } from '@/lib/server/csrf'
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting'
import { API_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies'

// GET - Fetch resume metadata
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request)
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
      console.error('Database error fetching resume:', error)
      return NextResponse.json(
        { error: 'Failed to fetch resume' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error: unknown) {
    console.error('Unexpected error fetching resume:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    )
  }
}

// POST - Upload resume
export async function POST(request: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request)
    if (csrfError) return csrfError

    // Authenticate user
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    // Rate limit check - reuse resume extraction limits (5 per day is reasonable)
    const rateLimitConfig = API_RATE_LIMIT_POLICIES.resumeExtraction
    const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig)
    if (rateLimitResult.error) return rateLimitResult.error
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type via MIME (client-supplied, but first layer of defence)
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB) — checked before reading bytes to fail fast
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Validate via magic bytes — the MIME type above is client-controlled and
    // trivially spoofed.  PDFs always start with the 4-byte signature %PDF (25 50 44 46).
    const headerBytes = await file.slice(0, 4).arrayBuffer()
    const magic = new Uint8Array(headerBytes)
    if (magic[0] !== 0x25 || magic[1] !== 0x50 || magic[2] !== 0x44 || magic[3] !== 0x46) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
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
        { error: 'Failed to upload resume' },
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
        { error: 'Failed to save resume metadata' },
        { status: 500 }
      )
    }

    // Log API call for rate limiting
    await logApiCall(user.id, rateLimitConfig.endpoint)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[Resume Upload] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    )
  }
}
