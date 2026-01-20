/**
 * GitHub OAuth Helper Functions
 * 
 * Server-side utilities for handling GitHub OAuth flow.
 * Includes token management and connection status checks.
 */

import "server-only";
import { getServiceSupabase } from './supabaseService';

// =============================================================================
// TYPES
// =============================================================================

export interface GitHubOAuthConnection {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  scope: string | null;
  expires_at: string | null;
  connected_at: string;
  last_synced_at: string | null;
  metadata: any;
}

// =============================================================================
// GITHUB OAUTH CONFIGURATION
// =============================================================================

/**
 * Get GitHub OAuth configuration from environment variables
 */
export function getGitHubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || 
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/github/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GitHub OAuth credentials. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: ['read:user', 'repo'] // Access user info and repos
  };
}

/**
 * Generate GitHub OAuth authorization URL
 * @param state - CSRF protection state token
 * @param forceAccountSelection - Force GitHub to show account picker (useful for switching accounts)
 */
export function getGitHubAuthUrl(state: string, forceAccountSelection: boolean = false): string {
  const config = getGitHubOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state, // CSRF protection
  });

  // Force GitHub to show account picker
  // NOTE: According to GitHub docs, this only works if:
  // 1. User has multiple accounts signed in to GitHub, OR
  // 2. App uses a non-HTTP redirect URI
  // Otherwise, GitHub will auto-authorize with the current session
  if (forceAccountSelection) {
    params.set('prompt', 'select_account');
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange GitHub OAuth code for access token
 */
export async function exchangeGitHubCode(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
} | null> {
  const config = getGitHubOAuthConfig();

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      console.error('GitHub token exchange failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error('GitHub OAuth error:', data.error, data.error_description);
      return null;
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type || 'bearer',
      scope: data.scope || '',
    };
  } catch (error) {
    console.error('Error exchanging GitHub code:', error);
    return null;
  }
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Save GitHub OAuth connection to database
 */
export async function saveGitHubConnection(
  userId: string,
  accessToken: string,
  tokenType: string,
  scope: string,
  metadata?: any
): Promise<GitHubOAuthConnection | null> {
  const supabase = getServiceSupabase();

  try {
    const { data, error } = await supabase
      .from('oauth_connections')
      .upsert({
        user_id: userId,
        provider: 'github',
        access_token: accessToken,
        token_type: tokenType,
        scope,
        metadata: metadata || {},
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving GitHub connection:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in saveGitHubConnection:', error);
    return null;
  }
}

/**
 * Get GitHub OAuth connection for a user
 */
export async function getGitHubConnection(userId: string): Promise<GitHubOAuthConnection | null> {
  const supabase = getServiceSupabase();

  try {
    const { data, error } = await supabase
      .from('oauth_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'github')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No connection found
        return null;
      }
      console.error('Error fetching GitHub connection:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getGitHubConnection:', error);
    return null;
  }
}

/**
 * Update last_synced_at timestamp for a connection
 */
export async function updateLastSynced(userId: string, provider: string = 'github'): Promise<boolean> {
  const supabase = getServiceSupabase();

  try {
    const { error } = await supabase
      .from('oauth_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) {
      console.error('Error updating last_synced_at:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateLastSynced:', error);
    return false;
  }
}

/**
 * Delete GitHub OAuth connection
 */
export async function deleteGitHubConnection(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase();

  try {
    const { error } = await supabase
      .from('oauth_connections')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'github');

    if (error) {
      console.error('Error deleting GitHub connection:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteGitHubConnection:', error);
    return false;
  }
}
