/**
 * OAuth Popup Success Page
 * 
 * This page is shown after successful OAuth authentication in a popup.
 * It displays a success message and closes itself automatically.
 * The parent window detects the session via Supabase auth state change.
 * 
 * Route: /auth/callback-success
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackSuccessContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [countdown, setCountdown] = useState(2);

  useEffect(() => {
    if (error) return; // Don't auto-close on error

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [error]);

  if (error) {
    return (
      <div className="text-center p-8 bg-surface rounded-2xl shadow-lg border border-border max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 bg-error-subtle rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-default mb-2">
          Sign in failed
        </h1>
        <p className="text-sm text-muted mb-6">
          {decodeURIComponent(error)}
        </p>
        <button
          onClick={() => window.close()}
          className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
        >
          Close this window
        </button>
      </div>
    );
  }

  return (
    <div className="text-center p-8 bg-surface rounded-2xl shadow-lg border border-border max-w-sm">
      <div className="w-16 h-16 mx-auto mb-4 bg-success-subtle rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-default mb-2">
        Sign in successful!
      </h1>
      <p className="text-sm text-muted">
        This window will close shortly...
      </p>
      <div className="mt-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <button
        onClick={() => window.close()}
        className="mt-4 text-sm text-primary hover:text-primary-hover transition-colors font-medium"
      >
        Close now
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center p-8 bg-surface rounded-2xl shadow-lg border border-border max-w-sm">
      <div className="w-16 h-16 mx-auto mb-4 bg-primary-subtle rounded-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <h1 className="text-xl font-semibold text-default mb-2">
        Completing sign in...
      </h1>
      <p className="text-sm text-muted">
        Please wait
      </p>
    </div>
  );
}

export default function CallbackSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense fallback={<LoadingState />}>
        <CallbackSuccessContent />
      </Suspense>
    </div>
  );
}
