/**
 * Signup Form Component
 * 
 * Client-side registration form with role selection.
 * Used by: app/signup/page.tsx
 * Calls: lib/api.ts -> app/api/auth/signup/route.ts
 * Creates user account and initializes talent/employer profile.
 * Note: DB stores role as student/company, UI displays as talent/employer
 */

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { api } from '@/lib/client/api';

export default function SignupForm({ role }: { role: string }) {
  const router = useRouter();
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
        role: role as 'student' | 'company',
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
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      
      // Don't auto-clear the error for "already exists" - let user read it
      if (!errorMessage.toLowerCase().includes('already exists')) {
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Error message */}
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

      {/* Le reste du formulaire est identique, sauf qu'on cache les champs si succès */}
      {!message && (
        <>
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
              className="mt-1 rounded border border-primary-subtle bg-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Choose a password"
            />
          </label>

          <div className="flex justify-center">
            <HCaptcha
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY!}
              onVerify={(token) => {
                console.log('HCaptcha token', token)
                setCaptchaToken(token)
              }}
              onExpire={() => {
                console.log('HCaptcha expired')
                setCaptchaToken(null)
              }}
              onError={(err) => {
                console.error('HCaptcha error', err)
                setCaptchaToken(null)
              }}
              onLoad={() => console.log('HCaptcha loaded')}
              sentry={false}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="mt-2 rounded bg-primary hover:bg-primary-hover px-4 py-2 text-white font-medium shadow-md transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account...' : `Sign up as ${displayRole}`}
          </button>
        </>
      )}
    </form>
  );
}