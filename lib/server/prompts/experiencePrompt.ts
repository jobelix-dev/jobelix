/**
 * Experience Section Extraction Prompt
 * Used for extracting work experience from resume
 */

export const experiencePrompt = (existingCount: number) => `Extract ALL work experience from the resume.
PRESERVE all existing experience entries and ADD new ones from the resume.
Compare by company name and position - only merge if they match closely.
Your output MUST contain AT LEAST ${existingCount} entries.`;
