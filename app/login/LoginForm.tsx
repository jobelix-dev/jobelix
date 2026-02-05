/**
 * Login Form Component
 * 
 * Client-side form for user authentication.
 * Used by: app/login/page.tsx
 * Calls: lib/api.ts -> app/api/auth/login/route.ts
 * Handles form validation, loading states, and error display.
 * Supports email/password and OAuth (Google, LinkedIn, GitHub).
 */

'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { api } from '@/lib/client/api';
import { createClient } from '@/lib/client/supabaseClient';
import { getHCaptchaSiteKey, isHCaptchaConfigured } from '@/lib/client/config';
import SocialLoginButtons from '@/app/components/auth/SocialLoginButtons';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hCaptchaSiteKey = getHCaptchaSiteKey();
  const hasCaptcha = isHCaptchaConfigured();
  const captchaRef = useRef<HCaptcha>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Read error from URL parameters (e.g., from expired reset links)
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
      // Clear the error from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.login({ email, password, captchaToken: captchaToken || undefined });
      
      // Save auth tokens to cache for automatic login
      if (typeof window !== 'undefined' && window.electronAPI?.saveAuthCache) {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            const tokens = {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
              user_id: session.user.id
            };
            
            await window.electronAPI.saveAuthCache(tokens);
          }
        } catch (cacheError) {
          console.warn('Failed to save auth cache:', cacheError);
          // Don't fail login if cache save fails
        }
      }
      
      router.refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      // Reset captcha widget and token after failed login
      // HCaptcha tokens are single-use, so we must reset the widget for retry
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      setTimeout(() => setError(''), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Social login buttons */}
      <SocialLoginButtons
        action="login"
        onError={(err) => setError(err)}
      />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-primary-subtle" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-surface px-2 text-muted">or continue with email</span>
        </div>
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded bg-error-subtle px-3 py-2 text-sm text-error border border-error">
            {error}
          </div>
        )}

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
            placeholder="Enter your password"
          />
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

        <div className="flex justify-end">
          <Link 
            href="/reset-password" 
            className="text-xs text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || (hasCaptcha && !captchaToken)}
          className="mt-2 rounded bg-primary hover:bg-primary-hover px-4 py-2 text-white font-medium shadow-md transition-colors disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </div>
  );
}

