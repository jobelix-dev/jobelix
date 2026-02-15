/**
 * GitHub OAuth - Disconnect Endpoint
 * 
 * Removes GitHub OAuth connection from database.
 * User can reconnect later if needed.
 */

import "server-only";

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabaseServer';
import { deleteGitHubConnection } from '@/lib/server/githubOAuth';
import { enforceSameOrigin } from '@/lib/server/csrf';

export async function POST(request?: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete GitHub connection
    const success = await deleteGitHubConnection(user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect GitHub' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in GitHub disconnect endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
