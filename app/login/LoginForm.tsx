/**
 * Login Form Component
 * 
 * Client-side form for user authentication.
 * Used by: app/login/page.tsx
 * Calls: lib/api.ts -> app/api/auth/login/route.ts
 * Handles form validation, loading states, and error display.
 */

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.login({ email, password });
      router.refresh();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setTimeout(() => setError(''), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

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
          placeholder="Enter your password"
        />
      </label>

      <div className="flex justify-end">
        <a 
          href="/reset-password" 
          className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
        >
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded bg-purple-600 hover:bg-purple-700 px-4 py-2 text-white font-medium shadow-md transition-colors disabled:opacity-60"
      >
        {loading ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}

