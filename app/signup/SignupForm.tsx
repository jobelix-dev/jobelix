/**
 * Signup Form Component
 * 
 * Client-side registration form with role selection.
 * Used by: app/signup/page.tsx
 * Calls: lib/api.ts -> app/api/auth/signup/route.ts
 * Creates user account and initializes talent/employer profile.
 * Note: DB stores role as student/company, UI displays as talent/employer
 * Supports email/password and OAuth (Google, LinkedIn, GitHub).
 * 
 * Referral Flow:
 * - Referral code comes from URL (?ref=CODE) and is passed as prop
 * - Code is stored in localStorage (survives OAuth redirects)
 * - Code is applied server-side after email confirmation or OAuth completion
 * - For email signup without confirmation, code is applied immediately
 */

'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { api } from '@/lib/client/api';
import { getHCaptchaSiteKey, isHCaptchaConfigured } from '@/lib/client/config';
import SocialLoginButtons from '@/app/components/auth/SocialLoginButtons';
import { storeReferralCode, validateReferralCode, getStoredReferralCode } from '@/lib/shared/referral';

/** Valid user roles for the platform */
type UserRole = 'student' | 'company';

interface SignupFormProps {
  /** The user role - 'student' or 'company' */
  role: UserRole;
  /** Optional referral code from URL */
  referralCode?: string | null;
}

/**
 * Apply a referral code after successful signup (when user is authenticated).
 * This should only be called when the user is definitely logged in.
 * 
 * @returns true if applied successfully, false otherwise
 */
async function applyReferralCode(code: string): Promise<boolean> {
  try {
    const response = await fetch('/api/student/referral/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    
    if (response.ok) {
      console.log('[Signup] Referral code applied successfully');
      return true;
    } else {
      const data = await response.json();
      console.warn('[Signup] Failed to apply referral code:', data.error);
      return false;
    }
  } catch (err) {
    console.error('[Signup] Error applying referral code:', err);
    return false;
  }
}

export default function SignupForm({ role, referralCode }: SignupFormProps) {
  const router = useRouter();
  const hCaptchaSiteKey = getHCaptchaSiteKey();
  const hasCaptcha = isHCaptchaConfigured();
  const captchaRef = useRef<HCaptcha>(null);
  
  // Display role for UI (talent/employer) vs DB role (student/company)
  const displayRole = role === 'student' ? 'talent' : 'employer';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  // Manual referral code input (for Electron users who can't receive code via URL)
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [manualReferralCode, setManualReferralCode] = useState('');
  const [referralError, setReferralError] = useState('');

  // Effective referral code: prefer URL param, fall back to manual input or localStorage
  const effectiveReferralCode = referralCode || (manualReferralCode && validateReferralCode(manualReferralCode) ? manualReferralCode : null);

  // Store referral code in localStorage when component mounts.
  // This preserves the code through OAuth redirects and for email confirmation flow.
  // The code will be applied:
  // 1. Server-side in /auth/callback for OAuth and email confirmation
  // 2. Client-side here for auto-confirmed email signup
  useEffect(() => {
    if (referralCode) {
      storeReferralCode(referralCode);
    }
  }, [referralCode]);
  
  // Check for existing referral code in localStorage on mount (for Electron users)
  useEffect(() => {
    if (!referralCode) {
      const storedCode = getStoredReferralCode();
      if (storedCode) {
        setManualReferralCode(storedCode);
      }
    }
  }, [referralCode]);
  
  // Validate manual referral code as user types
  const handleReferralCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setManualReferralCode(upperValue);
    
    if (upperValue && !validateReferralCode(upperValue)) {
      setReferralError('Invalid format. Code should be like ABC123');
    } else {
      setReferralError('');
      // Store valid code in localStorage for OAuth flow
      if (upperValue && validateReferralCode(upperValue)) {
        storeReferralCode(upperValue);
      }
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.signup({
        email,
        password,
        role,
        captchaToken: captchaToken || undefined,
        referralCode: effectiveReferralCode || undefined,
      });

      if (response.success) {
        if (response.loggedIn) {
          // User already existed and was logged in with provided credentials,
          // OR auto-confirm is enabled and user is now logged in.
          // In both cases, we can try to apply the referral code now.
          if (effectiveReferralCode) {
            console.log('[Signup] User logged in immediately, applying referral code');
            await applyReferralCode(effectiveReferralCode);
          }
          router.refresh();
          router.push('/dashboard');
        } else if (response.message) {
          // Email confirmation required - user is NOT authenticated yet.
          // The referral code will be applied server-side in /auth/callback
          // when the user clicks the confirmation link.
          // Code is stored in user_metadata by the signup API.
          console.log('[Signup] Email confirmation required, referral will be applied on confirmation');
          setMessage(response.message);
        } else {
          // Auto-confirm enabled but loggedIn wasn't set - try applying referral anyway
          if (effectiveReferralCode) {
            await applyReferralCode(effectiveReferralCode);
          }
          router.refresh();
          router.push('/dashboard');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      // Reset captcha widget and token after failed signup
      // HCaptcha tokens are single-use, so we must reset the widget for retry
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      
      // Don't auto-clear the error for "already exists" - let user read it
      if (!errorMessage.toLowerCase().includes('already exists')) {
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Error message - shown above social buttons */}
      {error && (
        <div className="rounded bg-error-subtle px-3 py-2 text-sm text-error border border-error/20">
          {error}
        </div>
      )}

      {/* Success message (Check your email) */}
      {message && (
        <div className="rounded bg-success-subtle px-3 py-2 text-sm text-success border border-success/20">
          {message}
        </div>
      )}

      {/* Hide all form elements after successful submission */}
      {!message && (
        <>
          {/* Social login buttons */}
          <SocialLoginButtons
            action="signup"
            onError={(err) => setError(err)}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary-subtle" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-surface px-2 text-muted">or sign up with email</span>
            </div>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col">
              <span className="text-sm text-muted">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 rounded border border-primary-subtle bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm text-muted">Password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="mt-1 rounded border border-primary-subtle bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Choose a password"
              />
              <span className="mt-1 text-xs text-muted">At least 8 characters</span>
            </label>

            {/* Referral code section - collapsible for manual entry */}
            {!referralCode && (
              <div className="flex flex-col gap-2">
                {!showReferralInput ? (
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(true)}
                    className="text-sm text-primary hover:text-primary-hover transition-colors text-left"
                  >
                    Have a referral code?
                  </button>
                ) : (
                  <label className="flex flex-col">
                    <span className="text-sm text-muted">Referral Code (optional)</span>
                    <input
                      type="text"
                      value={manualReferralCode}
                      onChange={(e) => handleReferralCodeChange(e.target.value)}
                      className="mt-1 rounded border border-primary-subtle bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                      placeholder="ABC123"
                      maxLength={10}
                    />
                    {referralError && (
                      <span className="mt-1 text-xs text-error">{referralError}</span>
                    )}
                    {effectiveReferralCode && !referralError && (
                      <span className="mt-1 text-xs text-success">Valid referral code</span>
                    )}
                  </label>
                )}
              </div>
            )}
            
            {/* Show active referral code if provided via URL */}
            {referralCode && (
              <div className="rounded bg-success-subtle px-3 py-2 text-sm text-success border border-success/20">
                Referral code applied: <span className="font-mono font-medium">{referralCode}</span>
              </div>
            )}

            <div className="flex justify-center">
              {hasCaptcha && (
                <HCaptcha
                  ref={captchaRef}
                  sitekey={hCaptchaSiteKey}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                  sentry={false}
                />
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (hasCaptcha && !captchaToken)}
              className="mt-2 rounded bg-primary hover:bg-primary-hover px-4 py-2 text-white font-medium shadow-md transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account...' : `Sign up as ${displayRole}`}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
