/**
 * Authentication Callback Success Page
 * 
 * Unified handler for all successful authentication flows.
 * Works in both popup mode (OAuth) and standalone mode (email links).
 * 
 * POPUP MODE (OAuth from login/signup page):
 * 1. OAuth completes, callback sets session cookies
 * 2. Callback redirects here with popup=true
 * 3. This page sends postMessage to parent window
 * 4. Parent receives message, fetches session, saves to Electron if available
 * 5. Popup closes
 * 
 * STANDALONE MODE (Email links - signup confirmation, password reset):
 * 1. User clicks email link, callback verifies token and sets session cookies
 * 2. Callback redirects here (no popup=true)
 * 3. If Electron: This page saves session to OS keychain directly
 * 4. Redirects to dashboard
 * 
 * Route: /auth/callback-success
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/client/supabaseClient';

function CallbackSuccessContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const isPopup = searchParams.get('popup') === 'true';
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function handleAuthSuccess() {
      // Handle error state
      if (error) {
        if (window.opener && isPopup) {
          // Popup mode with error: send error to parent
          try {
            const message = { type: 'oauth-error', error: decodeURIComponent(error) };
            const origins = new Set<string>();
            const appUrl = process.env.NEXT_PUBLIC_APP_URL;
            if (appUrl) origins.add(appUrl.replace(/\/+$/, ''));
            origins.add(window.location.origin);
            
            for (const origin of origins) {
              try {
                window.opener.postMessage(message, origin);
              } catch (err) {
                console.warn('[CallbackSuccess] Failed to postMessage error:', err);
              }
            }
          } catch (err) {
            console.error('[CallbackSuccess] Error sending error message:', err);
          }
        }
        // Error state doesn't auto-close or redirect - user must click close
        return;
      }

      // POPUP MODE: Send postMessage to parent window
      if (window.opener && isPopup) {
        console.log('[CallbackSuccess] Popup mode detected - sending message to parent');
        try {
          const message = { type: 'oauth-success' };
          const origins = new Set<string>();
          const appUrl = process.env.NEXT_PUBLIC_APP_URL;
          if (appUrl) origins.add(appUrl.replace(/\/+$/, ''));
          origins.add(window.location.origin);
          
          for (const origin of origins) {
            try {
              window.opener.postMessage(message, origin);
              console.log('[CallbackSuccess] Sent success message to parent:', origin);
            } catch (err) {
              console.warn('[CallbackSuccess] Failed to postMessage to origin:', origin, err);
            }
          }

          // Auto-close popup after sending message
          setTimeout(() => {
            window.close();
          }, 3000);
        } catch (err) {
          console.error('[CallbackSuccess] Failed to send message to parent:', err);
        }
        return;
      }

      // STANDALONE MODE: Save session to Electron (if available) and redirect
      console.log('[CallbackSuccess] Standalone mode detected - checking for session');
      
      // Wait for cookies to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the session from cookies (set by /auth/callback)
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('[CallbackSuccess] No session found after auth');
        // Redirect to login with error
        window.location.href = '/login?error=Authentication+failed';
        return;
      }

      console.log('[CallbackSuccess] Session found, checking for Electron API');

      // Save to Electron secure storage if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const electronAPI = (window as any).electronAPI;
      
      if (electronAPI?.setSession) {
        console.log('[CallbackSuccess] Saving session to Electron secure storage');
        setSaving(true);
        
        try {
          const result = await electronAPI.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: session.user,
          });
          
          if (result?.success) {
            console.log('[CallbackSuccess] Session saved to Electron successfully');
          } else {
            console.warn('[CallbackSuccess] Failed to save session to Electron:', result);
          }
        } catch (err) {
          console.error('[CallbackSuccess] Error saving session to Electron:', err);
        }
        
        setSaving(false);
      } else {
        console.log('[CallbackSuccess] Not in Electron - session exists in cookies only');
      }

      // Redirect to dashboard (session is in cookies for web, saved to keychain for Electron)
      console.log('[CallbackSuccess] Redirecting to dashboard');
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = '/dashboard';
    }

    handleAuthSuccess();
  }, [error, isPopup]);

  // Render error state
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
        {isPopup ? (
          <button
            onClick={() => window.close()}
            className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
          >
            Close this window
          </button>
        ) : (
          <button
            onClick={() => window.location.href = '/login'}
            className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
          >
            Back to login
          </button>
        )}
      </div>
    );
  }

  // Render success state
  return (
    <div className="text-center p-8 bg-surface rounded-2xl shadow-lg border border-border max-w-sm" suppressHydrationWarning>
      <div className="w-16 h-16 mx-auto mb-4 bg-success-subtle rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-default mb-2">
        Sign in successful!
      </h1>
      <p className="text-sm text-muted">
        {saving ? 'Saving session...' : isPopup ? 'This window will close shortly...' : 'Redirecting to dashboard...'}
      </p>
      <div className="mt-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      {isPopup && (
        <button
          onClick={() => window.close()}
          className="mt-4 text-sm text-primary hover:text-primary-hover transition-colors font-medium"
        >
          Close now
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center p-8 bg-surface rounded-2xl shadow-lg border border-border max-w-sm" suppressHydrationWarning>
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
