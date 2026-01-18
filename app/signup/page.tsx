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
    <div className="min-h-screen flex items-center justify-center p-12 bg-background">
      <Header />
      <div className="w-full max-w-md bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 p-8 rounded-lg shadow-lg border border-primary-subtle">
        <h2 className="text-2xl font-semibold mb-4 text-default">
          {role === 'student' ? 'Join as a student' : 'Join as a company'}
        </h2>
        <p className="text-sm text-muted mb-6">
          {role === 'student' 
            ? 'Create your account to start exploring job opportunities and connect with top employers.'
            : 'Create your account to post positions and discover exceptional talent.'}
        </p>

        <SignupForm role={role} />

        <div className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
