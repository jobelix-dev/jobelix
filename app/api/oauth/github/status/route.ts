/**
 * GitHub Connection Status Endpoint
 * 
 * Returns whether the current user has a GitHub account connected
 * and when it was last synced.
 */

import "server-only";

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabaseServer';
import { getGitHubConnection } from '@/lib/server/githubOAuth';

// Disable caching for this endpoint - always fetch fresh status
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for GitHub connection
    const connection = await getGitHubConnection(user.id);

    if (!connection) {
      return NextResponse.json({
        success: true,
        connected: false,
        connection: null
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Return connection status (without sensitive token data)
    return NextResponse.json({
      success: true,
      connected: true,
      connection: {
        connected_at: connection.connected_at,
        last_synced_at: connection.last_synced_at,
        metadata: connection.metadata
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error checking GitHub connection status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
