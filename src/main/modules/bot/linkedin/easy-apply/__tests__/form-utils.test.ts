/**
 * Form Utils Tests
 * 
 * Tests for the form utility functions used across field handlers.
 * These are pure functions and don't require Playwright mocking.
 */

import { describe, it, expect } from 'vitest';
import { normalizeText } from '../form-utils';

describe('normalizeText', () => {
  it('should convert text to lowercase', () => {
    expect(normalizeText('Hello World')).toBe('hello world');
    expect(normalizeText('UPPERCASE')).toBe('uppercase');
  });

  it('should remove accents and diacritics', () => {
    expect(normalizeText('café')).toBe('cafe');
    expect(normalizeText('résumé')).toBe('resume');
    expect(normalizeText('naïve')).toBe('naive');
    expect(normalizeText('señor')).toBe('senor');
    expect(normalizeText('über')).toBe('uber');
  });

  it('should normalize whitespace', () => {
    expect(normalizeText('hello   world')).toBe('hello world');
    expect(normalizeText('  hello  ')).toBe('hello');
    expect(normalizeText('\thello\nworld')).toBe('hello world');
  });

  it('should handle empty strings', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText('   ')).toBe('');
  });

  it('should handle special characters', () => {
    // Special characters should remain (they're not accents)
    expect(normalizeText('hello-world')).toBe('hello-world');
    expect(normalizeText('test@example.com')).toBe('test@example.com');
  });

  it('should handle mixed content', () => {
    expect(normalizeText('  Café RÉSUMÉ  hello  ')).toBe('cafe resume hello');
  });
});
