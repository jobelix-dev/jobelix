import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ResumeExtractionSchema } from '@/lib/resumeSchema'
import { validateField } from '@/lib/fieldValidation'

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
6. List in missing_fields: important information not found (e.g., ["graduation_date", "address"])
7. List in uncertain_fields: fields where you had to infer or guess (e.g., ["degree_description"])
8. For contact info: extract phone_number and email if present in the resume
9. For education: extract school name, full degree name, any honors/GPA if mentioned
10. For experience: extract company, job title, and brief description of responsibilities
11. Preserve chronological order (most recent first)`,
        },
        {
          role: 'user',
          content: `Please extract the student's name, contact information (phone, email, and address), educational background, and work experience from this resume:\n\n${resumeText}`,
        },
      ],
      response_format: zodResponseFormat(ResumeExtractionSchema, 'resume_extraction'),
    })

    const extractedData = JSON.parse(completion.choices[0].message.content || '{}')

    // HARD VALIDATION: Build structured field lists based on actual validation
    const invalidFields: Array<{field_path: string, display_name: string, context?: string, error: string}> = []
    const uncertainFields: Array<{field_path: string, display_name: string, context?: string}> = []
    const missingFields: Array<{field_path: string, display_name: string, context?: string}> = []
    
    // Validate top-level fields
    const topLevelFields = [
      { name: 'phone_number', display: 'phone number', required: true },
      { name: 'email', display: 'email address', required: true },
      { name: 'address', display: 'address', required: false },
    ]

    for (const field of topLevelFields) {
      const value = extractedData[field.name]
      
      if (!value || value === null || value.trim() === '') {
        if (field.required) {
          missingFields.push({
            field_path: field.name,
            display_name: field.display,
          })
        }
      } else {
        // Validate the value
        const validation = validateField(field.name, value)
        if (!validation.isValid) {
          invalidFields.push({
            field_path: field.name,
            display_name: field.display,
            error: validation.errorMessage || 'Invalid value'
          })
        }
      }
    }
    
    // Validate education entries
    if (extractedData.education && Array.isArray(extractedData.education)) {
      extractedData.education.forEach((edu: any, index: number) => {
        const schoolName = edu.school_name || `Education ${index + 1}`
        
        // Check required fields
        if (!edu.starting_date) {
          missingFields.push({
            field_path: `education.${index}.starting_date`,
            display_name: `${schoolName} - starting date`,
            context: schoolName
          })
        } else {
          // Validate the date
          const validation = validateField('starting_date', edu.starting_date)
          if (!validation.isValid) {
            invalidFields.push({
              field_path: `education.${index}.starting_date`,
              display_name: `${schoolName} - starting date`,
              context: schoolName,
              error: validation.errorMessage || 'Invalid date format'
            })
          }
        }
        
        if (!edu.ending_date) {
          missingFields.push({
            field_path: `education.${index}.ending_date`,
            display_name: `${schoolName} - ending date`,
            context: schoolName
          })
        } else {
          // Validate the date
          const validation = validateField('ending_date', edu.ending_date)
          if (!validation.isValid) {
            invalidFields.push({
              field_path: `education.${index}.ending_date`,
              display_name: `${schoolName} - ending date`,
              context: schoolName,
              error: validation.errorMessage || 'Invalid date format'
            })
          } else if (edu.confidence !== 'high') {
            // Valid but uncertain (low confidence from GPT)
            uncertainFields.push({
              field_path: `education.${index}.ending_date`,
              display_name: `${schoolName} - ending date`,
              context: schoolName
            })
          }
        }
      })
    }
    
    // Validate experience entries
    if (extractedData.experience && Array.isArray(extractedData.experience)) {
      extractedData.experience.forEach((exp: any, index: number) => {
        const orgName = exp.organisation_name || `Experience ${index + 1}`
        
        if (!exp.position_name) {
          missingFields.push({
            field_path: `experience.${index}.position_name`,
            display_name: `${orgName} - position/role`,
            context: orgName
          })
        } else {
          const validation = validateField('position_name', exp.position_name)
          if (!validation.isValid) {
            invalidFields.push({
              field_path: `experience.${index}.position_name`,
              display_name: `${orgName} - position/role`,
              context: orgName,
              error: validation.errorMessage || 'Invalid position name'
            })
          }
        }
        
        if (!exp.starting_date) {
          missingFields.push({
            field_path: `experience.${index}.starting_date`,
            display_name: `${orgName} - starting date`,
            context: orgName
          })
        } else {
          const validation = validateField('starting_date', exp.starting_date)
          if (!validation.isValid) {
            invalidFields.push({
              field_path: `experience.${index}.starting_date`,
              display_name: `${orgName} - starting date`,
              context: orgName,
              error: validation.errorMessage || 'Invalid date format'
            })
          }
        }
        
        if (!exp.ending_date) {
          missingFields.push({
            field_path: `experience.${index}.ending_date`,
            display_name: `${orgName} - ending date`,
            context: orgName
          })
        } else {
          const validation = validateField('ending_date', exp.ending_date)
          if (!validation.isValid) {
            invalidFields.push({
              field_path: `experience.${index}.ending_date`,
              display_name: `${orgName} - ending date`,
              context: orgName,
              error: validation.errorMessage || 'Invalid date format'
            })
          } else if (exp.confidence !== 'high') {
            // Valid but uncertain (low confidence from GPT)
            uncertainFields.push({
              field_path: `experience.${index}.ending_date`,
              display_name: `${orgName} - ending date`,
              context: orgName
            })
          }
        }
      })
    }

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
        extraction_confidence: {
          invalid: invalidFields,
          missing: missingFields,
          uncertain: uncertainFields,
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

    console.log('Extraction complete:', {
      invalidCount: invalidFields.length,
      missingCount: missingFields.length,
      uncertainCount: uncertainFields.length,
      totalIssues: invalidFields.length + missingFields.length + uncertainFields.length
    })

    return NextResponse.json({
      success: true,
      draftId: draftData.id,
      extracted: {
        ...extractedData,
        validation_summary: {
          invalid: invalidFields,
          missing: missingFields,
          uncertain: uncertainFields,
        }
      },
      needsReview: invalidFields.length > 0 || missingFields.length > 0 || uncertainFields.length > 0,
    })
  } catch (error: any) {
    console.error('Resume extraction error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract resume data' },
      { status: 500 }
    )
  }
}
