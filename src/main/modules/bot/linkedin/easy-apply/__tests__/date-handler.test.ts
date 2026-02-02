/**
 * Date Handler Tests
 * 
 * Tests for date parsing and formatting functions.
 * Tests the date parsing logic without needing browser automation.
 */

import { describe, it, expect } from 'vitest';

// Test the date parsing logic directly
// These functions match the private methods in DateHandler

/**
 * Parse date answer into components (copied from DateHandler for testing)
 */
function parseDateAnswer(answer: string): { month?: number; year?: number; day?: number } {
  const result: { month?: number; year?: number; day?: number } = {};

  // Try YYYY-MM-DD format
  const isoMatch = answer.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    result.year = parseInt(isoMatch[1]);
    result.month = parseInt(isoMatch[2]);
    result.day = parseInt(isoMatch[3]);
    return result;
  }

  // Try MM/DD/YYYY format
  const usMatch = answer.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    result.month = parseInt(usMatch[1]);
    result.day = parseInt(usMatch[2]);
    result.year = parseInt(usMatch[3]);
    return result;
  }

  // Try "Month Year" format (e.g., "January 2024")
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const lower = answer.toLowerCase();
  for (let i = 0; i < monthNames.length; i++) {
    if (lower.includes(monthNames[i])) {
      result.month = i + 1;
      break;
    }
  }

  // Extract year
  const yearMatch = answer.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[0]);
  }

  return result;
}

/**
 * Format date for HTML5 date input (YYYY-MM-DD)
 */
function formatDateForInput(answer: string): string | null {
  const parsed = parseDateAnswer(answer);
  
  if (!parsed.year) return null;
  
  const year = parsed.year;
  const month = (parsed.month || 1).toString().padStart(2, '0');
  const day = (parsed.day || 1).toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

describe('parseDateAnswer', () => {
  describe('ISO format (YYYY-MM-DD)', () => {
    it('should parse full ISO date', () => {
      const result = parseDateAnswer('2024-03-15');
      expect(result).toEqual({ year: 2024, month: 3, day: 15 });
    });

    it('should parse ISO date with single digit month/day', () => {
      const result = parseDateAnswer('2024-1-5');
      expect(result).toEqual({ year: 2024, month: 1, day: 5 });
    });
  });

  describe('US format (MM/DD/YYYY)', () => {
    it('should parse full US date', () => {
      const result = parseDateAnswer('03/15/2024');
      expect(result).toEqual({ month: 3, day: 15, year: 2024 });
    });

    it('should parse US date with single digits', () => {
      const result = parseDateAnswer('1/5/2024');
      expect(result).toEqual({ month: 1, day: 5, year: 2024 });
    });
  });

  describe('Natural language format', () => {
    it('should parse "Month Year" format', () => {
      const result = parseDateAnswer('January 2024');
      expect(result).toEqual({ month: 1, year: 2024 });
    });

    it('should parse month name case-insensitively', () => {
      expect(parseDateAnswer('MARCH 2024').month).toBe(3);
      expect(parseDateAnswer('march 2024').month).toBe(3);
      expect(parseDateAnswer('March 2024').month).toBe(3);
    });

    it('should parse all month names', () => {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      months.forEach((month, index) => {
        const result = parseDateAnswer(`${month} 2024`);
        expect(result.month).toBe(index + 1);
      });
    });

    it('should extract year from text', () => {
      expect(parseDateAnswer('sometime in 2024').year).toBe(2024);
      expect(parseDateAnswer('around 1999').year).toBe(1999);
    });

    it('should not extract invalid years', () => {
      expect(parseDateAnswer('in the year 1899').year).toBeUndefined();
      expect(parseDateAnswer('year 2100').year).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should return empty object for invalid input', () => {
      expect(parseDateAnswer('invalid')).toEqual({});
      expect(parseDateAnswer('')).toEqual({});
    });
  });
});

describe('formatDateForInput', () => {
  it('should format full date', () => {
    expect(formatDateForInput('2024-03-15')).toBe('2024-03-15');
  });

  it('should pad single digit month and day', () => {
    expect(formatDateForInput('2024-1-5')).toBe('2024-01-05');
  });

  it('should default day and month to 01 if missing', () => {
    expect(formatDateForInput('January 2024')).toBe('2024-01-01');
    expect(formatDateForInput('2024')).toBe('2024-01-01');
  });

  it('should return null if year is missing', () => {
    expect(formatDateForInput('January')).toBeNull();
    expect(formatDateForInput('invalid')).toBeNull();
  });
});
