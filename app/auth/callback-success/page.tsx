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
      <div className="text-center max-w-md">
        <div className="h-16 w-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-default mb-3">
          Sign in failed
        </h1>
        <p className="text-muted mb-6">
          {decodeURIComponent(error)}
        </p>
        <button
          onClick={() => window.close()}
          className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Close this window
        </button>
      </div>
    );
  }

  return (
    <div className="text-center max-w-md">
      <div className="h-16 w-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-default mb-3">
        Sign in successful!
      </h1>
      <p className="text-muted">
        This window will close in {countdown}...
      </p>
      <button
        onClick={() => window.close()}
        className="mt-6 px-6 py-2.5 text-primary hover:text-primary/80 transition-colors font-medium"
      >
        Close now
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center max-w-md">
      <div className="h-16 w-16 mx-auto mb-6 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
      <h1 className="text-2xl font-bold text-default mb-3">
        Completing sign in...
      </h1>
      <p className="text-muted">
        Please wait...
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
