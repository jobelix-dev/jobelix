/**
 * POST /api/autoapply/bot/complete
 * 
 * Marks bot session as completed or failed.
 * Called by Python engine when execution finishes (success or error).
 * 
 * Body: {
 *   token: string,
 *   session_id: string,
 *   success: boolean,
 *   error_message?: string,
 *   error_details?: object,
 *   final_stats?: { jobs_found, jobs_applied, jobs_failed, credits_used }
 * }
 * Returns: { success: true }
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/server/supabaseService';

export async function POST(req: NextRequest) {
  try {
    const { 
      token, 
      session_id, 
      success, 
      error_message, 
      error_details,
      final_stats 
    } = await req.json();

    // Validate required fields
    if (!token || !session_id || typeof success !== 'boolean') {
      return NextResponse.json(
        { error: 'Token, session_id, and success are required' },
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

    // Prepare update data
    const updateData: any = {
      status: success ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString()
    };

    if (!success && error_message) {
      updateData.error_message = error_message;
    }

    if (!success && error_details) {
      updateData.error_details = error_details;
    }

    // Update final stats if provided
    if (final_stats) {
      if (typeof final_stats.jobs_found === 'number') {
        updateData.jobs_found = final_stats.jobs_found;
      }
      if (typeof final_stats.jobs_applied === 'number') {
        updateData.jobs_applied = final_stats.jobs_applied;
      }
      if (typeof final_stats.jobs_failed === 'number') {
        updateData.jobs_failed = final_stats.jobs_failed;
      }
      if (typeof final_stats.credits_used === 'number') {
        updateData.credits_used = final_stats.credits_used;
      }
    }

    // Update session (triggers Realtime event)
    const { error: updateError } = await serviceSupabase
      .from('bot_sessions')
      .update(updateData)
      .eq('id', session_id)
      .eq('user_id', user_id);

    if (updateError) {
      console.error('[Bot Complete] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      );
    }

    console.log(
      `[Bot Complete] Session ${session_id.slice(0, 8)}: ${success ? 'SUCCESS' : 'FAILED'}${
        error_message ? ` - ${error_message}` : ''
      }`
    );

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[Bot Complete] Error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
