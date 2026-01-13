/**
 * Resume Data Extraction API Route (Enhanced with Link Extraction)
 * 
 * Extracts structured data from PDF using pdfjs-dist + OpenAI GPT-4o.
 * Route: POST /api/student/profile/draft/extract
 * Called by: ResumeSection after PDF upload
 * Uses: lib/resumeSchema.ts for structured parsing
 * Creates: student_profile_draft with extracted data
 * Returns: Extracted data
 * 
 * Enhanced Features:
 * - Extracts text content from all PDF pages (page.getTextContent())
 * - Extracts link annotations from PDF (page.getAnnotations()) - captures embedded URLs
 * - Provides both text + links to OpenAI for comprehensive extraction
 */

import "server-only";

// CRITICAL: Import polyfills BEFORE pdfjs-dist to ensure browser APIs exist
import '@/lib/server/pdfPolyfills'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ResumeExtractionSchema } from '@/lib/server/resumeSchema'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import path from 'path'
import { pathToFileURL } from 'url'

// Configure worker for Node.js serverless environment
// Point to the worker file in node_modules
// Convert to file:// URL for cross-platform ESM loader compatibility
const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')
pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href

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
 * Processes uploaded PDF resume using pdfjs-dist to extract:
 * 1. Text content from all pages (visible text layer)
 * 2. Link annotations (embedded URLs - GitHub, LinkedIn, project links, etc.)
 * 3. Combines text + extracted links and sends to OpenAI for structured parsing
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

    // Convert blob to Uint8Array for pdfjs-dist
    const arrayBuffer = await fileData.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Load PDF document using pdfjs-dist legacy build (Node.js compatible)
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      useWorkerFetch: false,
      isEvalSupported: false,
    })
    const pdfDocument = await loadingTask.promise

    // Extract text and link annotations from all pages
    let resumeText = ''
    const extractedLinks: Array<{url: string, context?: string}> = []

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      
      // Extract text content (visible text layer)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      resumeText += pageText + '\n\n'

      // Extract link annotations (embedded URLs in PDF)
      // We'll also try to capture the context/text near the link
      const annotations = await page.getAnnotations()
      for (const annotation of annotations) {
        if (annotation.subtype === 'Link' && annotation.url) {
          // Try to get the text content at the link's position
          const rect = annotation.rect // [x1, y1, x2, y2]
          let linkContext = ''
          
          // Find text items that overlap with the link annotation
          if (rect && textContent.items) {
            const linkTextItems = textContent.items.filter((item: any) => {
              if (!item.transform) return false
              const itemX = item.transform[4]
              const itemY = item.transform[5]
              // Check if text item is roughly within link bounds
              return itemX >= rect[0] - 5 && itemX <= rect[2] + 5 &&
                     itemY >= rect[1] - 5 && itemY <= rect[3] + 5
            })
            linkContext = linkTextItems.map((item: any) => item.str).join(' ').trim()
          }
          
          extractedLinks.push({
            url: annotation.url,
            context: linkContext || undefined
          })
        }
      }
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF' },
        { status: 400 }
      )
    }

    // Log extracted links for debugging
    console.log('=== PDF Link Extraction Results ===')
    console.log(`Total links found: ${extractedLinks.length}`)
    if (extractedLinks.length > 0) {
      console.log('Extracted links with context:')
      extractedLinks.forEach((link, idx) => {
        if (link.context) {
          console.log(`  ${idx + 1}. "${link.context}" → ${link.url}`)
        } else {
          console.log(`  ${idx + 1}. ${link.url}`)
        }
      })
    } else {
      console.log('No embedded links found in PDF')
    }
    console.log('===================================')

    // Prepare links information for OpenAI with context
    const linksInfo = extractedLinks.length > 0
      ? `\n\n**Embedded Links Found in PDF (with context):**\n${extractedLinks.map((link, idx) => {
          if (link.context) {
            return `${idx + 1}. Text: "${link.context}" → URL: ${link.url}`
          }
          return `${idx + 1}. URL: ${link.url}`
        }).join('\n')}`
      : ''

    // Call GPT-4o with extracted text + links for comprehensive extraction
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
   - link: GitHub URL, live demo, or project website - **USE EMBEDDED LINKS when available**

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
   - link: DOI, URL, or publication link - **USE EMBEDDED LINKS when available**

8. CERTIFICATIONS & AWARDS (extract ALL certifications, licenses, awards):
   - name: Full certification/award name (required for each entry)
   - issuing_organization: Issuing body (e.g., "AWS", "Google", "Microsoft")
   - url: Verification link or credential URL - **USE EMBEDDED LINKS when available**

9. SOCIAL LINKS (extract ONLY these specific platforms):
   - github: GitHub profile URL (e.g., "https://github.com/username")
   - linkedin: LinkedIn profile URL (e.g., "https://www.linkedin.com/in/username")
   - stackoverflow: Stack Overflow profile URL (e.g., "https://stackoverflow.com/users/...")
   - kaggle: Kaggle profile URL (e.g., "https://www.kaggle.com/username")
   - leetcode: LeetCode profile URL (e.g., "https://leetcode.com/username")
   - **PRIORITIZE embedded links from PDF over text URLs**
   - Match embedded links to platforms based on domain (github.com, linkedin.com, etc.)
   - Set field to null if platform not found

10. DATE FORMATTING:
    - year: 4-digit integer (e.g., 2024)
    - month: Integer 1-12 (Jan=1, Feb=2, ..., Dec=12)
    - Current/ongoing positions: set end_year and end_month to null
    - If only year is mentioned, set month to null

11. DATA QUALITY:
    - Extract information EXACTLY as written in resume
    - **When embedded links are provided WITH CONTEXT, use the context to understand what the link is for**
    - Example: If you see 'Text: "GitHub" → URL: https://github.com/username', put that URL in social_links.github
    - Example: If you see 'Text: "Project Demo" → URL: https://example.com/demo', put that URL in the corresponding project's link field
    - **Match links to the appropriate fields based on their context text and URL domain**
    - Do NOT invent or infer information not present
    - Set fields to null if truly not found
    - Preserve ALL details from descriptions and bullet points
    - Maintain chronological order (recent first)`,
        },
        {
          role: 'user',
          content: `Extract ALL information from this resume. Be thorough and detailed.

**IMPORTANT:** I have extracted embedded link annotations from the PDF along with their context text. 
- When you see 'Text: "..." → URL: ...', the text shows what was clickable in the PDF
- Use this context to understand what each link is for (social profile, project demo, publication, etc.)
- Match links to the appropriate fields based on context and domain

Resume text:

${resumeText}${linksInfo}`,
        },
      ],
      response_format: zodResponseFormat(ResumeExtractionSchema, 'resume_extraction'),
    })

    // Parse the response as json (response_format makes sure gpt answers in correct format)
    const extractedData = JSON.parse(completion.choices[0].message.content || '{}')

    // Store in draft table using UPSERT (handles existing drafts)
    // RLS policy prevents duplicate inserts, so we use upsert to update if exists
    const { data: draftData, error: draftError } = await supabase
      .from('student_profile_draft')
      .upsert({
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
      }, {
        onConflict: 'student_id', // Update if draft already exists for this student
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
