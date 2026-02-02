/**
 * Certifications Section Extraction Prompt
 * Used for extracting certifications, awards, and achievements from resume
 */

export const certificationsPrompt = (existingCount: number) => `Extract ALL certifications and awards from the resume - DO NOT INCLUDE PROJECTS OR PUBLICATIONS.
PRESERVE all existing certifications entries and ADD new ones from the resume.
Your output MUST contain AT LEAST ${existingCount} entries.

DO NOT extract entries based on icon font class names or symbols (such as "faCertificate", "faAward", "faTrophy", "faStar", etc.). Only extract real certifications and awards with meaningful names and issuing organizations.

IMPORTANT DISTINCTIONS:
- Certifications: Professional certifications, licenses, credentials (e.g., "AWS Certified Developer", "PMP Certification", "Google Analytics Certified")
- Awards: Recognitions, honors, prizes (e.g., "Dean's List", "Best Innovation Award", "Scholarship Winner")

DO NOT INCLUDE: Projects, GitHub repositories, or work experience - these belong in other sections! It is okay if you do not find any certifications or awards.

Extract from resume sections like: Certifications, Licenses, Awards, Honors, Achievements, Credentials NOT PROJECTS OR PUBLICATIONS OR GITHUB.

Expected JSON format for each entry:
{
  "name": "Certification or Award Name",
  "issuing_organization": "Organization that issued it" or null,
  "url": "Verification URL if available" or null
}

Examples:
- "AWS Certified Solutions Architect" by Amazon Web Services
- "Professional Scrum Master (PSM I)" by Scrum.org
- "Dean's List Spring 2023" by University Name
- "Google Cloud Professional Data Engineer" with certification URL

DO NOT extract GitHub repos, personal projects, or work experience as certifications.

⚠️ IMPORTANT: ALL extracted text MUST be translated to English. If the resume is in another language, translate certification names, award names, and descriptions to English (organization names can stay original).`;

