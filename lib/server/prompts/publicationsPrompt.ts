/**
 * Publications Section Extraction Prompt
 * Used for extracting publications, research papers, or academic work from resume
 */

export const publicationsPrompt = (existingCount: number) => `Extract ALL publications, research papers, or academic work from the resume.
PRESERVE all existing publication entries and ADD new ones from the resume.
Your output MUST contain AT LEAST ${existingCount} entries.`;
