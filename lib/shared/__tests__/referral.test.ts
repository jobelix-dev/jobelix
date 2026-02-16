/**
 * Tests for lib/shared/referral.ts
 * 
 * Tests referral code validation, storage, URL utilities.
 * Client-side storage functions require mocking window/localStorage/document.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateReferralCode,
  REFERRAL_CODE_PATTERN,
  REFERRAL_STORAGE_KEY,
  REFERRAL_COOKIE_NAME,
  storeReferralCode,
  getStoredReferralCode,
  clearStoredReferralCode,
  getReferralCodeFromCookie,
  extractReferralCodeFromUrl,
  addReferralCodeToUrl,
  getReferralCodeFromAnySource,
  clearAllReferralStorage,
} from '../referral';

// ============================================================================
// validateReferralCode
// ============================================================================

describe('validateReferralCode', () => {
  it('should accept valid 8-char lowercase alphanumeric code', () => {
    expect(validateReferralCode('abcd1234')).toBe('abcd1234');
  });

  it('should accept all lowercase letters', () => {
    expect(validateReferralCode('abcdefgh')).toBe('abcdefgh');
  });

  it('should accept all digits', () => {
    expect(validateReferralCode('12345678')).toBe('12345678');
  });

  it('should normalize uppercase to lowercase', () => {
    expect(validateReferralCode('ABCD1234')).toBe('abcd1234');
  });

  it('should normalize mixed case', () => {
    expect(validateReferralCode('AbCd1234')).toBe('abcd1234');
  });

  it('should trim whitespace', () => {
    expect(validateReferralCode('  abcd1234  ')).toBe('abcd1234');
  });

  it('should return null for null input', () => {
    expect(validateReferralCode(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(validateReferralCode(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(validateReferralCode('')).toBeNull();
  });

  it('should return null for code shorter than 8 chars', () => {
    expect(validateReferralCode('abc123')).toBeNull();
  });

  it('should return null for code longer than 8 chars', () => {
    expect(validateReferralCode('abcde12345')).toBeNull();
  });

  it('should return null for code with special characters', () => {
    expect(validateReferralCode('abcd-123')).toBeNull();
  });

  it('should return null for code with spaces (after trim)', () => {
    expect(validateReferralCode('abc d123')).toBeNull();
  });

  it('should return null for non-string type', () => {
    expect(validateReferralCode(12345678 as any)).toBeNull();
  });
});

// ============================================================================
// REFERRAL_CODE_PATTERN
// ============================================================================

describe('REFERRAL_CODE_PATTERN', () => {
  it('should match valid codes', () => {
    expect(REFERRAL_CODE_PATTERN.test('abcd1234')).toBe(true);
    expect(REFERRAL_CODE_PATTERN.test('00000000')).toBe(true);
    expect(REFERRAL_CODE_PATTERN.test('zzzzzzzz')).toBe(true);
  });

  it('should not match invalid codes', () => {
    expect(REFERRAL_CODE_PATTERN.test('ABCD1234')).toBe(false);
    expect(REFERRAL_CODE_PATTERN.test('abc')).toBe(false);
    expect(REFERRAL_CODE_PATTERN.test('abcdefghi')).toBe(false);
    expect(REFERRAL_CODE_PATTERN.test('abcd-123')).toBe(false);
  });
});

// ============================================================================
// storeReferralCode (client-side, needs window mock)
// ============================================================================

describe('storeReferralCode', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    // Define a minimal window-like environment
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should store a valid referral code', () => {
    const result = storeReferralCode('abcd1234');
    expect(result).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(REFERRAL_STORAGE_KEY, 'abcd1234');
  });

  it('should return false for invalid code', () => {
    const result = storeReferralCode('invalid');
    expect(result).toBe(false);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should normalize code before storing', () => {
    const result = storeReferralCode('ABCD1234');
    expect(result).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(REFERRAL_STORAGE_KEY, 'abcd1234');
  });
});

describe('storeReferralCode (no window)', () => {
  it('should return false when window is undefined', () => {
    // In Node test environment, window should be undefined by default
    // after unstubbing
    const originalWindow = globalThis.window;
    // @ts-expect-error - Removing window for test
    delete globalThis.window;
    
    const result = storeReferralCode('abcd1234');
    expect(result).toBe(false);
    
    // Restore
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    }
  });
});

// ============================================================================
// getStoredReferralCode
// ============================================================================

describe('getStoredReferralCode', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return stored code if valid', () => {
    mockStorage[REFERRAL_STORAGE_KEY] = 'abcd1234';
    expect(getStoredReferralCode()).toBe('abcd1234');
  });

  it('should return null if no code stored', () => {
    expect(getStoredReferralCode()).toBeNull();
  });

  it('should return null if stored code is invalid', () => {
    mockStorage[REFERRAL_STORAGE_KEY] = 'invalid-code';
    expect(getStoredReferralCode()).toBeNull();
  });
});

// ============================================================================
// clearStoredReferralCode
// ============================================================================

describe('clearStoredReferralCode', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should remove the referral code from localStorage', () => {
    clearStoredReferralCode();
    expect(localStorage.removeItem).toHaveBeenCalledWith(REFERRAL_STORAGE_KEY);
  });
});

// ============================================================================
// getReferralCodeFromCookie
// ============================================================================

describe('getReferralCodeFromCookie', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return code from cookie if valid', () => {
    vi.stubGlobal('document', {
      cookie: `${REFERRAL_COOKIE_NAME}=abcd1234; other=value`,
    });

    expect(getReferralCodeFromCookie()).toBe('abcd1234');
  });

  it('should return null if cookie not found', () => {
    vi.stubGlobal('document', {
      cookie: 'other=value',
    });

    expect(getReferralCodeFromCookie()).toBeNull();
  });

  it('should return null if cookie value is invalid', () => {
    vi.stubGlobal('document', {
      cookie: `${REFERRAL_COOKIE_NAME}=invalid`,
    });

    expect(getReferralCodeFromCookie()).toBeNull();
  });

  it('should handle encoded cookie values', () => {
    vi.stubGlobal('document', {
      cookie: `${REFERRAL_COOKIE_NAME}=${encodeURIComponent('abcd1234')}`,
    });

    expect(getReferralCodeFromCookie()).toBe('abcd1234');
  });
});

// ============================================================================
// extractReferralCodeFromUrl
// ============================================================================

describe('extractReferralCodeFromUrl', () => {
  it('should extract code from "ref" param', () => {
    const params = new URLSearchParams('ref=abcd1234');
    expect(extractReferralCodeFromUrl(params)).toBe('abcd1234');
  });

  it('should extract code from "referral" param', () => {
    const params = new URLSearchParams('referral=abcd1234');
    expect(extractReferralCodeFromUrl(params)).toBe('abcd1234');
  });

  it('should extract code from "referral_code" param', () => {
    const params = new URLSearchParams('referral_code=abcd1234');
    expect(extractReferralCodeFromUrl(params)).toBe('abcd1234');
  });

  it('should accept string query string', () => {
    expect(extractReferralCodeFromUrl('ref=abcd1234')).toBe('abcd1234');
  });

  it('should return null if no referral param', () => {
    const params = new URLSearchParams('foo=bar');
    expect(extractReferralCodeFromUrl(params)).toBeNull();
  });

  it('should return null if code is invalid', () => {
    const params = new URLSearchParams('ref=invalid');
    expect(extractReferralCodeFromUrl(params)).toBeNull();
  });

  it('should prefer "ref" over "referral"', () => {
    const params = new URLSearchParams('ref=aaaaaaaa&referral=bbbbbbbb');
    expect(extractReferralCodeFromUrl(params)).toBe('aaaaaaaa');
  });
});

// ============================================================================
// addReferralCodeToUrl
// ============================================================================

describe('addReferralCodeToUrl', () => {
  it('should add referral code to URL', () => {
    const result = addReferralCodeToUrl('https://example.com', 'abcd1234');
    expect(result).toContain('referral_code=abcd1234');
  });

  it('should handle URL with existing query params', () => {
    const result = addReferralCodeToUrl('https://example.com?foo=bar', 'abcd1234');
    expect(result).toContain('foo=bar');
    expect(result).toContain('referral_code=abcd1234');
  });

  it('should return original URL if no code provided and no stored code', () => {
    // Mock no stored code available
    const originalWindow = globalThis.window;
    // @ts-expect-error - Removing window for test
    delete globalThis.window;
    
    const result = addReferralCodeToUrl('https://example.com', null);
    expect(result).toBe('https://example.com');
    
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    }
  });

  it('should handle invalid URL gracefully with string concatenation', () => {
    const result = addReferralCodeToUrl('not-a-url', 'abcd1234');
    expect(result).toContain('referral_code=abcd1234');
  });

  it('should handle URL with existing referral_code param (overwrite)', () => {
    const result = addReferralCodeToUrl('https://example.com?referral_code=old', 'abcd1234');
    expect(result).toContain('referral_code=abcd1234');
    expect(result).not.toContain('referral_code=old');
  });
});

// ============================================================================
// Constants
// ============================================================================

describe('constants', () => {
  it('should have correct storage key', () => {
    expect(REFERRAL_STORAGE_KEY).toBe('jobelix_referral_code');
  });

  it('should have correct cookie name', () => {
    expect(REFERRAL_COOKIE_NAME).toBe('jobelix_referral');
  });
});
