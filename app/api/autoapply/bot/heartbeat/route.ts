/**
 * POST /api/autoapply/bot/heartbeat
 * 
 * Updates bot session with current activity and stats.
 * Called periodically (every 30-60s) by Python engine during execution.
 * Updates trigger Supabase Realtime events for instant frontend updates.
 * 
 * Body: {
 *   token: string,
 *   session_id: string,
 *   activity: string,
 *   details?: object,
 *   stats: { jobs_found, jobs_applied, jobs_failed, credits_used }
 * }
 * Returns: { success: true }
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/server/supabaseService';

export async function POST(req: NextRequest) {
  try {
    const { token, session_id, activity, details, stats } = await req.json();

    // Validate required fields
    if (!token || !session_id) {
      return NextResponse.json(
        { error: 'Token and session_id are required' },
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

    // Verify session belongs to user
    const { data: session, error: sessionError } = await serviceSupabase
      .from('bot_sessions')
      .select('id, status')
      .eq('id', session_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if session is already stopped/completed
    if (session.status === 'stopped') {
      return NextResponse.json(
        { error: 'Session has been stopped by user', stopped: true },
        { status: 409 }
      );
    }

    if (session.status === 'completed' || session.status === 'failed') {
      return NextResponse.json(
        { error: 'Session already completed', completed: true },
        { status: 409 }
      );
    }

    // Prepare update data
    const updateData: any = {
      last_heartbeat_at: new Date().toISOString(),
      status: 'running' // Transition from 'starting' to 'running' on first heartbeat
    };

    if (activity) {
      updateData.current_activity = activity;
    }

    if (details) {
      updateData.activity_details = details;
    }

    if (stats) {
      if (typeof stats.jobs_found === 'number') updateData.jobs_found = stats.jobs_found;
      if (typeof stats.jobs_applied === 'number') updateData.jobs_applied = stats.jobs_applied;
      if (typeof stats.jobs_failed === 'number') updateData.jobs_failed = stats.jobs_failed;
      if (typeof stats.credits_used === 'number') updateData.credits_used = stats.credits_used;
    }

    // Update session (this triggers Realtime event)
    const { error: updateError } = await serviceSupabase
      .from('bot_sessions')
      .update(updateData)
      .eq('id', session_id)
      .eq('user_id', user_id);

    if (updateError) {
      console.error('[Bot Heartbeat] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    // Log minimal info (avoid spamming logs)
    if (activity) {
      console.log(`[Bot Heartbeat] ${session_id.slice(0, 8)}: ${activity}`);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[Bot Heartbeat] Error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
