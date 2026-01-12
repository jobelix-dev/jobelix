/**
 * Home Page (Landing Page)
 * 
 * Public landing page with Login/Signup buttons.
 * Route: / (root)
 * Accessible to: Everyone (non-authenticated users)
 * Links to: /login and /signup pages
 */

import Link from "next/link";
import "./globals.css";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="max-w-3xl w-full p-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">Jobelix</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            A modern job marketplace connecting skilled students with top companies.
          </p>
        </header>

        <section className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup?role=student"
            className="inline-flex items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 px-6 py-3 text-white font-medium transition-colors shadow-sm"
          >
            Sign up as Student
          </Link>

          {/* <Link
            href="/signup?role=company"
            className="inline-flex items-center justify-center rounded-lg border-2 border-purple-200 dark:border-purple-800 px-6 py-3 text-purple-600 dark:text-purple-400 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
          >
            Sign up as Company
          </Link> */}
        </section>

        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
            Log in
          </Link>
        </div>

      </main>
    </div>
  );
}
