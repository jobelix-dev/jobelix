/**
 * CSV Utilities - CSV parsing and writing functions
 * 
 * Used for persisting saved answers and job application results.
 */

import * as fs from 'fs';
import { createLogger } from './logger';

const log = createLogger('CSVUtils');

/**
 * A saved Q&A pair from previous applications
 */
export interface SavedAnswer {
  questionType: string;
  questionText: string;
  answer: string;
}

/**
 * Parse a CSV line into parts, handling quoted fields
 * 
 * @param line - CSV line to parse
 * @returns Array of field values
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result.map(s => s.trim());
}

/**
 * Escape a value for CSV output
 * 
 * @param value - Value to escape
 * @returns Escaped value with quotes if needed
 */
export function escapeCSVValue(value: string): string {
  // Always wrap in quotes and escape any inner quotes
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Format a row for CSV output
 * 
 * @param values - Array of values to format
 * @returns CSV-formatted line with newline
 */
export function formatCSVLine(values: string[]): string {
  return values.map(escapeCSVValue).join(',') + '\n';
}

/**
 * Load saved answers from a CSV file
 * 
 * File format: questionType,questionText,answer
 * 
 * @param filePath - Path to CSV file
 * @returns Array of saved answers
 */
export function loadSavedAnswers(filePath: string): SavedAnswer[] {
  const answers: SavedAnswer[] = [];
  
  if (!fs.existsSync(filePath)) {
    log.debug(`No saved answers file found: ${filePath}`);
    return answers;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const parts = parseCSVLine(line);
      if (parts.length >= 3) {
        const [questionType, questionText, answer] = parts;
        
        // Skip invalid placeholder answers
        if (!answer || answer.length <= 2) continue;
        const answerLower = answer.toLowerCase();
        if (answerLower.startsWith('select') || answerLower.startsWith('choose')) continue;
        if (['option', 'n/a', 'none', 'null'].includes(answerLower)) continue;

        answers.push({ questionType, questionText, answer });
      }
    }

    log.info(`Loaded ${answers.length} saved answers`);
  } catch (error) {
    log.error(`Failed to load saved answers: ${error}`);
  }

  return answers;
}

/**
 * Save a new answer to a CSV file
 * 
 * Checks for duplicates before appending.
 * 
 * @param filePath - Path to CSV file
 * @param existing - Array of existing answers (for duplicate check)
 * @param questionType - Type of question
 * @param questionText - Question text
 * @param answer - Answer text
 * @returns true if saved, false if duplicate
 */
export function saveAnswer(
  filePath: string,
  existing: SavedAnswer[],
  questionType: string,
  questionText: string,
  answer: string
): boolean {
  // Check for duplicates
  const exists = existing.some(
    a => a.questionType.toLowerCase() === questionType.toLowerCase() &&
         a.questionText.toLowerCase() === questionText.toLowerCase()
  );

  if (exists) {
    return false;
  }

  // Append to CSV
  const line = formatCSVLine([questionType, questionText, answer]);
  fs.appendFileSync(filePath, line, 'utf-8');
  
  return true;
}

/**
 * Append a job result to a CSV file
 * 
 * @param filePath - Path to CSV file
 * @param company - Company name
 * @param title - Job title
 * @param link - Job URL
 * @param location - Job location
 */
export function appendJobResult(
  filePath: string,
  company: string,
  title: string,
  link: string,
  location: string
): void {
  const line = formatCSVLine([company, title, link, location]);
  fs.appendFileSync(filePath, line, 'utf-8');
}
