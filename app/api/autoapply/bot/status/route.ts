/**
 * GET /api/autoapply/bot/status
 * 
 * Fetches current bot session for authenticated user.
 * Used as fallback if Realtime subscription fails or on initial load.
 * 
 * Returns: { session: BotSession | null }
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user via session cookie
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user, supabase } = auth;

    // Fetch most recent active or completed session (last 24 hours)
    const { data: sessions, error } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[Bot Status] Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      );
    }

    const session = sessions && sessions.length > 0 ? sessions[0] : null;

    // Fetch historical totals from all completed sessions
    const { data: historicalData, error: histError } = await supabase
      .from('bot_sessions')
      .select('jobs_found, jobs_applied, jobs_failed, credits_used')
      .eq('user_id', user.id)
      .in('status', ['completed', 'stopped']); // Only count finished sessions

    const historicalTotals = {
      jobs_found: 0,
      jobs_applied: 0,
      jobs_failed: 0,
      credits_used: 0
    };

    if (!histError && historicalData) {
      historicalData.forEach(s => {
        historicalTotals.jobs_found += s.jobs_found || 0;
        historicalTotals.jobs_applied += s.jobs_applied || 0;
        historicalTotals.jobs_failed += s.jobs_failed || 0;
        historicalTotals.credits_used += s.credits_used || 0;
      });
    }

    return NextResponse.json({ session, historicalTotals });

  } catch (err: any) {
    console.error('[Bot Status] Error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
