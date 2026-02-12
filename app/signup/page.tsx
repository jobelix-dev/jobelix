/**
 * Signup Page
 * 
 * User registration interface for talents and employers.
 * Route: /signup?role=talent or /signup?role=employer
 * Route: /signup?ref=CODE for referral signups
 * 
 * Uses: SignupForm component for account creation.
 * Defaults to talent role if not specified.
 * Note: UI uses "talent/employer" but DB stores as "student/company"
 * 
 * Referral Flow:
 * When a user lands on this page with ?ref=CODE:
 * 1. Server validates the code and passes it to SignupForm
 * 2. SignupForm stores code in localStorage (client-side backup)
 * 3. Code is included in user_metadata during signup
 * 4. Code is applied after signup completes (in /auth/callback via user_metadata)
 */

import type { Metadata } from "next";
import SignupForm from "./SignupForm";
import Header from "../components/Header";
import AppFooter from "../components/AppFooter";
import Link from "next/link";
import "../globals.css";
import { canonicalUrl } from "@/lib/seo";
import { validateReferralCode } from "@/lib/shared/referral";

const title = "Create your Jobelix account";
const description =
  "Sign up for Jobelix to connect with employers or discover top talent using AI-powered matching.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: canonicalUrl("/signup"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

type SearchParams = Promise<{ role?: string; ref?: string } | undefined>;

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
  
  // Extract and validate referral code from URL
  const referralCode = validateReferralCode(params?.ref);
  
  // Note: The referral code is passed to SignupForm which stores it in localStorage
  // and includes it in user_metadata during signup. The /auth/callback route reads
  // from user_metadata, so no server-side cookie is needed here.
  // (cookies().set() is not allowed in Server Components in Next.js 16)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-md bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 p-4 sm:p-6 md:p-8 rounded-lg shadow-lg border border-primary-subtle">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-default">
            {displayRole === 'talent' ? 'Join as a talent' : 'Join as an employer'}
          </h2>
          <p className="text-sm text-muted mb-6">
            {displayRole === 'talent' 
              ? 'Create your account to start exploring job opportunities and connect with top employers.'
              : 'Create your account to post positions and discover exceptional talent.'}
          </p>

          <SignupForm role={dbRole} referralCode={referralCode} />

          <div className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
