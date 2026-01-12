/**
 * POST /api/student/credits/claim
 *
 * Claims daily free credits (100 credits per day) for the authenticated user.
 * Idempotent - can only claim once per day.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest()
    if (auth.error) return auth.error

    const { user, supabase } = auth

    // Call grant_daily_credits function
    const { data, error } = await supabase.rpc('grant_daily_credits', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Failed to grant daily credits:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data returned' }, { status: 500 })
    }

    const result = data[0]

    if (!result.success) {
      // User already claimed today
      return NextResponse.json(
        {
          message: 'Daily credits already claimed for today',
          credits_granted: 0,
          balance: result.new_balance || 0,
        },
        { status: 200 }
      )
    }

    // Success - credits granted
    return NextResponse.json({
      message: 'Daily credits claimed successfully',
      credits_granted: result.credits_granted,
      balance: result.new_balance,
    })
  } catch (err: any) {
    console.error('Claim credits error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
