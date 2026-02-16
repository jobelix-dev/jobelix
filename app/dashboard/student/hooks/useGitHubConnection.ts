/**
 * useGitHubConnection Hook
 * 
 * Manages GitHub OAuth connection status and flow.
 * Handles: connection check, authorization redirect, disconnection.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/client/http';

export interface GitHubConnectionStatus {
  connected: boolean;
  connected_at?: string;
  last_synced_at?: string | null;
  metadata?: {
    username?: string;
    name?: string;
    avatar_url?: string;
    profile_url?: string;
  };
}

interface UseGitHubConnectionOptions {
  /** Called once when a new GitHub connection is established (popup or fallback) */
  onConnected?: () => void;
}

export function useGitHubConnection(options: UseGitHubConnectionOptions = {}) {
  const [status, setStatus] = useState<GitHubConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Stable ref for the onConnected callback so it doesn't re-create connect() */
  const onConnectedRef = useRef(options.onConnected);
  onConnectedRef.current = options.onConnected;

  // Cleanup poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Check GitHub connection status
  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Add cache-busting timestamp to ensure fresh data
      const response = await apiFetch(`/api/oauth/github/status?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to check GitHub status');
      }

      if (data.connected) {
        setStatus({
          connected: true,
          ...data.connection
        });
      } else {
        setStatus({ connected: false });
      }
    } catch (err: unknown) {
      console.error('Error checking GitHub connection:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect GitHub (opens OAuth flow in popup)
  const connect = useCallback(() => {
    // Clear any existing poll interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Open GitHub OAuth in a centered popup window
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      '/api/oauth/github/authorize?force=true',
      'github-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      setPopupBlocked(true);
      return;
    }

    setPopupBlocked(false);

    // Listen for postMessage from the callback-success page (faster than polling)
    let messageHandled = false;
    const handleMessage = (event: MessageEvent) => {
      // Validate origin to prevent spoofing
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      const allowedOrigins = new Set([window.location.origin]);
      if (appUrl) allowedOrigins.add(appUrl.replace(/\/+$/, ''));
      if (!allowedOrigins.has(event.origin)) return;

      if (event.data?.type === 'github-oauth-success') {
        messageHandled = true;
        window.removeEventListener('message', handleMessage);
        checkStatus().then(() => {
          onConnectedRef.current?.();
        });
      } else if (event.data?.type === 'github-oauth-error') {
        messageHandled = true;
        window.removeEventListener('message', handleMessage);
        setError(`GitHub connection failed: ${event.data.error || 'Unknown error'}`);
      }
    };
    window.addEventListener('message', handleMessage);

    // Fallback: poll for popup closure (in case postMessage doesn't fire,
    // e.g. cross-origin navigation in Electron)
    pollIntervalRef.current = setInterval(() => {
      if (popup.closed) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        window.removeEventListener('message', handleMessage);
        if (!messageHandled) {
          // Popup closed without postMessage — refresh status and fire callback if connected
          setTimeout(async () => {
            await checkStatus();
            // Re-read status from server (checkStatus updated it)
            const res = await apiFetch(`/api/oauth/github/status?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.success && data.connected) {
              onConnectedRef.current?.();
            }
          }, 500);
        }
      }
    }, 500);
  }, [checkStatus]);

  // Disconnect GitHub
  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch('/api/oauth/github/disconnect', {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to disconnect GitHub');
      }

      // Immediately update local state
      setStatus({ connected: false });
      
      // Also refresh from server to ensure sync (with cache-busting timestamp)
      await checkStatus();
      
      return true;
    } catch (err: unknown) {
      console.error('Error disconnecting GitHub:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkStatus]);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Check for OAuth callback success/error in URL (fallback when popup didn't work)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubConnected = params.get('github_connected');
    const githubError = params.get('github_error');

    if (githubConnected === 'true') {
      // Refresh status after successful connection, then fire callback
      checkStatus().then(() => {
        onConnectedRef.current?.();
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (githubError) {
      setError(`GitHub connection failed: ${githubError}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkStatus]);

  return {
    status,
    loading,
    error,
    popupBlocked,
    connect,
    disconnect,
    refresh: checkStatus,
  };
}
