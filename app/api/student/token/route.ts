/**
 * Get User Token API Route
 * Retrieves the user's API token from api_tokens table for bot usage
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/server/rateLimiting';

const TOKEN_RATE_LIMIT = { endpoint: 'token-fetch', hourlyLimit: 10, dailyLimit: 20 };

// Soft gate: apiFetch() in Electron automatically sends X-Client-Type: desktop
// (see lib/client/http.ts buildDesktopHeaders). This prevents accidental browser
// calls but is not a security boundary — the token belongs to the authenticated user.
function isDesktopRequest(request: NextRequest): boolean {
  return request.headers.get('x-client-type') === 'desktop';
}

export async function GET(): Promise<NextResponse>;
export async function GET(request: NextRequest): Promise<NextResponse>;
export async function GET(request?: NextRequest) {
  try {
    if (request && !isDesktopRequest(request)) {
      return NextResponse.json(
        { error: 'This endpoint is only available in the desktop app' },
        { status: 403 }
      );
    }

    const auth = await authenticateRequest(request!);
    if (auth.error) return auth.error;

    const { user, supabase } = auth;

    const rateLimit = await checkRateLimit(user.id, TOKEN_RATE_LIMIT);
    if (rateLimit.error) return rateLimit.error;
    if (!rateLimit.data.allowed) return rateLimitExceededResponse(TOKEN_RATE_LIMIT, rateLimit.data);

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
