/**
 * Social Links Section Extraction Prompt
 * Used for extracting social media profile URLs from resume
 */

export const socialLinksPrompt = `Extract social media profile URLs from the resume.
Use embedded links when available. Preserve existing links and add new ones.
Supported: GitHub, LinkedIn, StackOverflow, Kaggle, LeetCode, Portfolio.

Note: URLs don't need translation, but if there's any descriptive text, translate it to English.`;
