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

export default function AutoLogin() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAutoLogin() {
      // Only run in Electron environment
      if (typeof window === 'undefined' || !window.electronAPI?.loadAuthCache) {
        return;
      }

      // Don't run on login/signup pages or if already on dashboard
      if (pathname === '/login' || pathname === '/signup' || pathname === '/desktop' || pathname.startsWith('/dashboard')) {
        return;
      }

      try {
        // Load cached tokens
        const cachedTokens = await window.electronAPI.loadAuthCache();

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
          await window.electronAPI.clearAuthCache();
          return;
        }

        if (data.session) {
          console.log('[AutoLogin] Auto-login successful');
          
          // If tokens were refreshed, update the cache with new tokens
          if (data.session.access_token !== cachedTokens.access_token) {
            console.log('[AutoLogin] Tokens were refreshed, updating cache');
            try {
              await window.electronAPI.saveAuthCache({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
                user_id: data.session.user.id
              });
            } catch (saveError) {
              console.warn('[AutoLogin] Failed to update cache with refreshed tokens:', saveError);
            }
          }
          
          console.log('[AutoLogin] Redirecting to dashboard');
          router.push('/dashboard');
        } else {
          console.warn('[AutoLogin] No valid session after auto-login attempt');
          // Clear invalid cache
          await window.electronAPI.clearAuthCache();
        }
      } catch (error) {
        console.error('[AutoLogin] Auto-login check failed:', error);
        // Clear potentially corrupted cache
        try {
          await window.electronAPI.clearAuthCache();
        } catch (clearError) {
          console.error('[AutoLogin] Failed to clear cache:', clearError);
        }
      }
    }

    checkAutoLogin();
  }, [router, pathname]);

  // This component doesn't render anything
  return null;
}