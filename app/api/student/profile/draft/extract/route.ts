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

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null
function getOpenAI() {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiInstance
}

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
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert resume parser. Extract ALL structured information from the resume with maximum accuracy.

CRITICAL EXTRACTION RULES:

1. PERSONAL INFORMATION:
   - student_name: Full name as written (required)
   - phone_number: Complete phone number with country code if present, only digits and '+' sign
   - email: Email address (required)
   - address: Full address including city, state/country

2. EDUCATION (extract ALL education entries):
   - school_name: Full institution name (required for each entry)
   - degree: Complete degree name (e.g., "Bachelor of Science in Computer Science", "MBA", "High School Diploma")
   - description: GPA, honors, relevant coursework, achievements - be detailed
   - start_year, start_month: When studies began (integers, month 1-12)
   - end_year, end_month: When studies ended (null if ongoing)
   - Order: Most recent first

3. EXPERIENCE (extract ALL work experience):
   - organisation_name: Full company/organization name (required for each entry)
   - position_name: Complete job title (required for each entry)
   - description: Detailed responsibilities, achievements, technologies used - extract ALL bullet points
   - start_year, start_month: Employment start date (integers)
   - end_year, end_month: Employment end date (null if current position)
   - Order: Most recent first

4. PROJECTS (extract ALL projects):
   - project_name: Project title (required for each entry)
   - description: Detailed description, technologies used, your role, outcomes
   - link: GitHub URL, live demo, or project website if mentioned

5. SKILLS (extract ALL technical skills):
   - skill_name: Technology/tool name (e.g., "JavaScript", "React", "Python", "Docker")
   - skill_slug: Lowercase, hyphenated version (e.g., "javascript", "react", "python", "docker")
   - Extract programming languages, frameworks, libraries, tools, platforms, methodologies

6. LANGUAGES (extract ALL spoken languages):
   - language_name: Language name (e.g., "English", "Spanish", "Mandarin")
   - proficiency_level: Must be one of: "Native", "Fluent", "Advanced", "Intermediate", "Beginner"
   - Estimate proficiency from context clues (e.g., "fluent", "conversational", "basic")

7. PUBLICATIONS (extract ALL papers, articles, blog posts):
   - title: Full publication title (required for each entry)
   - journal_name: Where published (journal, conference, blog platform)
   - description: Abstract summary, key findings, your contribution
   - publication_year, publication_month: When published (integers)
   - link: DOI, URL, or publication link

8. CERTIFICATIONS & AWARDS (extract ALL certifications, licenses, awards):
   - name: Full certification/award name (required for each entry)
   - issuing_organization: Issuing body (e.g., "AWS", "Google", "Microsoft")
   - url: Verification link or credential URL if mentioned

9. SOCIAL LINKS (extract ALL online profiles and portfolios):
   - link: Full URL to LinkedIn, GitHub, personal website, portfolio, Twitter, etc.
   - Extract ANY URLs that appear in the resume

10. DATE FORMATTING:
    - year: 4-digit integer (e.g., 2024)
    - month: Integer 1-12 (Jan=1, Feb=2, ..., Dec=12)
    - Current/ongoing positions: set end_year and end_month to null
    - If only year is mentioned, set month to null

11. DATA QUALITY:
    - Extract information EXACTLY as written in resume
    - Do NOT invent or infer information not present
    - Set fields to null if truly not found
    - Preserve ALL details from descriptions and bullet points
    - Maintain chronological order (recent first)`,
        },
        {
          role: 'user',
          content: `Extract ALL information from this resume. Be thorough and detailed:

**Personal Information:**
- Full name, phone number, email address, physical address

**Education History:**
- All schools/universities attended
- Degrees earned or in progress
- GPA, honors, relevant coursework
- Start and end dates (year and month)

**Work Experience:**
- All jobs, internships, volunteer positions
- Company names and job titles
- Detailed descriptions of responsibilities and achievements
- Employment dates (year and month)

**Projects:**
- Personal, academic, or professional projects
- Project names, descriptions, technologies used
- GitHub links, live demos, or project websites

**Technical Skills:**
- Programming languages (Python, JavaScript, Java, etc.)
- Frameworks and libraries (React, Django, TensorFlow, etc.)
- Tools and platforms (Git, Docker, AWS, etc.)
- Methodologies (Agile, DevOps, etc.)

**Spoken Languages:**
- All languages spoken
- Proficiency levels (Native/Fluent/Advanced/Intermediate/Beginner)

**Publications:**
- Research papers, articles, blog posts
- Publication titles, journals/venues, dates
- Links to publications if available

**Certifications & Awards:**
- Professional certifications, licenses
- Academic awards, honors, scholarships
- Issuing organizations and dates
- Verification URLs if available

**Social Links & Online Presence:**
- LinkedIn profile URL
- GitHub profile URL
- Personal website or portfolio
- Twitter, Stack Overflow, or other professional profiles

Resume text:

${resumeText}`,
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
        projects: extractedData.projects,
        skills: extractedData.skills,
        languages: extractedData.languages,
        publications: extractedData.publications,
        certifications: extractedData.certifications,
        social_links: extractedData.social_links,
        status: 'editing', // Extracted data needs review before publishing
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
