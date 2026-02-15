/**
 * Desktop Landing Page
 *
 * Dedicated landing page for the desktop (Electron) app.
 * Route: /desktop
 *
 * Uses the same light color scheme as /login and /signup with an interactive
 * star-network particle canvas layered behind the content.
 */

'use client';

import Link from 'next/link';
import '../globals.css';
import StarNetwork from '../components/StarNetwork';

export default function DesktopLandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-hidden relative">
      {/* Interactive particle canvas */}
      <StarNetwork />

      {/* Content card */}
      <div className="relative z-10 w-full max-w-sm text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-default mb-2">
          Welcome to Jobelix
        </h1>
        <p className="text-muted text-sm sm:text-base mb-8">
          Your AI-powered job application assistant
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-lg
                       bg-surface border border-border/30 text-default
                       hover:bg-primary-subtle hover:border-primary/30 transition-all duration-200"
          >
            Sign In
          </Link>

          <Link
            href="/signup?role=talent"
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-lg
                       bg-primary text-white border border-primary
                       hover:bg-primary-hover transition-all duration-200 shadow-sm"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
