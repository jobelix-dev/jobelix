/**
 * POST /api/student/tokens/generate
 * 
 * Generates a new daily GPT token for the authenticated user.
 * Enforces one token per day limit.
 * Returns the new token and its usage limits.
 */

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { randomBytes } from 'crypto';

const DAILY_TOKEN_MAX_USES = 100; // Configure daily limit here

export async function POST() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    // Check if user already has a token created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingTokens, error: fetchError } = await supabase
      .from('gpt_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_daily_token', true)
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error checking existing tokens:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing tokens' },
        { status: 500 }
      );
    }

    if (existingTokens && existingTokens.length > 0) {
      // User already has a token for today
      return NextResponse.json(
        { 
          error: 'Daily token already generated',
          message: 'You can only generate one token per day',
          existingToken: existingTokens[0]
        },
        { status: 409 }
      );
    }

    // Generate a secure random token
    const tokenString = randomBytes(32).toString('hex');

    // Create new token
    const { data: newToken, error: createError } = await supabase
      .from('gpt_tokens')
      .insert({
        token: tokenString,
        user_id: user.id,
        uses_remaining: DAILY_TOKEN_MAX_USES,
        max_uses: DAILY_TOKEN_MAX_USES,
        is_daily_token: true,
        revoked: false,
      })
      .select()
      .single();

    if (createError || !newToken) {
      console.error('Error creating token:', createError);
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      token: newToken,
      message: 'Daily token generated successfully'
    });

  } catch (error: any) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
