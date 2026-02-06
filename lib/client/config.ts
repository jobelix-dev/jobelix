/**
 * Client-side configuration
 * 
 * Provides type-safe access to public environment variables
 * with proper fallbacks and validation.
 */

/**
 * Checks if the app is running in development mode.
 * Uses NODE_ENV which is set by Next.js.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Gets the HCaptcha site key from environment variables.
 * Returns empty string if not configured (captcha will not render).
 */
export function getHCaptchaSiteKey(): string {
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY;
  
  if (!siteKey) {
    console.warn('[Config] NEXT_PUBLIC_HCAPTCHA_SITEKEY is not configured');
    return '';
  }
  
  return siteKey;
}

/**
 * Checks if HCaptcha is properly configured and should be shown.
 * 
 * Use NEXT_PUBLIC_SKIP_CAPTCHA=true to skip captcha in local dev
 * when testing against a production Supabase that has captcha enabled.
 * 
 * IMPORTANT: When connecting to production Supabase with captcha enabled,
 * you MUST either:
 *   1. Show captcha (don't set SKIP_CAPTCHA), or
 *   2. Disable captcha in Supabase dashboard temporarily
 * 
 * Otherwise logins will fail with 401 because Supabase requires the captcha token.
 */
export function isHCaptchaConfigured(): boolean {
  // Explicit skip via env var (for local dev against prod Supabase with captcha disabled)
  if (process.env.NEXT_PUBLIC_SKIP_CAPTCHA === 'true') {
    return false;
  }
  
  // Show captcha if site key is configured
  return Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY);
}

/**
 * Gets the Supabase URL from environment variables.
 * Throws if not configured as this is required.
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!url) {
    throw new Error('[Config] NEXT_PUBLIC_SUPABASE_URL is required but not configured');
  }
  
  return url;
}

/**
 * Gets the Supabase anon key from environment variables.
 * Throws if not configured as this is required.
 */
export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!key) {
    throw new Error('[Config] NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not configured');
  }
  
  return key;
}

/**
 * Gets the app URL from environment variables.
 * Falls back to localhost for development.
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
