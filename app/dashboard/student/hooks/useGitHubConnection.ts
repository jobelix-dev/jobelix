/**
 * useGitHubConnection Hook
 * 
 * Manages GitHub OAuth connection status and flow.
 * Handles: connection check, authorization redirect, disconnection.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

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

export function useGitHubConnection() {
  const [status, setStatus] = useState<GitHubConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check GitHub connection status
  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Add cache-busting timestamp to ensure fresh data
      const response = await fetch(`/api/oauth/github/status?t=${Date.now()}`, {
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
    } catch (err: any) {
      console.error('Error checking GitHub connection:', err);
      setError(err.message);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect GitHub (redirects to OAuth flow)
  const connect = useCallback(() => {
    // Redirect to GitHub authorization endpoint
    // Add force=true to always show account picker (allows switching accounts)
    window.location.href = '/api/oauth/github/authorize?force=true';
  }, []);

  // Disconnect GitHub
  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/oauth/github/disconnect', {
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
    } catch (err: any) {
      console.error('Error disconnecting GitHub:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkStatus]);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Check for OAuth callback success/error in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubConnected = params.get('github_connected');
    const githubError = params.get('github_error');

    if (githubConnected === 'true') {
      // Refresh status after successful connection
      checkStatus();
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
    connect,
    disconnect,
    refresh: checkStatus,
  };
}
