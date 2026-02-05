/**
 * Shared Phone Utilities
 * 
 * Provides country data and utilities for the phone input dropdown.
 * Uses libphonenumber-js for country codes and calling codes.
 * 
 * Used by: PhoneInput component (country dropdown)
 */

import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';

// Re-export CountryCode type
export type { CountryCode };

// ============================================================================
// Constants
// ============================================================================

/** Default country when none specified */
export const DEFAULT_COUNTRY: CountryCode = 'FR';

/** Priority countries shown at top of dropdown */
export const PRIORITY_COUNTRIES: CountryCode[] = [
  'FR', 'US', 'GB', 'DE', 'ES', 'IT', 'BE', 'CH', 'CA', 'AU', 'NL', 'PT'
];

/** Country display names (subset - others fall back to code) */
const COUNTRY_NAMES: Partial<Record<CountryCode, string>> = {
  'FR': 'France',
  'US': 'United States',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'AU': 'Australia',
  'DE': 'Germany',
  'ES': 'Spain',
  'IT': 'Italy',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'PL': 'Poland',
  'PT': 'Portugal',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'IE': 'Ireland',
  'NZ': 'New Zealand',
  'SG': 'Singapore',
  'JP': 'Japan',
  'KR': 'South Korea',
  'CN': 'China',
  'HK': 'Hong Kong',
  'TW': 'Taiwan',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'IL': 'Israel',
  'ZA': 'South Africa',
  'NG': 'Nigeria',
  'EG': 'Egypt',
  'AR': 'Argentina',
  'BR': 'Brazil',
  'CL': 'Chile',
  'CO': 'Colombia',
  'MX': 'Mexico',
  'PE': 'Peru',
  'RU': 'Russia',
  'UA': 'Ukraine',
  'TR': 'Turkey',
  'GR': 'Greece',
  'CZ': 'Czechia',
  'RO': 'Romania',
  'HU': 'Hungary',
  'PH': 'Philippines',
  'TH': 'Thailand',
  'MY': 'Malaysia',
  'ID': 'Indonesia',
  'VN': 'Vietnam',
  'IN': 'India',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
};

// ============================================================================
// Types
// ============================================================================

export interface CountryInfo {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert country code to flag emoji
 */
export function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Get calling code for country (e.g., "US" -> "+1")
 */
export function getCallingCodeForCountry(country: CountryCode): string {
  try {
    return `+${getCountryCallingCode(country)}`;
  } catch {
    return '+1';
  }
}

/**
 * Get display name for country
 */
export function getCountryName(code: CountryCode): string {
  return COUNTRY_NAMES[code] || code;
}

/**
 * Get full country info for display
 */
export function getCountryInfo(code: CountryCode): CountryInfo {
  return {
    code,
    name: getCountryName(code),
    callingCode: getCallingCodeForCountry(code),
    flag: getFlagEmoji(code),
  };
}

/**
 * Get all countries with priority countries first
 */
export function getAllCountries(): CountryInfo[] {
  const allCodes = getCountries();
  const prioritySet = new Set(PRIORITY_COUNTRIES);
  
  const sortedCodes = [
    // Priority countries first (in order)
    ...PRIORITY_COUNTRIES.filter(c => allCodes.includes(c)),
    // Then all others alphabetically by name
    ...allCodes
      .filter(c => !prioritySet.has(c))
      .sort((a, b) => getCountryName(a).localeCompare(getCountryName(b))),
  ];
  
  return sortedCodes.map(getCountryInfo);
}

/**
 * Filter countries by search query (matches name, code, or calling code)
 */
export function filterCountries(countries: CountryInfo[], query: string): CountryInfo[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return countries;
  
  return countries.filter(c => 
    c.name.toLowerCase().includes(trimmed) ||
    c.code.toLowerCase().includes(trimmed) ||
    c.callingCode.includes(query.trim())
  );
}

/**
 * Normalize and validate country code
 * Returns the code if valid, otherwise returns fallback
 */
export function normalizeCountryCode(
  code: string | null | undefined, 
  fallback: CountryCode = DEFAULT_COUNTRY
): CountryCode {
  if (!code) return fallback;
  
  const upper = code.toUpperCase();
  const allCountries = getCountries();
  
  if (allCountries.includes(upper as CountryCode)) {
    return upper as CountryCode;
  }
  
  return fallback;
}

/**
 * Check if a country code is valid
 */
export function isValidCountryCode(code: string | null | undefined): code is CountryCode {
  if (!code) return false;
  const allCountries = getCountries();
  return allCountries.includes(code.toUpperCase() as CountryCode);
}
