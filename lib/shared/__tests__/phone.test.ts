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
} from '../phone';

// ============================================================================
// getFlagEmoji
// ============================================================================

describe('getFlagEmoji', () => {
  it('should return flag emoji for US', () => {
    const flag = getFlagEmoji('US');
    // US flag is 🇺🇸 (U+1F1FA U+1F1F8)
    expect(flag).toBe('🇺🇸');
  });

  it('should return flag emoji for FR', () => {
    const flag = getFlagEmoji('FR');
    expect(flag).toBe('🇫🇷');
  });

  it('should return flag emoji for GB', () => {
    const flag = getFlagEmoji('GB');
    expect(flag).toBe('🇬🇧');
  });

  it('should handle lowercase input', () => {
    const flag = getFlagEmoji('us');
    expect(flag).toBe('🇺🇸');
  });

  it('should return a string of length 4 (2 surrogate pairs)', () => {
    const flag = getFlagEmoji('FR');
    // Each regional indicator is a surrogate pair (2 JS chars)
    expect(flag.length).toBe(4);
  });
});

// ============================================================================
// getCallingCodeForCountry
// ============================================================================

describe('getCallingCodeForCountry', () => {
  it('should return +33 for France', () => {
    expect(getCallingCodeForCountry('FR')).toBe('+33');
  });

  it('should return +1 for US', () => {
    expect(getCallingCodeForCountry('US')).toBe('+1');
  });

  it('should return +44 for UK', () => {
    expect(getCallingCodeForCountry('GB')).toBe('+44');
  });

  it('should return +49 for Germany', () => {
    expect(getCallingCodeForCountry('DE')).toBe('+49');
  });

  it('should return +81 for Japan', () => {
    expect(getCallingCodeForCountry('JP')).toBe('+81');
  });
});

// ============================================================================
// getCountryName
// ============================================================================

describe('getCountryName', () => {
  it('should return "France" for FR', () => {
    expect(getCountryName('FR')).toBe('France');
  });

  it('should return "United States" for US', () => {
    expect(getCountryName('US')).toBe('United States');
  });

  it('should return "United Kingdom" for GB', () => {
    expect(getCountryName('GB')).toBe('United Kingdom');
  });

  it('should return code as fallback for unknown country', () => {
    // XK (Kosovo) may not be in the COUNTRY_NAMES map
    const name = getCountryName('XK' as any);
    // Should return either the name or the code
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// getCountryInfo
// ============================================================================

describe('getCountryInfo', () => {
  it('should return complete info for France', () => {
    const info = getCountryInfo('FR');
    expect(info.code).toBe('FR');
    expect(info.name).toBe('France');
    expect(info.callingCode).toBe('+33');
    expect(info.flag).toBe('🇫🇷');
  });

  it('should return complete info for US', () => {
    const info = getCountryInfo('US');
    expect(info.code).toBe('US');
    expect(info.name).toBe('United States');
    expect(info.callingCode).toBe('+1');
    expect(info.flag).toBe('🇺🇸');
  });
});

// ============================================================================
// getAllCountries
// ============================================================================

describe('getAllCountries', () => {
  it('should return an array of countries', () => {
    const countries = getAllCountries();
    expect(Array.isArray(countries)).toBe(true);
    expect(countries.length).toBeGreaterThan(100);
  });

  it('should have priority countries first', () => {
    const countries = getAllCountries();
    const firstCodes = countries.slice(0, PRIORITY_COUNTRIES.length).map(c => c.code);
    
    for (const priorityCode of PRIORITY_COUNTRIES) {
      expect(firstCodes).toContain(priorityCode);
    }
  });

  it('should have FR as the first country', () => {
    const countries = getAllCountries();
    expect(countries[0].code).toBe('FR');
  });

  it('should have all required fields for each country', () => {
    const countries = getAllCountries();
    for (const country of countries.slice(0, 5)) {
      expect(country.code).toBeDefined();
      expect(country.name).toBeDefined();
      expect(country.callingCode).toBeDefined();
      expect(country.flag).toBeDefined();
      expect(country.callingCode.startsWith('+')).toBe(true);
    }
  });

  it('should not have duplicate country codes', () => {
    const countries = getAllCountries();
    const codes = countries.map(c => c.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

// ============================================================================
// filterCountries
// ============================================================================

describe('filterCountries', () => {
  const countries = getAllCountries();

  it('should return all countries for empty query', () => {
    const result = filterCountries(countries, '');
    expect(result.length).toBe(countries.length);
  });

  it('should return all countries for whitespace-only query', () => {
    const result = filterCountries(countries, '   ');
    expect(result.length).toBe(countries.length);
  });

  it('should filter by country name', () => {
    const result = filterCountries(countries, 'France');
    expect(result.some(c => c.code === 'FR')).toBe(true);
  });

  it('should filter case-insensitively by name', () => {
    const result = filterCountries(countries, 'france');
    expect(result.some(c => c.code === 'FR')).toBe(true);
  });

  it('should filter by country code', () => {
    const result = filterCountries(countries, 'us');
    expect(result.some(c => c.code === 'US')).toBe(true);
  });

  it('should filter by calling code', () => {
    const result = filterCountries(countries, '+33');
    expect(result.some(c => c.code === 'FR')).toBe(true);
  });

  it('should return empty for no matches', () => {
    const result = filterCountries(countries, 'zzzzzzzzzzz');
    expect(result.length).toBe(0);
  });

  it('should match partial names', () => {
    const result = filterCountries(countries, 'United');
    expect(result.some(c => c.code === 'US')).toBe(true);
    expect(result.some(c => c.code === 'GB')).toBe(true);
  });
});

// ============================================================================
// normalizeCountryCode
// ============================================================================

describe('normalizeCountryCode', () => {
  it('should return uppercase country code', () => {
    expect(normalizeCountryCode('fr')).toBe('FR');
  });

  it('should accept already uppercase code', () => {
    expect(normalizeCountryCode('US')).toBe('US');
  });

  it('should return fallback for null', () => {
    expect(normalizeCountryCode(null)).toBe('FR');
  });

  it('should return fallback for undefined', () => {
    expect(normalizeCountryCode(undefined)).toBe('FR');
  });

  it('should return fallback for empty string', () => {
    expect(normalizeCountryCode('')).toBe('FR');
  });

  it('should return fallback for invalid code', () => {
    expect(normalizeCountryCode('XX')).toBe('FR');
  });

  it('should accept custom fallback', () => {
    expect(normalizeCountryCode('XX', 'US')).toBe('US');
  });

  it('should default to DEFAULT_COUNTRY as fallback', () => {
    expect(normalizeCountryCode(null)).toBe(DEFAULT_COUNTRY);
  });
});

// ============================================================================
// isValidCountryCode
// ============================================================================

describe('isValidCountryCode', () => {
  it('should return true for valid codes', () => {
    expect(isValidCountryCode('US')).toBe(true);
    expect(isValidCountryCode('FR')).toBe(true);
    expect(isValidCountryCode('GB')).toBe(true);
    expect(isValidCountryCode('DE')).toBe(true);
  });

  it('should return true for lowercase valid codes', () => {
    expect(isValidCountryCode('us')).toBe(true);
    expect(isValidCountryCode('fr')).toBe(true);
  });

  it('should return false for null', () => {
    expect(isValidCountryCode(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidCountryCode(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidCountryCode('')).toBe(false);
  });

  it('should return false for invalid code', () => {
    expect(isValidCountryCode('XX')).toBe(false);
    expect(isValidCountryCode('ZZ')).toBe(false);
  });
});

// ============================================================================
// Constants
// ============================================================================

describe('constants', () => {
  it('should have FR as default country', () => {
    expect(DEFAULT_COUNTRY).toBe('FR');
  });

  it('should have priority countries defined', () => {
    expect(Array.isArray(PRIORITY_COUNTRIES)).toBe(true);
    expect(PRIORITY_COUNTRIES.length).toBeGreaterThan(0);
    expect(PRIORITY_COUNTRIES[0]).toBe('FR');
  });

  it('should include common countries in priority list', () => {
    expect(PRIORITY_COUNTRIES).toContain('FR');
    expect(PRIORITY_COUNTRIES).toContain('US');
    expect(PRIORITY_COUNTRIES).toContain('GB');
    expect(PRIORITY_COUNTRIES).toContain('DE');
  });
});
