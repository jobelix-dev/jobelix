/**
 * GET /api/student/referral/code
 *
 * Returns the user's referral code and statistics.
 * Creates a new code if the user doesn't have one.
 * 
 * Security:
 * - Students only (enforced at database level)
 * - Returns error for non-student accounts
 */

import "server-only";

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { supabase } = auth;

    // Get or create referral code (database enforces student-only)
    const { data: codeResult, error: codeError } = await supabase
      .rpc('get_or_create_referral_code');

    if (codeError) {
      // Check if it's a "students only" error
      if (codeError.message?.includes('talent accounts')) {
        return NextResponse.json(
          { error: 'Referral codes are only available for talent accounts' },
          { status: 403 }
        );
      }
      console.error('Failed to get/create referral code:', codeError);
      return NextResponse.json({ error: 'Failed to get referral code' }, { status: 500 });
    }

    const code = codeResult?.[0]?.code;
    if (!code) {
      return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 });
    }

    // Get referral stats (database enforces student-only)
    const { data: statsResult, error: statsError } = await supabase
      .rpc('get_referral_stats');

    if (statsError) {
      // Check if it's a "students only" error
      if (statsError.message?.includes('talent accounts')) {
        return NextResponse.json(
          { error: 'Referral stats are only available for talent accounts' },
          { status: 403 }
        );
      }
      console.error('Failed to get referral stats:', statsError);
      return NextResponse.json({ error: 'Failed to get referral stats' }, { status: 500 });
    }

    const stats = statsResult?.[0] || {
      referral_code: code,
      total_referrals: 0,
      pending_referrals: 0,
      completed_referrals: 0,
      total_credits_earned: 0,
    };

    return NextResponse.json({
      code: stats.referral_code || code,
      totalReferrals: stats.total_referrals,
      pendingReferrals: stats.pending_referrals,
      completedReferrals: stats.completed_referrals,
      totalCreditsEarned: stats.total_credits_earned,
    });
  } catch (error) {
    console.error('Referral code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
