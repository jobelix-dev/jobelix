/**
 * Publications Section Extraction Prompt
 * Used for extracting publications, research papers, or academic work from resume
 */

export const publicationsPrompt = (existingCount: number) => `Extract ALL publications, research papers, or academic work from the resume - NO PROJETS OR AWARDS.
PRESERVE all existing publication entries and ADD new ones from the resume.
Your output MUST contain AT LEAST ${existingCount} entries.

⚠️ IMPORTANT: ALL extracted text MUST be translated to English. If the resume is in another language, translate publication titles and descriptions to English (author names and journal names can stay original).`;
