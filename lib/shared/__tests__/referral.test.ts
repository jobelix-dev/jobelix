/**
 * Tests for lib/shared/referral.ts
 *
 * Tests referral code validation, storage, URL utilities.
 * Client-side storage functions require mocking window/localStorage/document.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateReferralCode,
  REFERRAL_STORAGE_KEY,
  storeReferralCode,
  getStoredReferralCode,
  extractReferralCodeFromUrl,
} from '../referral';

// ============================================================================
// validateReferralCode
// ============================================================================

describe('validateReferralCode', () => {
  it('should accept a valid 8-char lowercase alphanumeric code', () => {
    expect(validateReferralCode('abcd1234')).toBe('abcd1234');
  });

  it('should normalize uppercase to lowercase and trim whitespace', () => {
    expect(validateReferralCode('ABCD1234')).toBe('abcd1234');
    expect(validateReferralCode('  abcd1234  ')).toBe('abcd1234');
    expect(validateReferralCode('AbCd1234')).toBe('abcd1234');
  });

  it.each([
    null,
    undefined,
    '',
    'abc123',       // too short
    'abcde12345',   // too long
    'abcd-123',     // special chars
    'abc d123',     // space inside
    12345678,       // wrong type
  ])('should return null for invalid input %j', (input) => {
    expect(validateReferralCode(input as unknown as string)).toBeNull();
  });
});

// ============================================================================
// storeReferralCode (client-side, needs window mock)
// ============================================================================

describe('storeReferralCode', () => {
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

  it('should store a valid referral code (normalized)', () => {
    expect(storeReferralCode('ABCD1234')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(REFERRAL_STORAGE_KEY, 'abcd1234');
  });

  it('should return false and not store an invalid code', () => {
    expect(storeReferralCode('invalid')).toBe(false);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('storeReferralCode (no window)', () => {
  it('should return false when window is undefined', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error - Removing window for test
    delete globalThis.window;

    const result = storeReferralCode('abcd1234');
    expect(result).toBe(false);

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

  it('should return the stored code when valid', () => {
    mockStorage[REFERRAL_STORAGE_KEY] = 'abcd1234';
    expect(getStoredReferralCode()).toBe('abcd1234');
  });

  it('should return null when no code is stored', () => {
    expect(getStoredReferralCode()).toBeNull();
  });

  it('should return null when the stored code is invalid', () => {
    mockStorage[REFERRAL_STORAGE_KEY] = 'invalid-code';
    expect(getStoredReferralCode()).toBeNull();
  });
});

// ============================================================================
// extractReferralCodeFromUrl
// ============================================================================

describe('extractReferralCodeFromUrl', () => {
  it.each([
    ['ref=abcd1234', 'abcd1234'],
    ['referral=abcd1234', 'abcd1234'],
    ['referral_code=abcd1234', 'abcd1234'],
  ])('should extract code from param %s', (qs, expected) => {
    expect(extractReferralCodeFromUrl(new URLSearchParams(qs))).toBe(expected);
  });

  it('should accept a plain query string', () => {
    expect(extractReferralCodeFromUrl('ref=abcd1234')).toBe('abcd1234');
  });

  it('should prefer "ref" over "referral" when both are present', () => {
    expect(extractReferralCodeFromUrl(new URLSearchParams('ref=aaaaaaaa&referral=bbbbbbbb'))).toBe('aaaaaaaa');
  });

  it('should return null when no referral param or code is invalid', () => {
    expect(extractReferralCodeFromUrl(new URLSearchParams('foo=bar'))).toBeNull();
    expect(extractReferralCodeFromUrl(new URLSearchParams('ref=invalid'))).toBeNull();
  });
});

