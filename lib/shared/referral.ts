/**
 * Shared Referral Constants and Utilities
 *
 * Referral code flow:
 *   - Email signup:  code stored in user_metadata at POST /api/auth/signup
 *                    → applied server-side in /auth/callback on email confirmation
 *   - OAuth signup:  code read from localStorage (or current URL) at click time
 *                    → appended as ?referral_code=… to the OAuth redirect URL
 *                    → applied server-side in /auth/callback from the URL param
 *
 * No cookies are used — user_metadata handles the cross-browser email case.
 */

// ============================================
// STORAGE
// ============================================

/**
 * localStorage key used to stage a referral code while the user is on the
 * signup page before clicking an OAuth button.
 */
export const REFERRAL_STORAGE_KEY = 'jobelix_referral_code' as const;

/**
 * Regex pattern for valid referral codes.
 * Exactly 8 lowercase alphanumeric characters.
 */
export const REFERRAL_CODE_PATTERN = /^[a-z0-9]{8}$/;

// ============================================
// VALIDATION
// ============================================

/**
 * Validates and normalises a referral code.
 * @returns The normalised code if valid, null otherwise.
 */
export function validateReferralCode(code: string | null | undefined): string | null {
  if (!code || typeof code !== 'string') return null;
  const normalized = code.toLowerCase().trim();
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}

// ============================================
// CLIENT-SIDE STORAGE
// ============================================

/**
 * Stores a validated referral code in localStorage.
 * Call this when the user lands on /signup?ref=CODE so it survives an OAuth
 * redirect that opens a popup and navigates away.
 */
export function storeReferralCode(code: string): boolean {
  if (typeof window === 'undefined') return false;
  const validated = validateReferralCode(code);
  if (!validated) return false;
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, validated);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the validated referral code from localStorage, or null.
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return validateReferralCode(localStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Removes the referral code from localStorage (call after it has been applied).
 */
export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ============================================
// URL UTILITIES
// ============================================

/**
 * Extracts and validates a referral code from URL search params.
 * Accepts the ?ref=, ?referral=, or ?referral_code= parameter names.
 */
export function extractReferralCodeFromUrl(searchParams: URLSearchParams | string): string | null {
  const params = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;
  return validateReferralCode(
    params.get('ref') || params.get('referral') || params.get('referral_code')
  );
}
