/**
 * String Utilities - Common string manipulation functions
 * 
 * Consolidated utilities used across field handlers and GPT answerer.
 * Eliminates duplication of text normalization and matching logic.
 */

/**
 * Normalize text for comparison
 * - Lowercases
 * - Removes accents (NFD decomposition)
 * - Trims whitespace
 * - Collapses multiple spaces
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')                    // Decompose accents
    .replace(/[\u0300-\u036f]/g, '')    // Remove accent marks
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching when exact match fails
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the best matching option from a list using multiple strategies
 * 
 * Matching priority:
 * 1. Exact match (case-insensitive)
 * 2. Contains match
 * 3. Levenshtein distance (fuzzy match)
 * 
 * @param text - The text to match
 * @param options - List of options to choose from
 * @returns The best matching option
 */
export function findBestMatch(text: string, options: string[]): string {
  if (options.length === 0) return text;
  
  const textLower = text.toLowerCase().trim();
  
  // 1. Exact match (case-insensitive)
  const exact = options.find(o => o.toLowerCase() === textLower);
  if (exact) return exact;

  // 2. Contains match (bidirectional)
  const contains = options.find(o => 
    textLower.includes(o.toLowerCase()) || o.toLowerCase().includes(textLower)
  );
  if (contains) return contains;

  // 3. Fuzzy match using Levenshtein distance
  let bestOption = options[0];
  let bestDistance = Infinity;

  for (const option of options) {
    const distance = levenshteinDistance(textLower, option.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestOption = option;
    }
  }

  return bestOption;
}

/**
 * Strip markdown code block wrappers from text
 * Handles both ```yaml and generic ``` blocks
 */
export function stripMarkdownCodeBlock(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return text;
  
  const lines = trimmed.split('\n');
  let startIdx = 0;
  let endIdx = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('```')) {
      if (startIdx === 0) {
        startIdx = i + 1;
      } else {
        endIdx = i;
        break;
      }
    }
  }
  
  return lines.slice(startIdx, endIdx).join('\n');
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of string
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Check if a string looks like a URL
 */
export function isUrl(text: string): boolean {
  return text.startsWith('http://') || 
         text.startsWith('https://') || 
         text.includes('.com') || 
         text.includes('.io') ||
         text.includes('.org') ||
         text.includes('.net');
}

/**
 * Extract numbers from a string
 * Returns the first number found, or null if none
 */
export function extractNumber(text: string): number | null {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}
