/**
 * Skills Section Extraction Prompt
 * Used for extracting skills and technologies from resume
 * CRITICAL: Often includes GitHub-derived skills - must preserve all existing
 */

export const skillsPrompt = (existingCount: number) => `Extract ALL skills and technologies from the resume.
⚠️ CRITICAL: PRESERVE ALL existing skills (may include GitHub imports or manual entries).
Compare by skill name (case-insensitive) - only skip if duplicate.
ADD all new skills from the resume.
Your output MUST contain AT LEAST ${existingCount} skills.
This is an ADDITIVE merge - NEVER reduce the skill count!

⚠️ IMPORTANT: ALL extracted text MUST be translated to English. If the resume is in another language, translate skill names to their English equivalents (technical terms usually stay the same, but soft skills should be translated).`;
