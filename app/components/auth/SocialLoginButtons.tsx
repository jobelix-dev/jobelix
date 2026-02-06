/**
 * Social Login Buttons Component
 * 
 * Provides OAuth login buttons for Google, LinkedIn, and GitHub.
 * Uses a popup-based OAuth flow for better UX in Electron apps.
 * 
 * Flow:
 * 1. User clicks OAuth button
 * 2. Popup opens with provider's login page
 * 3. After auth, popup redirects to /auth/callback
 * 4. Callback page closes popup and signals success to opener
 * 5. Parent window detects auth and redirects to dashboard
 * 
 * Used by: LoginForm, SignupForm
 * Callback: /auth/callback (handles code exchange)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/client/supabaseClient';
import { useRouter } from 'next/navigation';
import type { Provider } from '@supabase/supabase-js';

interface SocialLoginButtonsProps {
  /** Optional text prefix for buttons (e.g., "Sign up" vs "Log in") */
  action?: 'login' | 'signup';
  /** Callback when OAuth flow starts */
  onStart?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Callback on successful login */
  onSuccess?: () => void;
}

interface ProviderConfig {
  id: Provider;
  name: string;
  icon: React.ReactNode;
}

const providers: ProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  {
    id: 'linkedin_oidc',
    name: 'LinkedIn',
    icon: (
      <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    ),
  },
];

// Popup window dimensions
const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 600;

/** Storage key for referral code */
const REFERRAL_STORAGE_KEY = 'jobelix_referral_code';

/**
 * Apply a referral code after successful OAuth signup
 */
async function applyStoredReferralCode(): Promise<void> {
  const storedCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!storedCode) return;
  
  try {
    const response = await fetch('/api/student/referral/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: storedCode }),
    });
    
    if (response.ok) {
      console.log('[OAuth] Referral code applied successfully');
    } else {
      const data = await response.json();
      console.warn('[OAuth] Failed to apply referral code:', data.error);
    }
  } catch (err) {
    console.error('[OAuth] Error applying referral code:', err);
  } finally {
    // Clear stored code regardless of result
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  }
}

/**
 * Opens a centered popup window for OAuth
 */
function openOAuthPopup(url: string, name: string): Window | null {
  const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2;
  const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2;
  
  const features = [
    `width=${POPUP_WIDTH}`,
    `height=${POPUP_HEIGHT}`,
    `left=${left}`,
    `top=${top}`,
    'toolbar=no',
    'menubar=no',
    'scrollbars=yes',
    'resizable=yes',
  ].join(',');
  
  return window.open(url, name, features);
}

export default function SocialLoginButtons({
  action = 'login',
  onStart,
  onError,
  onSuccess,
}: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [popup, setPopup] = useState<Window | null>(null);
  const router = useRouter();

  // Save auth tokens to Electron cache for automatic login
  const saveAuthCacheIfElectron = useCallback(async (session: { 
    access_token: string; 
    refresh_token: string; 
    expires_at?: number;
    user: { id: string };
  }) => {
    if (typeof window !== 'undefined' && window.electronAPI?.saveAuthCache) {
      try {
        const tokens = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user_id: session.user.id
        };
        await window.electronAPI.saveAuthCache(tokens);
        console.log('[OAuth] Auth cache saved for Electron');
      } catch (cacheError) {
        console.warn('[OAuth] Failed to save auth cache:', cacheError);
        // Don't fail login if cache save fails
      }
    }
  }, []);

  // Listen for auth state changes (popup will trigger this after successful login)
  const checkAuthAndRedirect = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('[OAuth] Session detected, redirecting to dashboard');
      
      // Save auth cache for Electron auto-login
      await saveAuthCacheIfElectron(session);
      
      onSuccess?.();
      router.push('/dashboard');
      return true;
    }
    return false;
  }, [router, onSuccess, saveAuthCacheIfElectron]);

  // Poll for popup close and check auth
  useEffect(() => {
    if (!popup || !loadingProvider) return;

    const pollInterval = setInterval(async () => {
      // Check if popup was closed
      if (popup.closed) {
        console.log('[OAuth] Popup closed');
        clearInterval(pollInterval);
        
        // Check if authentication succeeded
        const authenticated = await checkAuthAndRedirect();
        
        if (!authenticated) {
          // Popup was closed without completing auth
          console.log('[OAuth] Auth not completed');
          setLoadingProvider(null);
          setPopup(null);
        }
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [popup, loadingProvider, checkAuthAndRedirect]);

  // Also listen for Supabase auth state changes
  useEffect(() => {
    const supabase = createClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[OAuth] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session && loadingProvider) {
        console.log('[OAuth] Sign in detected via auth state change');
        
        // Close popup if still open
        if (popup && !popup.closed) {
          popup.close();
        }
        
        // Apply referral code if one was stored (for signups)
        await applyStoredReferralCode();
        
        // Save auth cache for Electron auto-login
        await saveAuthCacheIfElectron(session);
        
        onSuccess?.();
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [loadingProvider, popup, router, onSuccess, saveAuthCacheIfElectron]);

  async function handleOAuthLogin(provider: Provider) {
    setLoadingProvider(provider);
    onStart?.();

    try {
      const supabase = createClient();

      // Build the redirect URL for after OAuth completes
      // Use popup=true to tell the callback to redirect to the success page
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectTo = `${baseUrl}/auth/callback?popup=true`;

      // For GitHub, request additional scopes for profile import
      const scopes = provider === 'github' ? 'read:user public_repo' : undefined;

      // Get the OAuth URL without redirecting
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes,
          skipBrowserRedirect: true, // Don't redirect, we'll open a popup
        },
      });

      if (error) {
        console.error(`[OAuth] ${provider} error:`, error.message);
        onError?.(error.message);
        setLoadingProvider(null);
        return;
      }

      if (!data?.url) {
        console.error(`[OAuth] No URL returned for ${provider}`);
        onError?.('Failed to start OAuth flow');
        setLoadingProvider(null);
        return;
      }

      // Open OAuth in a popup
      console.log(`[OAuth] Opening popup for ${provider}`);
      const oauthPopup = openOAuthPopup(data.url, `${provider}-oauth`);
      
      if (!oauthPopup) {
        console.error('[OAuth] Failed to open popup - blocked by browser?');
        onError?.('Popup was blocked. Please allow popups for this site.');
        setLoadingProvider(null);
        return;
      }

      setPopup(oauthPopup);
      
      // Focus the popup
      oauthPopup.focus();
      
    } catch (err) {
      console.error(`[OAuth] ${provider} unexpected error:`, err);
      onError?.(err instanceof Error ? err.message : 'OAuth failed');
      setLoadingProvider(null);
    }
  }

  const actionText = action === 'signup' ? 'Sign up' : 'Continue';

  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => handleOAuthLogin(provider.id)}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg border border-border/30 bg-background hover:bg-primary-subtle/50 text-default font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {loadingProvider === provider.id ? (
            <svg
              className="animate-spin h-5 w-5 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            provider.icon
          )}
          <span>
            {loadingProvider === provider.id
              ? 'Waiting for authentication...'
              : `${actionText} with ${provider.name}`}
          </span>
        </button>
      ))}
    </div>
  );
}
