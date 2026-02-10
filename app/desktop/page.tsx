/**
 * Desktop Landing Page
 * 
 * Dedicated landing page for the desktop app.
 * Route: /desktop
 * Shows welcome message with login/signup options.
 * Uses the same styling as the web auth pages.
 */

'use client';
import Link from "next/link";
import "../globals.css";

export default function DesktopLandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-default mb-2">
          Welcome to Jobelix Desktop App
        </h1>
        <p className="text-muted text-sm sm:text-base mb-8">
          Your AI-powered job application assistant
        </p>
        
        <div className="flex flex-col gap-3">
          {/* Login Button */}
          <Link
            href="/login"
            className="block bg-surface border border-border p-4 rounded-lg hover:bg-primary-subtle transition-colors"
          >
            <div className="font-semibold text-default">
              Sign In
            </div>
          </Link>

          {/* Signup Button */}
          <Link
            href="/signup?role=talent"
            className="block bg-primary text-white border border-primary p-4 rounded-lg hover:bg-primary-hover transition-colors"
          >
            <div className="font-semibold">
              Create Account
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
