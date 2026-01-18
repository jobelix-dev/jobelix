/**
 * Projects Section Extraction Prompt
 * Used for extracting projects from resume
 * CRITICAL: Often includes GitHub imports - must preserve all existing
 */

export const projectsPrompt = (existingCount: number) => `Extract ALL projects from the resume.
⚠️ CRITICAL: PRESERVE ALL existing projects (may include GitHub imports or manual entries).
Compare by project name and URL - only merge if they clearly match.
ADD all new projects from the resume.
Your output MUST contain AT LEAST ${existingCount} projects.
This is an ADDITIVE merge - NEVER reduce the project count!

⚠️ IMPORTANT: ALL extracted text MUST be translated to English. If the resume is in another language, translate all content (project names, descriptions, technologies used) to English.`;
