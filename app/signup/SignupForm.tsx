'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabaseClient';

export default function SignupForm({ role }: { role: string }) {
  const router = useRouter();

  const supabase = createClient();

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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role, 
            full_name: '', // On peut ajouter d'autres metadata si besoin
          },
          // Lien de redirection après confirmation d'email
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });

      console.log('Signup response:', { user: data.user?.id, session: !!data.session, error });
      
      if (error) {
        setError(error.message);
      } else if (data.user && data.session) {
        // Auto-confirm is enabled (local dev), redirect to dashboard
        console.log('Redirecting to dashboard...');
        router.refresh();
        router.push('/dashboard');
      } else if (data.user && !data.session) {
        // Email confirmation required (production)
        setMessage('Inscription réussie ! Veuillez vérifier vos emails pour confirmer votre compte.');
      } else {
        console.log('Unexpected signup state:', data);
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Gestion des erreurs */}
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Message de succès (Check your email) */}
      {message && (
        <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-600 border border-green-200">
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

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded bg-foreground px-4 py-2 text-background disabled:opacity-60"
          >
            {loading ? 'Creating account...' : `Sign up as ${role}`}
          </button>
        </>
      )}
    </form>
  );
}