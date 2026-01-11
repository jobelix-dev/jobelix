/**
 * Login Page
 * 
 * User login interface for both students and companies.
 * Route: /login
 * Uses: LoginForm component for authentication.
 * Redirects to /dashboard after successful login.
 */

import LoginForm from "./LoginForm";
import Header from "../components/Header";
import "../globals.css";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <div className="w-full max-w-md bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-8 rounded-lg shadow-lg border border-purple-200 dark:border-purple-800">
        <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Log in to Jobelix</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Enter your credentials to access your account.
        </p>

        <LoginForm />

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don't have an account?{' '}
          <Link href="/signup?role=student" className="text-purple-600 dark:text-purple-400 hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
