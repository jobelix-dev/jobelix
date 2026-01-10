/**
 * GET /api/student/tokens/current
 * 
 * Fetches the current active daily token for the authenticated user.
 * Returns token info including remaining uses and creation time.
 */

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    // Get today's token (most recent daily token created today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: tokens, error: fetchError } = await supabase
      .from('gpt_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_daily_token', true)
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching token:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch token status' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        hasToken: false,
        token: null,
        message: 'No token generated today'
      });
    }

    const token = tokens[0];

    return NextResponse.json({
      hasToken: true,
      token: {
        id: token.id,
        token: token.token,
        uses_remaining: token.uses_remaining,
        max_uses: token.max_uses,
        revoked: token.revoked,
        created_at: token.created_at,
        last_used_at: token.last_used_at,
      }
    });

  } catch (error: any) {
    console.error('Token status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
