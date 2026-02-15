/**
 * GitHub OAuth Callback Success Page
 * 
 * Simple page that closes the OAuth popup and notifies parent window.
 * Used when OAuth flow completes in a popup window.
 */

'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Force dynamic rendering - this page should never be statically generated
export const dynamic = 'force-dynamic';

function CallbackContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('github_error');

  useEffect(() => {
    // If this page is opened in a popup, close it and notify parent
    if (window.opener) {
      // Notify parent window of success/error
      if (error) {
        window.opener.postMessage({ type: 'github-oauth-error', error }, process.env.NEXT_PUBLIC_APP_URL);
      } else {
        window.opener.postMessage({ type: 'github-oauth-success' }, process.env.NEXT_PUBLIC_APP_URL);
      }
      
      // Close popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      // If not in popup, redirect to dashboard (fallback for direct navigation)
      const redirectUrl = error 
        ? `/dashboard?github_error=${error}`
        : '/dashboard?github_connected=true&auto_sync=true';
      
      window.location.href = redirectUrl;
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 bg-surface rounded-2xl shadow-lg border border-border max-w-sm">
        {error ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-error-subtle rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-default mb-2">Connection Failed</h1>
            <p className="text-sm text-muted">
              {error === 'access_denied' ? 'You cancelled the authorization' : 'Something went wrong'}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-success-subtle rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-default mb-2">GitHub Connected!</h1>
            <p className="text-sm text-muted">This window will close shortly...</p>
            <div className="mt-4 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GitHubCallbackSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 bg-surface rounded-2xl shadow-lg border border-border max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-subtle rounded-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h1 className="text-xl font-semibold text-default mb-2">Processing...</h1>
          <p className="text-sm text-muted">Please wait</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
