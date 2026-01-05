/**
 * Resume Data Extraction API Route
 * 
 * Extracts structured data from PDF using OpenAI GPT-4o.
 * Route: POST /api/student/profile/draft/extract
 * Called by: ResumeSection after PDF upload
 * Uses: lib/resumeSchema.ts for structured parsing
 * Creates: student_profile_draft with extracted data
 * Returns: Extracted data
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ResumeExtractionSchema } from '@/lib/resumeSchema'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * POST handler for resume data extraction
 * 
 * Processes uploaded PDF resume, extracts text, uses AI to parse structured data,
 * validates all fields, and creates a draft profile with validation classifications.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    // Get the file from Supabase Storage
    const userId = user.id
    const filePath = `${userId}/resume.pdf`

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(filePath)

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Resume file not found' },
        { status: 404 }
      )
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF using pdf-parse-fork
    // @ts-ignore - pdf-parse-fork types
    const pdfParse = require('pdf-parse-fork')
    const pdfData = await pdfParse(buffer)
    const resumeText = pdfData.text

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF' },
        { status: 400 }
      )
    }

    // Call GPT-4o with extracted text and ask to extract all fields
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional resume parser. Extract structured information from the resume text.

RULES:
1. Extract ONLY information explicitly stated in the resume
2. Set fields to null if not found
3. For dates: extract year and month as separate integer values (start_year, start_month, end_year, end_month)
4. For current positions/education: set end_year and end_month to null
5. For contact info: extract phone_number and email if present in the resume
6. For education: extract school name, full degree name, any honors/GPA if mentioned
7. For experience: extract company, job title, and brief description of responsibilities
8. Preserve chronological order (most recent first)
9. Month should be 1-12 (January=1, December=12), year should be 4-digit (e.g., 2024)`,
        },
        {
          role: 'user',
          content: `Please extract the student's name, contact information (phone, email, and address), educational background, and work experience from this resume:\n\n${resumeText}`,
        },
      ],
      response_format: zodResponseFormat(ResumeExtractionSchema, 'resume_extraction'),
    })

    // Parse the response as json (response_format makes sure gpt answers in correct format)
    const extractedData = JSON.parse(completion.choices[0].message.content || '{}')

    // Store in draft table
    const { data: draftData, error: draftError } = await supabase
      .from('student_profile_draft')
      .insert({
        student_id: userId,
        student_name: extractedData.student_name,
        phone_number: extractedData.phone_number,
        email: extractedData.email,
        address: extractedData.address,
        education: extractedData.education,
        experience: extractedData.experience,
        status: 'reviewing',
      })
      .select()
      .single()

    if (draftError) {
      console.error('Failed to save draft:', draftError)
      return NextResponse.json(
        { error: 'Failed to save extracted data' },
        { status: 500 }
      )
    }

    console.log('Extraction complete - data saved to draft')

    return NextResponse.json({
      success: true,
      draftId: draftData.id, // returns id of created draft
      extracted: extractedData,
      needsReview: false,
    })
  } catch (error: any) {
    console.error('Resume extraction error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract resume data' },
      { status: 500 }
    )
  }
}
