/**
 * Signup Page
 * 
 * User registration interface for students and companies.
 * Route: /signup?role=student or /signup?role=company
 * Uses: SignupForm component for account creation.
 * Defaults to student role if not specified.
 */

/**
 * Signup Page
 * 
 * User registration interface with role selection (student/company).
 * Route: /signup?role=student or /signup?role=company
 * Uses: SignupForm component
 * Redirects to /login after successful registration
 */

import SignupForm from "./SignupForm";
import Header from "../components/Header";
import Link from "next/link";
import "../globals.css";

type SearchParams = Promise<{ role?: string } | undefined>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;
  // default to student if role is missing/invalid
  const role = params?.role === "company" ? "company" : "student";

  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <div className="w-full max-w-md bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-8 rounded-lg shadow-lg border border-purple-200 dark:border-purple-800">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
          {role === 'student' ? 'Join as a student' : 'Join as a company'}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          {role === 'student' 
            ? 'Create your account to start exploring job opportunities and connect with top employers.'
            : 'Create your account to post positions and discover exceptional talent.'}
        </p>

        <SignupForm role={role} />

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-600 dark:text-purple-400 hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
