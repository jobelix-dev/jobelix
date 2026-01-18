/**
 * Signup Form Component
 * 
 * Client-side registration form with role selection.
 * Used by: app/signup/page.tsx
 * Calls: lib/api.ts -> app/api/auth/signup/route.ts
 * Creates user account and initializes student/company profile.
 */

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';

export default function SignupForm({ role }: { role: string }) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'generic' | 'user_exists' | 'rate_limit'>('generic');
  const [message, setMessage] = useState('');

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
      });

      if (response.success) {
        if (response.message) {
          // Email confirmation required
          setMessage(response.message);
        } else {
          // Auto-confirm enabled, redirect to dashboard
          router.refresh();
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      // Check if error is about existing user
      const errorMessage = err.message || 'An unexpected error occurred';
      
      if (errorMessage.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists. Try logging in instead.');
      } else {
        setError(errorMessage);
      }
      
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
      {/* Gestion des erreurs */}
      {error && (
        <div className="rounded bg-error-subtle px-3 py-2 text-sm text-error/20">
          {error}
        </div>
      )}

      {/* Message de succès (Check your email) */}
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

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded bg-primary hover:bg-primary-hover px-4 py-2 text-white font-medium shadow-md transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Sign up as student'}
          </button>
        </>
      )}
    </form>
  );
}