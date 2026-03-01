import "server-only";

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { parsePhoneNumber } from 'libphonenumber-js';
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
} from '@/lib/server/resumeSchema';
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
} from '@/lib/server/prompts';
import type {
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SkillEntry,
  LanguageEntry,
  PublicationEntry,
  CertificationEntry,
  SocialLinkEntry,
} from '@/lib/shared/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).pdfjsWorker = pdfjsWorker;

interface TextContentItem {
  str: string;
  transform?: number[];
}

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

interface ContactInfo {
  student_name: string | null;
  phone_number: string | null;
  phone_country_code: string | null;
  email: string | null;
  address: string | null;
}

export interface ExtractedData {
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

export interface ExistingDraftData {
  student_name?: string | null;
  phone_number?: string | null;
  phone_country_code?: string | null;
  email?: string | null;
  address?: string | null;
  education?: EducationEntry[] | null;
  experience?: ExperienceEntry[] | null;
  projects?: ProjectEntry[] | null;
  skills?: SkillEntry[] | null;
  languages?: LanguageEntry[] | null;
  publications?: PublicationEntry[] | null;
  certifications?: CertificationEntry[] | null;
  social_links?: SocialLinkEntry | null;
}

export interface ResumeContentResult {
  resumeText: string;
  linksInfo: string;
}

export const MAX_RESUME_FILE_BYTES = 8 * 1024 * 1024;
const MAX_RESUME_TEXT_CHARS = 120_000;
const MAX_LINKS_FOR_EXTRACTION = 100;

export function initializeExtractedData(existingDraft: ExistingDraftData | null): ExtractedData {
  return {
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
}

function processExtractedPhone(
  phoneNumber: string | null,
  hintCountryCode: string | null
): { phone_number: string | null; phone_country_code: string | null } {
  if (!phoneNumber) {
    return { phone_number: null, phone_country_code: hintCountryCode || 'FR' };
  }

  const cleanedPhone = phoneNumber.trim();

  if (hintCountryCode) {
    return {
      phone_number: cleanedPhone,
      phone_country_code: hintCountryCode.toUpperCase(),
    };
  }

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
      // Fall through to default.
    }
  }

  return {
    phone_number: cleanedPhone,
    phone_country_code: 'FR',
  };
}

async function extractSection<T>(
  openai: OpenAI,
  resumeText: string,
  linksInfo: string,
  sectionName: string,
  existingSectionData: ExistingSectionData,
  schema: Parameters<typeof zodResponseFormat>[0],
  systemPrompt: string
): Promise<T> {
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

async function extractContactInfo<T>(
  openai: OpenAI,
  resumeText: string,
  linksInfo: string,
  schema: Parameters<typeof zodResponseFormat>[0],
  systemPrompt: string
): Promise<T> {
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

export async function extractResumeContent(fileData: Blob): Promise<ResumeContentResult> {
  if (fileData.size > MAX_RESUME_FILE_BYTES) {
    throw new Error('RESUME_FILE_TOO_LARGE');
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdfDocument = await loadingTask.promise;

  let resumeText = '';
  const extractedLinks: Array<{ url: string; context?: string }> = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = (textContent.items as TextContentItem[])
      .map((item) => item.str)
      .join(' ');
    resumeText += `${pageText}\n\n`;

    const annotations = await page.getAnnotations();
    for (const annotation of annotations) {
      if (annotation.subtype !== 'Link' || !annotation.url) continue;

      const rect = annotation.rect;
      let linkContext = '';

      if (rect && textContent.items) {
        const linkTextItems = (textContent.items as TextContentItem[]).filter((item) => {
          if (!item.transform) return false;
          const itemX = item.transform[4];
          const itemY = item.transform[5];
          return itemX >= rect[0] - 5 && itemX <= rect[2] + 5 &&
                 itemY >= rect[1] - 5 && itemY <= rect[3] + 5;
        });
        linkContext = linkTextItems.map((item) => item.str).join(' ').trim();
      }

      if (extractedLinks.length < MAX_LINKS_FOR_EXTRACTION) {
        extractedLinks.push({
          url: annotation.url,
          context: linkContext || undefined,
        });
      }
    }
  }

  if (!resumeText || resumeText.trim().length === 0) {
    throw new Error('RESUME_TEXT_EMPTY');
  }

  if (resumeText.length > MAX_RESUME_TEXT_CHARS) {
    resumeText = resumeText.slice(0, MAX_RESUME_TEXT_CHARS);
  }

  const linksInfo = extractedLinks.length > 0
    ? `\n\n**Embedded Links Found in PDF (with context):**\n${extractedLinks.map((link, idx) => {
        if (link.context) {
          return `${idx + 1}. Text: "${link.context}" → URL: ${link.url}`;
        }
        return `${idx + 1}. URL: ${link.url}`;
      }).join('\n')}`
    : '';

  return { resumeText, linksInfo };
}

export async function extractResumeDataBySections(params: {
  openai: OpenAI;
  resumeText: string;
  linksInfo: string;
  existingDraft: ExistingDraftData | null;
  onProgress: (stepIndex: number) => void;
}): Promise<ExtractedData> {
  const { openai, resumeText, linksInfo, existingDraft, onProgress } = params;
  const extractedData = initializeExtractedData(existingDraft);

  const contactData = await extractContactInfo<ContactData>(
    openai,
    resumeText,
    linksInfo,
    ContactInfoSchema,
    contactPrompt
  );

  extractedData.student_name = contactData.student_name || extractedData.student_name;
  extractedData.email = contactData.email || extractedData.email;
  extractedData.address = contactData.address || extractedData.address;

  const rawPhone = contactData.phone_number ?? null;
  const rawCountryCode = contactData.phone_country_code ?? extractedData.phone_country_code ?? null;
  const processedPhone = processExtractedPhone(rawPhone, rawCountryCode);
  extractedData.phone_number = processedPhone.phone_number;
  extractedData.phone_country_code = processedPhone.phone_country_code;
  onProgress(3);

  const educationData = await extractSection<SectionDataWithArray>(
    openai,
    resumeText,
    linksInfo,
    'education',
    extractedData.education,
    EducationSectionSchema,
    educationPrompt(extractedData.education.length)
  );
  extractedData.education = educationData.education || [];
  onProgress(4);

  const experienceData = await extractSection<SectionDataWithArray>(
    openai,
    resumeText,
    linksInfo,
    'experience',
    extractedData.experience,
    ExperienceSectionSchema,
    experiencePrompt(extractedData.experience.length)
  );
  extractedData.experience = experienceData.experience || [];
  onProgress(5);

  const projectsData = await extractSection<SectionDataWithArray>(
    openai,
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
  onProgress(6);

  const skillsData = await extractSection<SectionDataWithArray>(
    openai,
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
  onProgress(7);

  const languagesData = await extractSection<SectionDataWithArray>(
    openai,
    resumeText,
    linksInfo,
    'languages',
    extractedData.languages,
    LanguagesSectionSchema,
    languagesPrompt(extractedData.languages.length)
  );
  extractedData.languages = languagesData.languages || [];
  onProgress(8);

  const publicationsData = await extractSection<SectionDataWithArray>(
    openai,
    resumeText,
    linksInfo,
    'publications',
    extractedData.publications,
    PublicationsSectionSchema,
    publicationsPrompt(extractedData.publications.length)
  );
  extractedData.publications = publicationsData.publications || [];
  onProgress(9);

  const certificationsData = await extractSection<SectionDataWithArray>(
    openai,
    resumeText,
    linksInfo,
    'certifications',
    extractedData.certifications,
    CertificationsSectionSchema,
    certificationsPrompt(extractedData.certifications.length)
  );
  extractedData.certifications = certificationsData.certifications || [];
  onProgress(10);

  const socialLinksData = await extractSection<SocialLinksData>(
    openai,
    resumeText,
    linksInfo,
    'social_links',
    extractedData.social_links,
    SocialLinksSectionSchema,
    socialLinksPrompt
  );
  extractedData.social_links = socialLinksData.social_links || {};
  onProgress(11);

  return extractedData;
}
