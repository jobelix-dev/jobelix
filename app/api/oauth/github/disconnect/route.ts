/**
 * GitHub OAuth - Disconnect Endpoint
 * 
 * Removes GitHub OAuth connection from database.
 * User can reconnect later if needed.
 */

import "server-only";

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { deleteGitHubConnection } from '@/lib/server/github/oauth';
import { enforceSameOrigin } from '@/lib/server/csrf';

export async function POST(): Promise<NextResponse>;
export async function POST(request: NextRequest): Promise<NextResponse>;
export async function POST(request?: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const auth = await authenticateRequest(request!);
    if (auth.error) return auth.error;
    const { user } = auth;

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
