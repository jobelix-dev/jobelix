/**
 * GET /api/student/referral/list
 *
 * Returns the list of users the current user has referred.
 * Includes first name for display (or "Friend" if not set).
 * 
 * Response:
 * - referrals: Array of { id, firstName, status, createdAt, completedAt, creditsEarned }
 */

import "server-only";

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { supabase } = auth;

    const { data, error } = await supabase.rpc('get_my_referrals');

    if (error) {
      // Check if it's a "students only" error
      if (error.message?.includes('talent accounts')) {
        return NextResponse.json(
          { error: 'Referrals are only available for talent accounts' },
          { status: 403 }
        );
      }
      console.error('Failed to get referrals list:', error);
      return NextResponse.json({ error: 'Failed to get referrals' }, { status: 500 });
    }

    const referrals = (data ?? []).map((row: {
      id: string;
      first_name: string;
      status: string;
      created_at: string;
      completed_at: string | null;
      credits_earned: number;
    }) => ({
      id: row.id,
      firstName: row.first_name,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      creditsEarned: row.credits_earned,
    }));

    return NextResponse.json({ referrals });
  } catch (error) {
    console.error('Referrals list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
