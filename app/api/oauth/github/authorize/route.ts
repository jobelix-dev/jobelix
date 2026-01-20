/**
 * GitHub OAuth - Authorize Endpoint
 * 
 * Initiates GitHub OAuth flow by redirecting user to GitHub authorization page.
 * Generates state parameter for CSRF protection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabaseServer';
import { getGitHubAuthUrl } from '@/lib/server/githubOAuth';
import { randomBytes } from 'crypto';

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

    // Generate CSRF state token
    const state = randomBytes(32).toString('hex');

    // Store state in session/cookie for verification in callback
    // Using a simple approach: encode user_id in state (in production, use encrypted session)
    const stateData = JSON.stringify({ userId: user.id, random: state });
    const encodedState = Buffer.from(stateData).toString('base64url');

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
