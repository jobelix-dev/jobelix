import Link from "next/link";
import "./globals.css";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="max-w-3xl w-full p-12">
        <header className="mb-8">
          <h1 className="text-4xl font-bold">Jobelix</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            A minimalist job marketplace MVP — students upload one resume, companies post
            simple offers.
          </p>
        </header>

        <section className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup?role=student"
            className="inline-flex items-center justify-center rounded-md bg-foreground px-6 py-3 text-background hover:opacity-95"
          >
            Sign up as Student
          </Link>

          <Link
            href="/signup?role=company"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-6 py-3 hover:bg-neutral-50"
          >
            Sign up as Company
          </Link>
        </section>

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground hover:underline">
            Log in
          </Link>
        </div>

        <footer className="mt-12 text-sm text-zinc-500">Built for fast validation. Phase 2: auth & roles</footer>
      </main>
    </div>
  );
}
