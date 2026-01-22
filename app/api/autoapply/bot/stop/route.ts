/**
 * POST /api/autoapply/bot/stop
 * 
 * Manually stops a running bot session.
 * Called by frontend when user clicks "Stop Bot" button.
 * Bot checks session status on next heartbeat and terminates gracefully.
 * 
 * Requires: User authentication (not token-based)
 * Returns: { success: true }
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user via session cookie
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user, supabase } = auth;
    const { session_id } = await req.json();

    // Validate required fields
    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user and is stoppable
    const { data: session, error: sessionError } = await supabase
      .from('bot_sessions')
      .select('id, status, user_id')
      .eq('id', session_id)
      .eq('user_id', user.id)
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
        { success: true, message: 'Session already stopped' }
      );
    }

    if (session.status === 'completed' || session.status === 'failed') {
      return NextResponse.json(
        { error: 'Cannot stop completed session' },
        { status: 409 }
      );
    }

    // Update session to stopped status
    const { error: updateError } = await supabase
      .from('bot_sessions')
      .update({
        status: 'stopped',
        completed_at: new Date().toISOString(),
        error_message: 'Stopped by user'
      })
      .eq('id', session_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Bot Stop] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to stop session' },
        { status: 500 }
      );
    }

    console.log(`[Bot Stop] Session ${session_id.slice(0, 8)} stopped by user ${user.id}`);

    return NextResponse.json({ 
      success: true,
      message: 'Bot will stop after current operation completes'
    });

  } catch (err: any) {
    console.error('[Bot Stop] Error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
