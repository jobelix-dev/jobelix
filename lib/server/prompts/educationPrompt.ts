/**
 * Education Section Extraction Prompt
 * Used for extracting education entries from resume
 */

export const educationPrompt = (existingCount: number) => `Extract ALL education entries from the resume. 
PRESERVE all existing education entries and ADD new ones from the resume.
Compare by school name and degree - only merge if they match closely.
Your output MUST contain AT LEAST ${existingCount} entries.`;
