/**
 * Reset Password Form Component
 * 
 * Client-side form for requesting password reset email.
 * Calls server API to initiate reset, avoiding PKCE storage issues
 * when email link is opened in a different browser/app.
 */

'use client';
import { useState, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { getHCaptchaSiteKey, isHCaptchaConfigured } from '@/lib/client/config';

export default function ResetPasswordForm() {
  const hCaptchaSiteKey = getHCaptchaSiteKey();
  const hasCaptcha = isHCaptchaConfigured();
  const captchaRef = useRef<HCaptcha>(null);
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Call server API instead of client-side Supabase
      // This avoids PKCE code_verifier storage issues when the reset link
      // is opened in a different browser/app (e.g., Electron -> Chrome)
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          captchaToken: captchaToken || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      // Reset captcha widget and token after failed request
      // HCaptcha tokens are single-use, so we must reset the widget for retry
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-6">
        <svg className="mx-auto h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <div>
          <h3 className="text-xl font-semibold text-default mb-2">Check your email</h3>
          <p className="text-sm text-muted">
            We&apos;ve sent you a password reset link. Please check your inbox.
          </p>
        </div>
        <button
          onClick={() => setSuccess(false)}
          className="text-sm font-medium text-primary hover:text-primary-hover underline"
        >
          Send another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-error-subtle/30 border border-error px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-muted mb-2">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="you@example.com"
        />
      </div>

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
        className="w-full rounded-lg bg-primary hover:bg-primary-hover px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending...' : 'Send reset link'}
      </button>
    </form>
  );
}
