/**
 * Signup Form Component
 * 
 * Client-side registration form with role selection.
 * Used by: app/signup/page.tsx
 * Calls: lib/api.ts -> app/api/auth/signup/route.ts
 * Creates user account and initializes talent/employer profile.
 * Note: DB stores role as student/company, UI displays as talent/employer
 * Supports email/password and OAuth (Google, LinkedIn, GitHub).
 */

'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { api } from '@/lib/client/api';
import { getHCaptchaSiteKey, isHCaptchaConfigured } from '@/lib/client/config';
import SocialLoginButtons from '@/app/components/auth/SocialLoginButtons';

/** Valid user roles for the platform */
type UserRole = 'student' | 'company';

interface SignupFormProps {
  /** The user role - 'student' or 'company' */
  role: UserRole;
}

export default function SignupForm({ role }: SignupFormProps) {
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
      });

      if (response.success) {
        if (response.loggedIn) {
          // User already existed and was logged in with provided credentials
          router.refresh();
          router.push('/dashboard');
        } else if (response.message) {
          // Email confirmation required
          setMessage(response.message);
        } else {
          // Auto-confirm enabled, redirect to dashboard
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