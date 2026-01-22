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
      if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/dashboard')) {
        return;
      }

      try {
        // Load cached tokens
        const cachedTokens = await window.electronAPI.loadAuthCache();

        if (!cachedTokens) {
          console.log('No cached auth tokens found');
          return;
        }

        console.log('Found cached auth tokens, attempting auto-login...');

        // Create Supabase client and set the session
        const supabase = createClient();

        // Set the session with cached tokens
        const { data, error } = await supabase.auth.setSession({
          access_token: cachedTokens.access_token,
          refresh_token: cachedTokens.refresh_token,
        });

        if (error) {
          console.warn('Failed to restore session from cache:', error);
          // Clear invalid cache
          await window.electronAPI.clearAuthCache();
          return;
        }

        if (data.session) {
          console.log('Auto-login successful, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          console.warn('No valid session after auto-login attempt');
          // Clear invalid cache
          await window.electronAPI.clearAuthCache();
        }
      } catch (error) {
        console.error('Auto-login check failed:', error);
        // Clear potentially corrupted cache
        try {
          await window.electronAPI.clearAuthCache();
        } catch (clearError) {
          console.error('Failed to clear cache:', clearError);
        }
      }
    }

    checkAutoLogin();
  }, [router, pathname]);

  // This component doesn't render anything
  return null;
}