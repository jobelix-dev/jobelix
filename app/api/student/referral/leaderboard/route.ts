/**
 * GET /api/student/referral/leaderboard
 *
 * Returns the referral leaderboard (top referrers).
 * Also returns the current user's rank if they have referrals.
 *
 * Query params:
 * - limit: number (default 10, max 50)
 *
 * Security:
 * - Authenticated users only
 * - Only shows first names (no email or full name)
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { supabase } = auth;

    // Parse limit from query params
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    let limit = 10;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
        limit = parsed;
      }
    }

    // Get leaderboard and user's rank in parallel
    const [leaderboardResult, rankResult] = await Promise.all([
      supabase.rpc('get_referral_leaderboard', { p_limit: limit }),
      supabase.rpc('get_my_leaderboard_rank'),
    ]);

    if (leaderboardResult.error) {
      console.error('Failed to get leaderboard:', leaderboardResult.error);
      return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
    }

    if (rankResult.error) {
      console.error('Failed to get user rank:', rankResult.error);
      // Non-fatal, continue without user rank
    }

    const leaderboard = leaderboardResult.data || [];
    const userRank = rankResult.data?.[0] || null;

    return NextResponse.json({
      leaderboard: leaderboard.map((entry: {
        rank: number;
        first_name: string;
        completed_count: number;
        total_credits_earned: number;
        is_current_user: boolean;
      }) => ({
        rank: entry.rank,
        firstName: entry.first_name,
        completedCount: entry.completed_count,
        creditsEarned: entry.total_credits_earned,
        isCurrentUser: entry.is_current_user,
      })),
      userRank: userRank ? {
        rank: userRank.rank,
        completedCount: userRank.completed_count,
        creditsEarned: userRank.total_credits_earned,
        totalParticipants: userRank.total_participants,
      } : null,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
