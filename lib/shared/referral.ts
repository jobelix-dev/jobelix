/**
 * Shared Referral Constants and Utilities
 * 
 * This file contains all referral-related constants and utility functions
 * used across both client and server code.
 * 
 * IMPORTANT: This file should NOT contain any secrets or server-only code.
 * It can be imported by both client and server components.
 */

// ============================================
// STORAGE KEYS
// ============================================

/**
 * LocalStorage key for storing referral codes during signup flow.
 * Used to persist the code through OAuth redirects.
 */
export const REFERRAL_STORAGE_KEY = 'jobelix_referral_code' as const;

/**
 * Cookie name for referral code.
 * Used as a fallback for cross-platform scenarios (browser -> Electron).
 * This cookie is set server-side and readable by both browser and Electron.
 */
export const REFERRAL_COOKIE_NAME = 'jobelix_referral' as const;

// ============================================
// VALIDATION
// ============================================

/**
 * Regex pattern for valid referral codes.
 * Must be exactly 8 lowercase alphanumeric characters.
 */
export const REFERRAL_CODE_PATTERN = /^[a-z0-9]{8}$/;

/**
 * Validates and normalizes a referral code.
 * 
 * @param code - The referral code to validate
 * @returns The normalized code if valid, null otherwise
 */
export function validateReferralCode(code: string | null | undefined): string | null {
  if (!code || typeof code !== 'string') {
    return null;
  }
  
  const normalized = code.toLowerCase().trim();
  
  if (!REFERRAL_CODE_PATTERN.test(normalized)) {
    return null;
  }
  
  return normalized;
}

// ============================================
// CLIENT-SIDE STORAGE UTILITIES
// ============================================

/**
 * Stores a referral code in localStorage.
 * Only works on the client side.
 * 
 * @param code - The referral code to store
 * @returns true if stored successfully, false otherwise
 */
export function storeReferralCode(code: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const validated = validateReferralCode(code);
  if (!validated) {
    return false;
  }
  
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, validated);
    console.log('[Referral] Stored code in localStorage:', validated);
    return true;
  } catch (error) {
    console.error('[Referral] Failed to store code:', error);
    return false;
  }
}

/**
 * Retrieves and validates the stored referral code from localStorage.
 * Only works on the client side.
 * 
 * @returns The validated referral code or null
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
    return validateReferralCode(code);
  } catch (error) {
    console.error('[Referral] Failed to retrieve code:', error);
    return null;
  }
}

/**
 * Clears the stored referral code from localStorage.
 * Only works on the client side.
 */
export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    console.log('[Referral] Cleared code from localStorage');
  } catch (error) {
    console.error('[Referral] Failed to clear code:', error);
  }
}

/**
 * Gets referral code from cookie (client-side).
 * This is used as a fallback when localStorage might not be shared
 * (e.g., between browser and Electron).
 * 
 * @returns The validated referral code from cookie or null
 */
export function getReferralCodeFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === REFERRAL_COOKIE_NAME) {
        return validateReferralCode(decodeURIComponent(value));
      }
    }
    return null;
  } catch (error) {
    console.error('[Referral] Failed to read cookie:', error);
    return null;
  }
}

/**
 * Gets referral code from any available source (localStorage or cookie).
 * Prefers localStorage but falls back to cookie.
 * 
 * @returns The validated referral code or null
 */
export function getReferralCodeFromAnySource(): string | null {
  // Try localStorage first (same-origin only)
  const fromLocalStorage = getStoredReferralCode();
  if (fromLocalStorage) {
    return fromLocalStorage;
  }
  
  // Fall back to cookie (works cross-platform)
  return getReferralCodeFromCookie();
}

/**
 * Clears referral code from all client-side storage (localStorage and cookie).
 */
export function clearAllReferralStorage(): void {
  clearStoredReferralCode();
  
  // Clear cookie by setting it expired
  if (typeof document !== 'undefined') {
    document.cookie = `${REFERRAL_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    console.log('[Referral] Cleared cookie');
  }
}

// ============================================
// URL UTILITIES
// ============================================

/**
 * Extracts referral code from URL search params.
 * 
 * @param searchParams - URLSearchParams or string query string
 * @returns The validated referral code or null
 */
export function extractReferralCodeFromUrl(searchParams: URLSearchParams | string): string | null {
  const params = typeof searchParams === 'string' 
    ? new URLSearchParams(searchParams) 
    : searchParams;
  
  const code = params.get('ref') || params.get('referral') || params.get('referral_code');
  return validateReferralCode(code);
}

/**
 * Adds referral code to a URL if one is stored.
 * Used to pass referral code through OAuth redirects.
 * 
 * @param url - The URL to add the referral code to
 * @param code - Optional explicit code (otherwise uses stored code)
 * @returns The URL with referral code added, or original URL if no code
 */
export function addReferralCodeToUrl(url: string, code?: string | null): string {
  const referralCode = code ?? getReferralCodeFromAnySource();
  
  if (!referralCode) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('referral_code', referralCode);
    return urlObj.toString();
  } catch {
    // If URL parsing fails, try simple string concatenation
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}referral_code=${referralCode}`;
  }
}
