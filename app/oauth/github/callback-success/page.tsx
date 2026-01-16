/**
 * GitHub OAuth Callback Success Page
 * 
 * Simple page that closes the OAuth popup and notifies parent window.
 * Used when OAuth flow completes in a popup window.
 */

'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Force dynamic rendering - this page should never be statically generated
export const dynamic = 'force-dynamic';

export default function GitHubCallbackSuccessPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('github_error');

  useEffect(() => {
    // If this page is opened in a popup, close it and notify parent
    if (window.opener) {
      // Notify parent window of success/error
      if (error) {
        window.opener.postMessage({ type: 'github-oauth-error', error }, window.location.origin);
      } else {
        window.opener.postMessage({ type: 'github-oauth-success' }, window.location.origin);
      }
      
      // Close popup after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      // If not in popup, redirect to dashboard (fallback for direct navigation)
      const redirectUrl = error 
        ? `/dashboard/student?github_error=${error}`
        : '/dashboard/student?github_connected=true&auto_sync=true';
      
      window.location.href = redirectUrl;
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-semibold mb-2">Connection Failed</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {error === 'access_denied' ? 'You cancelled the authorization' : 'Something went wrong'}
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-semibold mb-2">GitHub Connected!</h1>
            <p className="text-zinc-600 dark:text-zinc-400">This window will close shortly...</p>
          </>
        )}
      </div>
    </div>
  );
}
