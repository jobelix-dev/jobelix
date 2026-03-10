/**
 * GitHub Connection Status Endpoint
 * 
 * Returns whether the current user has a GitHub account connected
 * and when it was last synced.
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getGitHubConnection } from '@/lib/server/github/oauth';

// Disable caching for this endpoint - always fetch fresh status
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;
    const { user } = auth;

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
