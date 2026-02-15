'use client';

/**
 * AutoLogin Component
 *
 * Checks for cached authentication tokens on app startup and attempts automatic login.
 * Only runs in Electron environment and redirects to dashboard if valid cache exists.
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/client/supabaseClient';
import {
  clearCachedAuthTokens,
  isAuthCacheAvailable,
  loadCachedAuthTokens,
  saveSessionToAuthCache,
} from '@/lib/client/authCache';

export default function AutoLogin() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAutoLogin() {
      // Only run in Electron environment
      if (!isAuthCacheAvailable()) {
        return;
      }

      // Don't run on login/signup pages or if already on dashboard
      if (pathname === '/login' || pathname === '/signup' || pathname === '/desktop' || pathname.startsWith('/dashboard')) {
        return;
      }

      try {
        // Load cached tokens
        const cachedTokens = await loadCachedAuthTokens();

        if (!cachedTokens) {
          console.log('[AutoLogin] No cached auth tokens found');
          return;
        }

        console.log('[AutoLogin] Found cached auth tokens, checking expiration...');

        // Check if tokens are expired (with 5 minute buffer)
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = cachedTokens.expires_at || 0;
        const isExpired = expiresAt > 0 && (expiresAt - 300) < now; // 5 min buffer

        if (isExpired) {
          console.log('[AutoLogin] Tokens expired, will attempt refresh');
        }

        // Create Supabase client and set the session
        const supabase = createClient();

        // Set the session with cached tokens
        // Supabase will automatically refresh if needed
        const { data, error } = await supabase.auth.setSession({
          access_token: cachedTokens.access_token,
          refresh_token: cachedTokens.refresh_token,
        });

        if (error) {
          console.warn('[AutoLogin] Failed to restore session from cache:', error.message);
          console.warn('[AutoLogin] Error details:', error);
          // Clear invalid cache
          await clearCachedAuthTokens();
          return;
        }

        if (data.session) {
          console.log('[AutoLogin] Auto-login successful');
          
          // If tokens were refreshed, update the cache with new tokens
          if (data.session.access_token !== cachedTokens.access_token) {
            console.log('[AutoLogin] Tokens were refreshed, updating cache');
            try {
              await saveSessionToAuthCache(data.session);
            } catch (saveError) {
              console.warn('[AutoLogin] Failed to update cache with refreshed tokens:', saveError);
            }
          }
          
          console.log('[AutoLogin] Redirecting to dashboard');
          router.push('/dashboard');
        } else {
          console.warn('[AutoLogin] No valid session after auto-login attempt');
          // Clear invalid cache
          await clearCachedAuthTokens();
        }
      } catch (error) {
        console.error('[AutoLogin] Auto-login check failed:', error);
        // Clear potentially corrupted cache
        try {
          await clearCachedAuthTokens();
        } catch (clearError) {
          console.error('[AutoLogin] Failed to clear cache:', clearError);
        }
      }
    }

    // Defer auto-login until the browser is idle so it doesn't block
    // the first meaningful paint. Falls back to setTimeout for environments
    // that don't support requestIdleCallback.
    const schedule = typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 100);

    const id = schedule(checkAutoLogin);

    return () => {
      if (typeof cancelIdleCallback === 'function' && typeof id === 'number') {
        cancelIdleCallback(id);
      }
    };
  }, [router, pathname]);

  // This component doesn't render anything
  return null;
}
