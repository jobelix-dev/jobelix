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
import { createClient } from '@/lib/client/supabaseClient';

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

      <div className="flex justify-end">
        <a 
          href="/reset-password" 
          className="text-xs text-primary hover:underline"
        >
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded bg-primary hover:bg-primary-hover px-4 py-2 text-white font-medium shadow-md transition-colors disabled:opacity-60"
      >
        {loading ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}

