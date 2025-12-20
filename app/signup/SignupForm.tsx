'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/api';

export default function SignupForm({ role }: { role: string }) {
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
      const result = await signup({ email, password, role: role as 'student' | 'company' });
      
      if (result.success) {
        // Store profile in localStorage for mock mode (in real app: use session/cookies)
        if (result.profile) {
          localStorage.setItem('mockProfile', JSON.stringify(result.profile));
        }
        router.push('/dashboard');
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
          className="mt-1 rounded border px-3 py-2"
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
          className="mt-1 rounded border px-3 py-2"
          placeholder="Choose a password"
        />
      </label>

      <input type="hidden" name="role" value={role} />

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded bg-foreground px-4 py-2 text-background disabled:opacity-60"
      >
        {loading ? 'Creating account...' : `Sign up as ${role}`}
      </button>
    </form>
  );
}
