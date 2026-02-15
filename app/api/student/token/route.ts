/**
 * Get User Token API Route
 * Retrieves the user's API token from api_tokens table for bot usage
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

function isElectronUserAgent(userAgent: string | null): boolean {
  return Boolean(userAgent && /electron/i.test(userAgent));
}

export async function GET(request?: NextRequest) {
  try {
    if (request && !isElectronUserAgent(request.headers.get('user-agent'))) {
      return NextResponse.json(
        { error: 'This endpoint is only available in the desktop app' },
        { status: 403 }
      );
    }

    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user, supabase } = auth;

    // Fetch the API token from api_tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('api_tokens')
      .select('token')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      console.error('Error fetching API token:', tokenError);
      return NextResponse.json({ 
        error: 'No API token found for user',
        details: 'Token should be auto-generated on signup' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      token: tokenData.token,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  } catch (error) {
    console.error('Error fetching user token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
