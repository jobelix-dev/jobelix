/**
 * GitHub OAuth - Authorize Endpoint
 * 
 * Initiates GitHub OAuth flow by redirecting user to GitHub authorization page.
 * Generates state parameter with HMAC signature for CSRF protection.
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabaseServer';
import { getGitHubAuthUrl } from '@/lib/server/githubOAuth';
import { randomBytes, createHmac } from 'crypto';

// Secret for signing OAuth state - falls back to GITHUB_CLIENT_SECRET if not set
const STATE_SECRET = process.env.GITHUB_STATE_SECRET || process.env.GITHUB_CLIENT_SECRET || '';

/**
 * Create HMAC signature for OAuth state data
 */
function signState(data: string): string {
  return createHmac('sha256', STATE_SECRET).update(data).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Generate CSRF state token with HMAC signature
    const nonce = randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    // State data includes user ID, nonce, and timestamp (for expiry)
    const stateData = JSON.stringify({ 
      userId: user.id, 
      nonce,
      ts: timestamp 
    });
    
    // Sign the state data to prevent tampering
    const signature = signState(stateData);
    
    // Combine data and signature
    const signedState = JSON.stringify({ data: stateData, sig: signature });
    const encodedState = Buffer.from(signedState).toString('base64url');

    // Check if user wants to force account selection (via query param)
    const forceAccountSelection = request.nextUrl.searchParams.get('force') === 'true';

    // Get GitHub authorization URL
    // Force account selection allows users to switch GitHub accounts
    const authUrl = getGitHubAuthUrl(encodedState, forceAccountSelection);

    // Redirect to GitHub
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error in GitHub authorize endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to initiate GitHub authorization' },
      { status: 500 }
    );
  }
}
