/**
 * POST /api/autoapply/bot/start
 * 
 * Creates initial bot session record when bot launches.
 * Called by Python engine immediately after startup.
 * 
 * Body: { token: string, bot_version: string, platform: string }
 * Returns: { success: true, session_id: string }
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/server/supabaseService';

export async function POST(req: NextRequest) {
  try {
    const { token, bot_version, platform } = await req.json();

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const serviceSupabase = getServiceSupabase();

    // Validate token and get user_id
    const { data: apiToken, error: tokenError } = await serviceSupabase
      .from('api_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle();

    if (tokenError || !apiToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user_id = apiToken.user_id;

    // Check if user already has a running session
    const { data: existingSession } = await serviceSupabase
      .from('bot_sessions')
      .select('id, status')
      .eq('user_id', user_id)
      .in('status', ['starting', 'running'])
      .maybeSingle();

    if (existingSession) {
      return NextResponse.json(
        { 
          error: 'Bot session already running',
          session_id: existingSession.id 
        },
        { status: 409 }
      );
    }

    // Create new session
    const { data: session, error: insertError } = await serviceSupabase
      .from('bot_sessions')
      .insert({
        user_id,
        status: 'starting',
        bot_version: bot_version || 'unknown',
        platform: platform || 'unknown',
        last_heartbeat_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Bot Start] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    console.log(`[Bot Start] Session created: ${session.id} for user ${user_id}`);

    return NextResponse.json({
      success: true,
      session_id: session.id
    });

  } catch (err: any) {
    console.error('[Bot Start] Error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
