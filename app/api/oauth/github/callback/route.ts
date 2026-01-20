/**
 * GitHub OAuth - Callback Endpoint
 * 
 * Handles the OAuth callback from GitHub.
 * Exchanges authorization code for access token and saves connection to database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabaseServer';
import { exchangeGitHubCode, saveGitHubConnection } from '@/lib/server/githubOAuth';
import { fetchGitHubUser } from '@/lib/server/githubService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle GitHub OAuth errors
    if (error) {
      console.error('GitHub OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/oauth/github/callback-success?github_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/oauth/github/callback-success?github_error=missing_params', request.url)
      );
    }

    // Decode and verify state
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
      userId = stateData.userId;
    } catch (err) {
      console.error('Invalid state parameter:', err);
      return NextResponse.redirect(
        new URL('/oauth/github/callback-success?github_error=invalid_state', request.url)
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      return NextResponse.redirect(
        new URL('/oauth/github/callback-success?github_error=unauthorized', request.url)
      );
    }

    // Exchange code for access token
    const tokenData = await exchangeGitHubCode(code);
    if (!tokenData) {
      return NextResponse.redirect(
        new URL('/oauth/github/callback-success?github_error=token_exchange_failed', request.url)
      );
    }

    // Fetch GitHub user info for metadata
    const githubUser = await fetchGitHubUser(tokenData.access_token);
    const metadata = githubUser ? {
      username: githubUser.login,
      name: githubUser.name,
      avatar_url: githubUser.avatar_url,
      profile_url: githubUser.html_url
    } : {};

    // Save connection to database
    const connection = await saveGitHubConnection(
      user.id,
      tokenData.access_token,
      tokenData.token_type,
      tokenData.scope,
      metadata
    );

    if (!connection) {
      return NextResponse.redirect(
        new URL('/oauth/github/callback-success?github_error=save_failed', request.url)
      );
    }

    // Success! Redirect to callback success page (will close popup and notify parent)
    return NextResponse.redirect(
      new URL('/oauth/github/callback-success?github_connected=true', request.url)
    );
  } catch (error) {
    console.error('Error in GitHub callback endpoint:', error);
    return NextResponse.redirect(
      new URL('/oauth/github/callback-success?github_error=unexpected_error', request.url)
    );
  }
}
