/**
 * GET /api/student/referral/status
 *
 * Returns the current user's referral status as a referee.
 * Used to show the "You have X bonus credits waiting" banner.
 * 
 * Response:
 * - isReferred: boolean - whether the user was referred
 * - status: 'pending' | 'completed' | null - referral status
 * - bonusCredits: number | null - credits waiting/earned
 * - referrerFirstName: string | null - who referred them (for personalization)
 */

import "server-only";

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { supabase } = auth;

    const { data, error } = await supabase.rpc('get_my_referral_status');

    if (error) {
      console.error('Failed to get referral status:', error);
      return NextResponse.json({ error: 'Failed to get referral status' }, { status: 500 });
    }

    const row = data?.[0];
    
    return NextResponse.json({
      isReferred: row?.is_referred ?? false,
      status: row?.status ?? null,
      bonusCredits: row?.bonus_credits ?? null,
      referrerFirstName: row?.referrer_first_name ?? null,
    });
  } catch (error) {
    console.error('Referral status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
