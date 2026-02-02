/**
 * Prompts Module - Barrel Export
 * 
 * Split into logical categories for maintainability:
 * - section-prompts: Resume section-specific prompts (personal info, experience, etc.)
 * - form-prompts: Question answering prompts (options, numeric, cover letter)
 * - tailoring-prompts: Resume tailoring pipeline prompts (4 stages)
 */

export * from './section-prompts';
export * from './form-prompts';
export * from './tailoring-prompts';
