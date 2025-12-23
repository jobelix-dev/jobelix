'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// On oubli l'API interne
import { createClient } from '@/lib/supabaseClient'; 

export default function LoginForm() {
  const router = useRouter();

  // Initialisation du client supabase
  const supabase = createClient(); 

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // On utilise plutot le auth directement disponible dans la librairie supabase
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message); // On pourra custom l'erreur mais celles de supabase par défault sont claires
      } else {
        // PLUS BESOIN DU LOCALSTORAGE ! 
        // -> Supabase gère la session automatiquement via des cookies sécurisés -> On se fait pas chier avec vérifier des tokens et tt.
        
        // Aussi Ca sert à rien de stocker le ôle coté frontend pcq on lui fait pas confiance, et c'est la base de donnée qui doit être interrogé pour savoir quoi faire. 


        // On rafraichit pcq l'user est désormais connecté (pour rafraichir les composants vu que les cookies ont changés) (-> Spécificité de Next.js selon Gemini)
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue.');
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
          placeholder="Enter your password"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded bg-foreground px-4 py-2 text-background disabled:opacity-60"
      >
        {loading ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}

