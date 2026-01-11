/**
 * GET /api/student/credits/balance
 *
 * Returns the current credit balance and usage statistics for the authenticated user.
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

    // Fetch user credits
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('balance, total_earned, total_purchased, total_used, last_updated')
      .eq('user_id', user.id)
      .maybeSingle()

    if (creditsError) {
      console.error('Failed to fetch credits:', creditsError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // If no record exists, return default values
    if (!userCredits) {
      return NextResponse.json({
        balance: 0,
        total_earned: 0,
        total_purchased: 0,
        total_used: 0,
        last_updated: null,
      })
    }

    return NextResponse.json(userCredits)
  } catch (err: any) {
    console.error('Get balance error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
