/**
 * Languages Section Extraction Prompt
 * Used for extracting spoken languages from resume
 */

export const languagesPrompt = (existingCount: number) => `Extract ALL spoken languages from the resume.
PRESERVE all existing language entries and ADD new ones from the resume.
Your output MUST contain AT LEAST ${existingCount} entries.

⚠️ IMPORTANT: Language names MUST be in English (e.g., "German" not "Deutsch", "French" not "Français", "Spanish" not "Español").`;
