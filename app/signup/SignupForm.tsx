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
import { api } from '@/lib/api';

export default function SignupForm({ role }: { role: string }) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      setError(err.message || 'An unexpected error occurred');
      setTimeout(() => setError(''), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Gestion des erreurs */}
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Message de succès (Check your email) */}
      {message && (
        <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          {message}
        </div>
      )}

      {/* Le reste du formulaire est identique, sauf qu'on cache les champs si succès */}
      {!message && (
        <>
          <label className="flex flex-col">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Password</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Choose a password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded bg-purple-600 hover:bg-purple-700 px-4 py-2 text-white font-medium shadow-md transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Sign up as student'}
          </button>
        </>
      )}
    </form>
  );
}