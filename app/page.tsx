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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="max-w-3xl w-full p-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold">Jobelix</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            A modern job marketplace connecting skilled students with top companies.
          </p>
        </header>

        <section className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup?role=student"
            className="inline-flex items-center justify-center rounded-md bg-foreground px-6 py-3 text-background hover:ring-2 hover:ring-foreground hover:ring-offset-2 transition-all"
          >
            Sign up as Student
          </Link>

          {/* <Link
            href="/signup?role=company"
            className="inline-flex items-center justify-center rounded-md border-2 border-zinc-300 dark:border-zinc-700 px-6 py-3 text-foreground hover:border-foreground transition-colors"
          >
            Sign up as Company
          </Link> */}
        </section>

        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground hover:underline">
          Log in
        </Link>
      </div>

      </main>
    </div>
  );
}
