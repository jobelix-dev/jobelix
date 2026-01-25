/**
 * Login Page
 * 
 * User login interface for both students and companies.
 * Route: /login
 * Uses: LoginForm component for authentication.
 * Redirects to /dashboard after successful login.
 */

import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import Header from "../components/Header";
import "../globals.css";
import Link from "next/link";
import { Suspense } from "react";
import { canonicalUrl } from "@/lib/seo";

const title = "Log in";
const description = "Log in to Jobelix to access your account and dashboard.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: canonicalUrl("/login"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-background">
      <Header />
      <div className="w-full max-w-md bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 p-8 rounded-lg shadow-lg border border-primary-subtle">
        <h2 className="text-2xl font-semibold mb-4 text-default">Log in to Jobelix</h2>
        <p className="text-sm text-muted mb-6">
          Enter your credentials to access your account.
        </p>

        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>

        <div className="mt-6 text-center text-sm text-muted">
          Don't have an account?{' '}
          <Link href="/signup?role=student" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
