/**
 * Tests for lib/shared/phone.ts
 *
 * Tests phone/country utility functions:
 * - getFlagEmoji
 * - getCallingCodeForCountry
 * - getCountryName
 * - getCountryInfo
 * - getAllCountries
 * - filterCountries
 * - normalizeCountryCode
 * - isValidCountryCode
 */

import { describe, it, expect } from 'vitest';
import {
  getFlagEmoji,
  getCallingCodeForCountry,
  getCountryName,
  getCountryInfo,
  getAllCountries,
  filterCountries,
  normalizeCountryCode,
  isValidCountryCode,
  DEFAULT_COUNTRY,
  PRIORITY_COUNTRIES,
  type CountryCode,
} from '../phone';

// ============================================================================
// getFlagEmoji
// ============================================================================

describe('getFlagEmoji', () => {
  it('should return the correct flag emoji for US', () => {
    expect(getFlagEmoji('US')).toBe('🇺🇸');
  });

  it('should accept lowercase input', () => {
    expect(getFlagEmoji('us')).toBe('🇺🇸');
  });

  it('should return a string of 4 JS characters (2 surrogate pairs)', () => {
    expect(getFlagEmoji('FR').length).toBe(4);
  });
});

// ============================================================================
// getCallingCodeForCountry
// ============================================================================

describe('getCallingCodeForCountry', () => {
  it.each([
    ['FR', '+33'],
    ['US', '+1'],
    ['GB', '+44'],
    ['DE', '+49'],
    ['JP', '+81'],
  ] as [CountryCode, string][])('should return %s for %s', (code, expected) => {
    expect(getCallingCodeForCountry(code)).toBe(expected);
  });
});

// ============================================================================
// getCountryName
// ============================================================================

describe('getCountryName', () => {
  it('should return the correct name for a known country', () => {
    expect(getCountryName('FR')).toBe('France');
    expect(getCountryName('US')).toBe('United States');
  });

  it('should return a non-empty string as fallback for unknown country', () => {
    const name = getCountryName('XK' as CountryCode);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// getCountryInfo
// ============================================================================

describe('getCountryInfo', () => {
  it.each([
    ['FR', 'France', '+33', '🇫🇷'],
    ['US', 'United States', '+1', '🇺🇸'],
  ] as [CountryCode, string, string, string][])('should return complete info for %s', (code, name, callingCode, flag) => {
    const info = getCountryInfo(code);
    expect(info.code).toBe(code);
    expect(info.name).toBe(name);
    expect(info.callingCode).toBe(callingCode);
    expect(info.flag).toBe(flag);
  });
});

// ============================================================================
// getAllCountries
// ============================================================================

describe('getAllCountries', () => {
  it('should return more than 100 countries with required fields', () => {
    const countries = getAllCountries();
    expect(countries.length).toBeGreaterThan(100);
    for (const country of countries.slice(0, 5)) {
      expect(country.code).toBeDefined();
      expect(country.name).toBeDefined();
      expect(country.callingCode.startsWith('+')).toBe(true);
      expect(country.flag).toBeDefined();
    }
  });

  it('should have PRIORITY_COUNTRIES as the first entries', () => {
    const countries = getAllCountries();
    const firstCodes = countries.slice(0, PRIORITY_COUNTRIES.length).map(c => c.code);
    for (const code of PRIORITY_COUNTRIES) {
      expect(firstCodes).toContain(code);
    }
  });

  it('should not have duplicate country codes', () => {
    const countries = getAllCountries();
    const codes = countries.map(c => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

// ============================================================================
// filterCountries
// ============================================================================

describe('filterCountries', () => {
  const countries = getAllCountries();

  it.each([
    ['', true],
    ['   ', true],
  ])('should return all countries for empty/whitespace query %j', (query, expectAll) => {
    const result = filterCountries(countries, query);
    expect(result.length === countries.length).toBe(expectAll);
  });

  it('should filter by name (case-insensitive)', () => {
    expect(filterCountries(countries, 'France').some(c => c.code === 'FR')).toBe(true);
    expect(filterCountries(countries, 'france').some(c => c.code === 'FR')).toBe(true);
  });

  it('should filter by country code', () => {
    expect(filterCountries(countries, 'us').some(c => c.code === 'US')).toBe(true);
  });

  it('should filter by calling code', () => {
    expect(filterCountries(countries, '+33').some(c => c.code === 'FR')).toBe(true);
  });

  it('should match partial names', () => {
    const result = filterCountries(countries, 'United');
    expect(result.some(c => c.code === 'US')).toBe(true);
    expect(result.some(c => c.code === 'GB')).toBe(true);
  });

  it('should return empty for no matches', () => {
    expect(filterCountries(countries, 'zzzzzzzzzzz').length).toBe(0);
  });
});

// ============================================================================
// normalizeCountryCode
// ============================================================================

describe('normalizeCountryCode', () => {
  it('should uppercase a valid lowercase code', () => {
    expect(normalizeCountryCode('fr')).toBe('FR');
    expect(normalizeCountryCode('US')).toBe('US');
  });

  it.each([null, undefined, '', 'XX'])('should return default fallback for %j', (input) => {
    expect(normalizeCountryCode(input)).toBe(DEFAULT_COUNTRY);
  });

  it('should use a custom fallback when provided', () => {
    expect(normalizeCountryCode('XX', 'US')).toBe('US');
  });
});

// ============================================================================
// isValidCountryCode
// ============================================================================

describe('isValidCountryCode', () => {
  it('should return true for valid codes (upper and lowercase)', () => {
    expect(isValidCountryCode('US')).toBe(true);
    expect(isValidCountryCode('fr')).toBe(true);
  });

  it.each([null, undefined, '', 'XX', 'ZZ'])('should return false for invalid input %j', (input) => {
    expect(isValidCountryCode(input)).toBe(false);
  });
});

// ============================================================================
// Constants
// ============================================================================

describe('constants', () => {
  it('should have FR as default country and as the first priority country', () => {
    expect(DEFAULT_COUNTRY).toBe('FR');
    expect(PRIORITY_COUNTRIES[0]).toBe('FR');
  });

  it('should include common countries in the priority list', () => {
    expect(PRIORITY_COUNTRIES).toContain('FR');
    expect(PRIORITY_COUNTRIES).toContain('US');
    expect(PRIORITY_COUNTRIES).toContain('GB');
    expect(PRIORITY_COUNTRIES).toContain('DE');
  });
});
