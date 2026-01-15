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

// CRITICAL: Import polyfills BEFORE pdfjs-dist to ensure browser APIs exist
import '@/lib/server/pdfPolyfills'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { 
  ResumeExtractionSchema,
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
import path from 'path'
import { pathToFileURL } from 'url'
import { getGitHubConnection } from '@/lib/server/githubOAuth'
import { fetchGitHubRepos, transformReposForLLM } from '@/lib/server/githubService'

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
 * Helper function to extract a specific section from resume
 * Uses the full resume text but focuses on extracting just one section
 */
async function extractSection<T>(
  resumeText: string,
  linksInfo: string,
  sectionName: string,
  existingSectionData: any,
  schema: any,
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
        content: `Extract the ${sectionName} section from this resume and merge with existing data.

**FULL RESUME TEXT:**
${resumeText}${linksInfo}

**EXISTING ${sectionName.toUpperCase()} DATA (MUST ALL BE PRESERVED):**
${JSON.stringify(existingSectionData, null, 2)}
${existingSectionData && existingSectionData.length > 0 ? `Count: ${existingSectionData.length} existing entries` : 'No existing data'}

Focus ONLY on the ${sectionName} section. PRESERVE all existing entries and ADD new ones from the resume.
Your output MUST contain AT LEAST ${existingSectionData?.length || 0} entries.`,
      },
    ],
    response_format: zodResponseFormat(schema, `${sectionName}_extraction`),
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
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    // Fetch EXISTING draft data (if any) to merge with new PDF extraction
    const { data: existingDraft } = await supabase
      .from('student_profile_draft')
      .select('*')
      .eq('student_id', user.id)
      .single()

    console.log('Existing draft found:', !!existingDraft)

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

    // Prepare existing draft data for merging context
    const existingDataContext = existingDraft ? `

**EXISTING PROFILE DATA (to merge with):**
${JSON.stringify({
  student_name: existingDraft.student_name,
  email: existingDraft.email,
  phone_number: existingDraft.phone_number,
  address: existingDraft.address,
  education: existingDraft.education,
  experience: existingDraft.experience,
  projects: existingDraft.projects,
  skills: existingDraft.skills,
  languages: existingDraft.languages,
  publications: existingDraft.publications,
  certifications: existingDraft.certifications,
  social_links: existingDraft.social_links,
}, null, 2)}

⚠️ EXISTING PROJECTS COUNT: ${existingDraft.projects?.length || 0} projects
⚠️ EXISTING SKILLS COUNT: ${existingDraft.skills?.length || 0} skills

**CRITICAL MERGING INSTRUCTIONS:**
- **PRESERVE ALL existing entries** - do not delete any existing projects, skills, experience, etc.
- **ADD new entries** from the resume that don't exist in current data
- **ENHANCE existing entries** if the resume provides additional details (merge descriptions, add missing fields)
- **UPDATE basic contact info** (name, email, phone, address) with resume data if provided
- **For duplicate detection:** Compare project names, company names, skill names case-insensitively
  - If a project/experience/skill appears in BOTH existing data AND resume, merge the information (combine unique details)
  - If a project/experience/skill appears ONLY in existing data, KEEP IT (do not remove)
  - If a project/experience/skill appears ONLY in resume, ADD IT

⚠️ YOUR OUTPUT MUST CONTAIN AT LEAST ${existingDraft.projects?.length || 0} PROJECTS AND ${existingDraft.skills?.length || 0} SKILLS
⚠️ This is an ADDITIVE merge - never reduce the number of items!
- **NEVER delete existing data** - the user may have manually entered or imported from GitHub
- **Think of this as ADDITIVE merging** - start with all existing data, then add/enhance from resume
- **Example:** If existing data has 5 projects and resume has 3 projects with 1 overlap:
  - Result should have AT LEAST 7 projects (4 from existing only + 3 from resume, with 1 merged)
` : '\n**Note:** This is the first resume upload for this user. Extract all data from the resume.\n'

    console.log('=== STARTING SECTION-BY-SECTION EXTRACTION ===');
    const openai = getOpenAI();
    
    // Initialize extracted data with existing data or empty structure
    const extractedData: any = {
      student_name: existingDraft?.student_name || null,
      phone_number: existingDraft?.phone_number || null,
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

    // Section 1: Contact Information
    console.log('Extracting section 1/9: Contact Information...');
    const contactData: any = await extractSection(
      resumeText,
      linksInfo,
      'contact_info',
      {
        student_name: extractedData.student_name,
        phone_number: extractedData.phone_number,
        email: extractedData.email,
        address: extractedData.address,
      },
      ContactInfoSchema,
      contactPrompt
    );
    extractedData.student_name = contactData.student_name || extractedData.student_name;
    extractedData.phone_number = contactData.phone_number || extractedData.phone_number;
    extractedData.email = contactData.email || extractedData.email;
    extractedData.address = contactData.address || extractedData.address;
    console.log(`✓ Contact info extracted`);

    // Section 2: Education
    console.log(`Extracting section 2/9: Education (${extractedData.education.length} existing)...`);
    const educationData: any = await extractSection(
      resumeText,
      linksInfo,
      'education',
      extractedData.education,
      EducationSectionSchema,
      educationPrompt(extractedData.education.length)
    );
    const prevEducationCount = extractedData.education.length;
    extractedData.education = educationData.education;
    console.log(`✓ Education: ${prevEducationCount} → ${extractedData.education.length} entries (+${extractedData.education.length - prevEducationCount})`);

    // Section 3: Experience
    console.log(`Extracting section 3/9: Experience (${extractedData.experience.length} existing)...`);
    const experienceData: any = await extractSection(
      resumeText,
      linksInfo,
      'experience',
      extractedData.experience,
      ExperienceSectionSchema,
      experiencePrompt(extractedData.experience.length)
    );
    const prevExperienceCount = extractedData.experience.length;
    extractedData.experience = experienceData.experience;
    console.log(`✓ Experience: ${prevExperienceCount} → ${extractedData.experience.length} entries (+${extractedData.experience.length - prevExperienceCount})`);

    // Section 4: Projects (CRITICAL - often includes GitHub projects)
    console.log(`Extracting section 4/9: Projects (${extractedData.projects.length} existing)...`);
    const projectsData: any = await extractSection(
      resumeText,
      linksInfo,
      'projects',
      extractedData.projects,
      ProjectsSectionSchema,
      projectsPrompt(extractedData.projects.length)
    );
    const prevProjectsCount = extractedData.projects.length;
    extractedData.projects = projectsData.projects;
    console.log(`✓ Projects: ${prevProjectsCount} → ${extractedData.projects.length} entries (+${extractedData.projects.length - prevProjectsCount})`);
    if (extractedData.projects.length < prevProjectsCount) {
      console.error(`⚠️ WARNING: Projects count DECREASED! ${prevProjectsCount} → ${extractedData.projects.length}`);
    }

    // Section 5: Skills (CRITICAL - often includes GitHub-derived skills)
    console.log(`Extracting section 5/9: Skills (${extractedData.skills.length} existing)...`);
    const skillsData: any = await extractSection(
      resumeText,
      linksInfo,
      'skills',
      extractedData.skills,
      SkillsSectionSchema,
      skillsPrompt(extractedData.skills.length)
    );
    const prevSkillsCount = extractedData.skills.length;
    extractedData.skills = skillsData.skills;
    console.log(`✓ Skills: ${prevSkillsCount} → ${extractedData.skills.length} entries (+${extractedData.skills.length - prevSkillsCount})`);
    if (extractedData.skills.length < prevSkillsCount) {
      console.error(`⚠️ WARNING: Skills count DECREASED! ${prevSkillsCount} → ${extractedData.skills.length}`);
    }

    // Section 6: Languages
    console.log(`Extracting section 6/9: Languages (${extractedData.languages.length} existing)...`);
    const languagesData: any = await extractSection(
      resumeText,
      linksInfo,
      'languages',
      extractedData.languages,
      LanguagesSectionSchema,
      languagesPrompt(extractedData.languages.length)
    );
    const prevLanguagesCount = extractedData.languages.length;
    extractedData.languages = languagesData.languages;
    console.log(`✓ Languages: ${prevLanguagesCount} → ${extractedData.languages.length} entries (+${extractedData.languages.length - prevLanguagesCount})`);

    // Section 7: Publications
    console.log(`Extracting section 7/9: Publications (${extractedData.publications.length} existing)...`);
    const publicationsData: any = await extractSection(
      resumeText,
      linksInfo,
      'publications',
      extractedData.publications,
      PublicationsSectionSchema,
      publicationsPrompt(extractedData.publications.length)
    );
    const prevPublicationsCount = extractedData.publications.length;
    extractedData.publications = publicationsData.publications;
    console.log(`✓ Publications: ${prevPublicationsCount} → ${extractedData.publications.length} entries (+${extractedData.publications.length - prevPublicationsCount})`);

    // Section 8: Certifications
    console.log(`Extracting section 8/9: Certifications (${extractedData.certifications.length} existing)...`);
    const certificationsData: any = await extractSection(
      resumeText,
      linksInfo,
      'certifications',
      extractedData.certifications,
      CertificationsSectionSchema,
      certificationsPrompt(extractedData.certifications.length)
    );
    const prevCertificationsCount = extractedData.certifications.length;
    extractedData.certifications = certificationsData.certifications;
    console.log(`✓ Certifications: ${prevCertificationsCount} → ${extractedData.certifications.length} entries (+${extractedData.certifications.length - prevCertificationsCount})`);

    // Section 9: Social Links
    console.log(`Extracting section 9/9: Social Links...`);
    const socialLinksData: any = await extractSection(
      resumeText,
      linksInfo,
      'social_links',
      extractedData.social_links,
      SocialLinksSectionSchema,
      socialLinksPrompt
    );
    extractedData.social_links = socialLinksData.social_links;
    console.log(`✓ Social links extracted`);

    console.log('=== SECTION-BY-SECTION EXTRACTION COMPLETE ===');
    console.log(`Final: ${extractedData.education.length} education, ${extractedData.experience.length} experience, ${extractedData.projects.length} projects, ${extractedData.skills.length} skills`);
    console.log('==============================================');

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
