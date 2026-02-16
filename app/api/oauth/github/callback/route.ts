/**
 * GitHub OAuth - Callback Endpoint
 * 
 * Handles the OAuth callback from GitHub.
 * Verifies HMAC-signed state parameter and exchanges code for access token.
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabaseServer';
import { exchangeGitHubCode, saveGitHubConnection } from '@/lib/server/githubOAuth';
import { fetchGitHubUser } from '@/lib/server/githubService';
import { createHmac, timingSafeEqual } from 'crypto';

function getStateSecret(): string {
  const secret = process.env.GITHUB_STATE_SECRET || process.env.GITHUB_CLIENT_SECRET;
  if (!secret) {
    throw new Error('GitHub OAuth state secret is not configured');
  }
  return secret;
}

// State expires after 10 minutes
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Verify HMAC signature of OAuth state data
 */
function verifyState(data: string, signature: string): boolean {
  const expectedSig = createHmac('sha256', getStateSecret()).update(data).digest('hex');
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    try {
      getStateSecret();
    } catch {
      return NextResponse.redirect(
        new URL('/oauth/github/callback-success?github_error=server_misconfigured', request.url)
      );
    }

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

    // Decode and verify signed state
    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64url').toString());
      const { data: stateDataStr, sig } = decodedState;
      
      // Verify HMAC signature
      if (!sig || !verifyState(stateDataStr, sig)) {
        console.error('Invalid state signature');
        return NextResponse.redirect(
          new URL('/oauth/github/callback-success?github_error=invalid_state', request.url)
        );
      }
      
      const stateData = JSON.parse(stateDataStr);
      
      // Check state expiry (10 minutes)
      if (stateData.ts && Date.now() - stateData.ts > STATE_MAX_AGE_MS) {
        console.error('OAuth state expired');
        return NextResponse.redirect(
          new URL('/oauth/github/callback-success?github_error=state_expired', request.url)
        );
      }
      
      userId = stateData.userId;
    } catch (err) {
      console.error('Invalid state parameter:', err);
      return NextResponse.redirect(
        new URL('/oauth/github/callback-success?github_error=invalid_state', request.url)
      );
    }

    // Verify user is authenticated and matches state
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
