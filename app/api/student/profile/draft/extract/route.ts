/**
 * Resume Data Extraction API Route (Enhanced with Link Extraction + GitHub Integration)
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
 * - **NEW:** Checks for GitHub OAuth connection and merges GitHub repo data with resume data
 */

import "server-only";

// Vercel serverless config: allow longer execution for OpenAI calls
// Resume extraction makes 9 sequential OpenAI API calls which can take 30-60s
export const maxDuration = 60; // seconds

// CRITICAL: Import polyfills BEFORE pdfjs-dist to ensure browser APIs exist
import '@/lib/server/pdfPolyfills'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { 
  ContactInfoSchema,
  EducationSectionSchema,
  ExperienceSectionSchema,
  ProjectsSectionSchema,
  SkillsSectionSchema,
  LanguagesSectionSchema,
  PublicationsSectionSchema,
  CertificationsSectionSchema,
  SocialLinksSectionSchema,
} from '@/lib/server/resumeSchema'
import {
  contactPrompt,
  educationPrompt,
  experiencePrompt,
  projectsPrompt,
  skillsPrompt,
  languagesPrompt,
  publicationsPrompt,
  certificationsPrompt,
  socialLinksPrompt,
} from '@/lib/server/prompts'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs'
import { RESUME_EXTRACTION_STEPS } from '@/lib/shared/extractionSteps'
import { setExtractionProgress } from '@/lib/server/extractionProgress'
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting'
import { enforceSameOrigin } from '@/lib/server/csrf'
import type {
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SkillEntry,
  LanguageEntry,
  PublicationEntry,
  CertificationEntry,
  SocialLinkEntry,
} from '@/lib/shared/types'
import { parsePhoneNumber } from 'libphonenumber-js'

// Configure PDF.js for Node.js serverless environment
// In pdfjs-dist v5, we must provide the worker module on globalThis.pdfjsWorker
// This avoids the "No GlobalWorkerOptions.workerSrc specified" error on Vercel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).pdfjsWorker = pdfjsWorker

// PDF.js text content item type
interface TextContentItem {
  str: string;
  transform?: number[];
}

// Extracted data structure
interface ExtractedData {
  student_name: string | null;
  phone_number: string | null;
  phone_country_code: string | null;
  email: string | null;
  address: string | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillEntry[];
  languages: LanguageEntry[];
  publications: PublicationEntry[];
  certifications: CertificationEntry[];
  social_links: SocialLinkEntry;
}

// Section data types
interface ContactData {
  student_name?: string | null;
  phone_number?: string | null;
  phone_country_code?: string | null;
  email?: string | null;
  address?: string | null;
}

interface SectionDataWithArray {
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  projects?: ProjectEntry[];
  skills?: SkillEntry[];
  languages?: LanguageEntry[];
  publications?: PublicationEntry[];
  certifications?: CertificationEntry[];
}

interface SocialLinksData {
  social_links?: SocialLinkEntry;
}

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

const MAX_RESUME_FILE_BYTES = 8 * 1024 * 1024;
const MAX_RESUME_TEXT_CHARS = 120_000;
const MAX_LINKS_FOR_EXTRACTION = 100;

// Type for existing section data passed to extractSection
type ExistingSectionData = 
  | EducationEntry[]
  | ExperienceEntry[]
  | ProjectEntry[]
  | SkillEntry[]
  | LanguageEntry[]
  | PublicationEntry[]
  | CertificationEntry[]
  | SocialLinkEntry
  | ContactInfo;

// Contact info type for extraction
interface ContactInfo {
  student_name: string | null;
  phone_number: string | null;
  phone_country_code: string | null;
  email: string | null;
  address: string | null;
}

/**
 * Processes phone number from AI extraction.
 * Stores the raw phone number and detects/validates country code.
 * E.164 normalization happens at finalize time, not here.
 * 
 * @param phoneNumber - Raw phone number from AI extraction
 * @param hintCountryCode - Optional ISO country code hint from AI (e.g., "US", "GB")
 * @returns { phone_number, phone_country_code } - raw phone and detected/hinted country
 */
function processExtractedPhone(
  phoneNumber: string | null,
  hintCountryCode: string | null
): { phone_number: string | null; phone_country_code: string | null } {
  if (!phoneNumber) {
    return { phone_number: null, phone_country_code: hintCountryCode || 'FR' };
  }

  // Clean up the input - remove extra spaces
  const cleanedPhone = phoneNumber.trim();
  
  // If we already have a country hint, use it
  if (hintCountryCode) {
    return {
      phone_number: cleanedPhone,
      phone_country_code: hintCountryCode.toUpperCase(),
    };
  }
  
  // Try to detect country from phone prefix if it starts with +
  if (cleanedPhone.startsWith('+')) {
    try {
      const parsed = parsePhoneNumber(cleanedPhone);
      if (parsed && parsed.country) {
        return {
          phone_number: cleanedPhone,
          phone_country_code: parsed.country,
        };
      }
    } catch {
      // Parsing failed - continue to fallback
    }
  }

  // Fallback: default to France
  return {
    phone_number: cleanedPhone,
    phone_country_code: 'FR',
  };
}

/**
 * Helper function to extract a specific section from resume
 * Uses the full resume text but focuses on extracting just one section
 * 
 * For ARRAY sections (education, experience, etc.): PRESERVE existing + ADD new
 * For SCALAR sections (contact_info): handled separately by extractContactInfo
 */
async function extractSection<T>(
  resumeText: string,
  linksInfo: string,
  sectionName: string,
  existingSectionData: ExistingSectionData,
  schema: Parameters<typeof zodResponseFormat>[0],
  systemPrompt: string
): Promise<T> {
  const openai = getOpenAI();
  const existingCount = Array.isArray(existingSectionData) ? existingSectionData.length : 0;
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Extract the ${sectionName} section from this resume and merge with existing data.

**FULL RESUME TEXT:**
${resumeText}${linksInfo}

**EXISTING ${sectionName.toUpperCase()} DATA (MUST ALL BE PRESERVED):**
${JSON.stringify(existingSectionData, null, 2)}
${existingCount > 0 ? `Count: ${existingCount} existing entries` : 'No existing data'}

Focus ONLY on the ${sectionName} section. PRESERVE all existing entries and ADD new ones from the resume.
Your output MUST contain AT LEAST ${existingCount} entries.`,
      },
    ],
    response_format: zodResponseFormat(schema, `${sectionName}_extraction`),
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

/**
 * Helper function to extract contact info from resume
 * Unlike array sections, contact info should REPLACE existing with resume data
 * (phone, email, name, address should come from the uploaded resume)
 */
async function extractContactInfo<T>(
  resumeText: string,
  linksInfo: string,
  schema: Parameters<typeof zodResponseFormat>[0],
  systemPrompt: string
): Promise<T> {
  const openai = getOpenAI();
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Extract contact information from this resume.

**FULL RESUME TEXT:**
${resumeText}${linksInfo}

Extract the following fields from the resume:
- student_name: Full name of the person
- phone_number: Phone number exactly as written (with or without country code)
- phone_country_code: ISO 2-letter country code inferred from phone prefix or location
- email: Email address
- address: City or full address

IMPORTANT: Extract data FROM THE RESUME. Do not make up information.
If a field is not present in the resume, return null for that field.`,
      },
    ],
    response_format: zodResponseFormat(schema, 'contact_info_extraction'),
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

/**
 * POST handler for resume data extraction
 * 
 * Processes uploaded PDF resume section by section:
 * 1. Extract text content from all pages once
 * 2. For each section (education, experience, projects, etc.):
 *    - Send full resume text + current section data
 *    - LLM focuses on just that section
 *    - Merge result with existing data
 * 3. Update draft incrementally
 */
export async function POST(request: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request)
    if (csrfError) return csrfError

    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    // Rate limiting: 2 extractions per hour, 5 per day (expensive OpenAI operation)
    const rateLimitResult = await checkRateLimit(user.id, {
      endpoint: 'resume-extraction',
      hourlyLimit: 2,
      dailyLimit: 5,
    })

    if (rateLimitResult.error) return rateLimitResult.error
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(
        { endpoint: 'resume-extraction', hourlyLimit: 2, dailyLimit: 5 },
        rateLimitResult.data
      )
    }

    const updateProgress = (stepIndex: number, complete = false) => {
      const step = RESUME_EXTRACTION_STEPS[stepIndex] || 'Processing';
      const progress = Math.round(((stepIndex + 1) / RESUME_EXTRACTION_STEPS.length) * 100);
      setExtractionProgress(user.id, { stepIndex, step, progress, complete });
    };

    updateProgress(0);

    // Fetch EXISTING draft data (if any) to merge with new PDF extraction
    const { data: existingDraft } = await supabase
      .from('student_profile_draft')
      .select('*')
      .eq('student_id', user.id)
      .single()

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

    if (fileData.size > MAX_RESUME_FILE_BYTES) {
      return NextResponse.json(
        { error: 'Resume file is too large to process' },
        { status: 400 }
      )
    }

    updateProgress(1);

    // Convert blob to Uint8Array for pdfjs-dist
    const arrayBuffer = await fileData.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Load PDF document using pdfjs-dist legacy build (Node.js compatible)
    // Worker is handled via globalThis.pdfjsWorker set at module load
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
      const pageText = (textContent.items as TextContentItem[])
        .map((item) => item.str)
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
            const linkTextItems = (textContent.items as TextContentItem[]).filter((item) => {
              if (!item.transform) return false
              const itemX = item.transform[4]
              const itemY = item.transform[5]
              // Check if text item is roughly within link bounds
              return itemX >= rect[0] - 5 && itemX <= rect[2] + 5 &&
                     itemY >= rect[1] - 5 && itemY <= rect[3] + 5
            })
            linkContext = linkTextItems.map((item) => item.str).join(' ').trim()
          }
          
          if (extractedLinks.length < MAX_LINKS_FOR_EXTRACTION) {
            extractedLinks.push({
              url: annotation.url,
              context: linkContext || undefined
            })
          }
        }
      }
    }

    updateProgress(2);

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF' },
        { status: 400 }
      )
    }

    if (resumeText.length > MAX_RESUME_TEXT_CHARS) {
      resumeText = resumeText.slice(0, MAX_RESUME_TEXT_CHARS)
    }

    // Prepare links information for OpenAI with context
    const linksInfo = extractedLinks.length > 0
      ? `\n\n**Embedded Links Found in PDF (with context):**\n${extractedLinks.map((link, idx) => {
          if (link.context) {
            return `${idx + 1}. Text: "${link.context}" → URL: ${link.url}`
          }
          return `${idx + 1}. URL: ${link.url}`
        }).join('\n')}`
      : ''

    console.log('[Resume Extraction] Starting section-by-section extraction');
    
    // Initialize extracted data with existing data or empty structure
    const extractedData: ExtractedData = {
      student_name: existingDraft?.student_name || null,
      phone_number: existingDraft?.phone_number || null,
      phone_country_code: existingDraft?.phone_country_code || null,
      email: existingDraft?.email || null,
      address: existingDraft?.address || null,
      education: existingDraft?.education || [],
      experience: existingDraft?.experience || [],
      projects: existingDraft?.projects || [],
      skills: existingDraft?.skills || [],
      languages: existingDraft?.languages || [],
      publications: existingDraft?.publications || [],
      certifications: existingDraft?.certifications || [],
      social_links: existingDraft?.social_links || {},
    };

    // Section 1: Contact Information (REPLACE existing with resume data)
    const contactData = await extractContactInfo<ContactData>(
      resumeText,
      linksInfo,
      ContactInfoSchema,
      contactPrompt
    );
    
    // Use extracted data, fall back to existing only if AI returned null
    extractedData.student_name = contactData.student_name || extractedData.student_name;
    extractedData.email = contactData.email || extractedData.email;
    extractedData.address = contactData.address || extractedData.address;
    
    // Process phone number - REPLACE with resume data if found
    // E.164 normalization happens at finalize time, not here
    const rawPhone = contactData.phone_number ?? null; // Don't fall back to existing - use resume data
    const rawCountryCode = contactData.phone_country_code ?? extractedData.phone_country_code ?? null;
    const processedPhone = processExtractedPhone(rawPhone, rawCountryCode);
    extractedData.phone_number = processedPhone.phone_number;
    extractedData.phone_country_code = processedPhone.phone_country_code;

    updateProgress(3);

    // Section 2: Education
    const educationData = await extractSection<SectionDataWithArray>(
      resumeText,
      linksInfo,
      'education',
      extractedData.education,
      EducationSectionSchema,
      educationPrompt(extractedData.education.length)
    );
    extractedData.education = educationData.education || [];
    updateProgress(4);

    // Section 3: Experience
    const experienceData = await extractSection<SectionDataWithArray>(
      resumeText,
      linksInfo,
      'experience',
      extractedData.experience,
      ExperienceSectionSchema,
      experiencePrompt(extractedData.experience.length)
    );
    extractedData.experience = experienceData.experience || [];
    updateProgress(5);

    // Section 4: Projects (CRITICAL - often includes GitHub projects)
    const projectsData = await extractSection<SectionDataWithArray>(
      resumeText,
      linksInfo,
      'projects',
      extractedData.projects,
      ProjectsSectionSchema,
      projectsPrompt(extractedData.projects.length)
    );
    const prevProjectsCount = extractedData.projects.length;
    extractedData.projects = projectsData.projects || [];
    if (extractedData.projects.length < prevProjectsCount) {
      console.warn('[Resume Extraction] Projects count decreased unexpectedly');
    }
    updateProgress(6);

    // Section 5: Skills (CRITICAL - often includes GitHub-derived skills)
    const skillsData = await extractSection<SectionDataWithArray>(
      resumeText,
      linksInfo,
      'skills',
      extractedData.skills,
      SkillsSectionSchema,
      skillsPrompt(extractedData.skills.length)
    );
    const prevSkillsCount = extractedData.skills.length;
    extractedData.skills = skillsData.skills || [];
    if (extractedData.skills.length < prevSkillsCount) {
      console.warn('[Resume Extraction] Skills count decreased unexpectedly');
    }
    updateProgress(7);

    // Section 6: Languages
    const languagesData = await extractSection<SectionDataWithArray>(
      resumeText,
      linksInfo,
      'languages',
      extractedData.languages,
      LanguagesSectionSchema,
      languagesPrompt(extractedData.languages.length)
    );
    extractedData.languages = languagesData.languages || [];
    updateProgress(8);

    // Section 7: Publications
    const publicationsData = await extractSection<SectionDataWithArray>(
      resumeText,
      linksInfo,
      'publications',
      extractedData.publications,
      PublicationsSectionSchema,
      publicationsPrompt(extractedData.publications.length)
    );
    extractedData.publications = publicationsData.publications || [];
    updateProgress(9);

    // Section 8: Certifications
    const certificationsData = await extractSection<SectionDataWithArray>(
      resumeText,
      linksInfo,
      'certifications',
      extractedData.certifications,
      CertificationsSectionSchema,
      certificationsPrompt(extractedData.certifications.length)
    );
    extractedData.certifications = certificationsData.certifications || [];
    updateProgress(10);

    // Section 9: Social Links
    const socialLinksData = await extractSection<SocialLinksData>(
      resumeText,
      linksInfo,
      'social_links',
      extractedData.social_links,
      SocialLinksSectionSchema,
      socialLinksPrompt
    );
    extractedData.social_links = socialLinksData.social_links || {};
    updateProgress(11);

    // Store in draft table using UPSERT (handles existing drafts)
    // RLS policy prevents duplicate inserts, so we use upsert to update if exists
    updateProgress(12);

    const { data: draftData, error: draftError } = await supabase
      .from('student_profile_draft')
      .upsert({
        student_id: userId,
        student_name: extractedData.student_name,
        phone_number: extractedData.phone_number,
        phone_country_code: extractedData.phone_country_code,
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

    console.log('[Resume Extraction] Completed and saved draft')
    updateProgress(13, true);

    // Log successful API call for rate limiting
    await logApiCall(user.id, 'resume-extraction')

    return NextResponse.json({
      success: true,
      draftId: draftData.id, // returns id of created draft
      extracted: extractedData,
      needsReview: false,
    })
  } catch (error: unknown) {
    console.error('Resume extraction error:', error)
    
    // Extract error details for logging
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name,
    })
    
    // Check for specific error types
    if (errorMessage.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { error: 'AI service rate limited, please try again later' },
        { status: 429 }
      )
    }
    
    if (errorMessage.includes('Invalid PDF') || errorMessage.includes('password')) {
      return NextResponse.json(
        { error: 'Invalid or password-protected PDF file' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to extract resume data', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 }
    )
  }
}
