/**
 * Signup Page
 * 
 * User registration interface for talents and employers.
 * Route: /signup?role=talent or /signup?role=employer
 * Uses: SignupForm component for account creation.
 * Defaults to talent role if not specified.
 * Note: UI uses "talent/employer" but DB stores as "student/company"
 */

/**
 * Signup Page
 * 
 * User registration interface with role selection (talent/employer).
 * Route: /signup?role=talent or /signup?role=employer
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
  // Map URL role to DB role: talent->student, employer->company
  // Default to student/talent if role is missing/invalid
  const dbRole = (params?.role === "company" || params?.role === "employer") ? "company" : "student";
  const displayRole = dbRole === 'student' ? 'talent' : 'employer';

  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-background">
      <Header />
      <div className="w-full max-w-md bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 p-8 rounded-lg shadow-lg border border-primary-subtle">
        <h2 className="text-2xl font-semibold mb-4 text-default">
          {displayRole === 'talent' ? 'Join as a talent' : 'Join as an employer'}
        </h2>
        <p className="text-sm text-muted mb-6">
          {displayRole === 'talent' 
            ? 'Create your account to start exploring job opportunities and connect with top employers.'
            : 'Create your account to post positions and discover exceptional talent.'}
        </p>

        <SignupForm role={dbRole} />

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
