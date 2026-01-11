/**
 * GET /api/student/credits/can-claim
 *
 * Check if user can claim daily credits today
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already claimed today
    const { data: grant, error: grantError } = await supabase
      .from('daily_credit_grants')
      .select('granted_at')
      .eq('user_id', user.id)
      .eq('granted_date', new Date().toISOString().split('T')[0]) // Today's date in YYYY-MM-DD
      .maybeSingle()

    if (grantError) {
      console.error('Failed to check daily grant:', grantError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const canClaim = !grant
    const nextClaimDate = canClaim ? null : new Date(new Date().setHours(24, 0, 0, 0)).toISOString()

    return NextResponse.json({
      can_claim: canClaim,
      claimed_today: !!grant,
      last_claim: grant?.granted_at || null,
      next_claim_available: nextClaimDate,
    })
  } catch (err: any) {
    console.error('Check can claim error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
