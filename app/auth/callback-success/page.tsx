/**
 * OAuth Popup Success Page
 * 
 * This page is shown after successful OAuth authentication in a popup.
 * It communicates success back to the parent window and closes itself.
 * 
 * Flow:
 * 1. OAuth completes, callback sets session cookies
 * 2. Callback redirects here with success or error
 * 3. This page sends a postMessage to parent window
 * 4. Parent receives message and refreshes to pick up session
 * 5. This popup closes
 * 
 * Route: /auth/callback-success
 */

'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function CallbackSuccessContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    // Send message to parent window about auth result
    if (window.opener) {
      try {
        const message = error 
          ? { type: 'oauth-error', error: decodeURIComponent(error) }
          : { type: 'oauth-success' };
        
        // Post to parent - use '*' since we might be on different origins
        window.opener.postMessage(message, '*');
        console.log('[CallbackSuccess] Sent message to parent:', message);
      } catch (err) {
        console.error('[CallbackSuccess] Failed to send message to parent:', err);
      }
    } else {
      console.log('[CallbackSuccess] No opener window found');
    }

    // Auto-close after a short delay (give parent time to process)
    if (!error) {
      const closeTimer = setTimeout(() => {
        window.close();
      }, 1500);
      return () => clearTimeout(closeTimer);
    }
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
      <p className="text-sm text-muted" suppressHydrationWarning>
        Closing...
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
