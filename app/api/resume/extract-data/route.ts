import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ResumeExtractionSchema } from '@/lib/resumeSchema'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    // Call GPT-4o with extracted text
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional resume parser. Extract structured information from the resume text.

RULES:
1. Extract ONLY information explicitly stated in the resume
2. Set fields to null if not found
3. For dates: use "YYYY-MM-DD" or "YYYY-MM" or "YYYY" format
4. For current positions/education: set ending_date to null
5. Confidence levels:
   - "high": explicitly stated, no ambiguity
   - "medium": inferred from context with reasonable certainty
   - "low": guessed or unclear
6. List in missing_fields: important information not found (e.g., ["graduation_date", "phone_number"])
7. List in uncertain_fields: fields where you had to infer or guess (e.g., ["degree_description"])
8. For education: extract school name, full degree name, any honors/GPA if mentioned
9. For experience: extract company, job title, and brief description of responsibilities
10. Preserve chronological order (most recent first)`,
        },
        {
          role: 'user',
          content: `Please extract all educational background and work experience from this resume:\n\n${resumeText}`,
        },
      ],
      response_format: zodResponseFormat(ResumeExtractionSchema, 'resume_extraction'),
    })

    const extractedData = JSON.parse(completion.choices[0].message.content || '{}')

    // Store in draft table
    const { data: draftData, error: draftError } = await supabase
      .from('student_profile_draft')
      .insert({
        student_id: userId,
        student_name: extractedData.student_name,
        education: extractedData.education,
        experience: extractedData.experience,
        extraction_confidence: {
          missing: extractedData.missing_fields,
          uncertain: extractedData.uncertain_fields,
        },
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

    return NextResponse.json({
      success: true,
      draftId: draftData.id,
      extracted: extractedData,
      needsReview: extractedData.missing_fields.length > 0 || extractedData.uncertain_fields.length > 0,
    })
  } catch (error: any) {
    console.error('Resume extraction error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract resume data' },
      { status: 500 }
    )
  }
}
