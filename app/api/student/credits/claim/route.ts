/**
 * POST /api/student/credits/claim
 *
 * Claims daily free credits (100 credits per day) for the authenticated user.
 * Idempotent - can only claim once per day.
 */

import "server-only";

import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/server/auth'
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting'

export async function POST() {
  try {
    const auth = await authenticateRequest()
    if (auth.error) return auth.error

    const { user, supabase } = auth

    // Rate limiting: 10 attempts per hour (generous since it's once per day anyway)
    const rateLimitResult = await checkRateLimit(user.id, {
      endpoint: 'credits-claim',
      hourlyLimit: 10,
      dailyLimit: 50,
    })

    if (rateLimitResult.error) return rateLimitResult.error
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(
        { endpoint: 'credits-claim', hourlyLimit: 10, dailyLimit: 50 },
        rateLimitResult.data
      )
    }

    // Call grant_daily_credits function
    const { data, error } = await supabase.rpc('grant_daily_credits', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Failed to grant daily credits:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const result = data[0]

    // Log the API call for rate limiting (even if already claimed)
    await logApiCall(user.id, 'credits-claim')

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
  } catch {
    console.error('Claim credits error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
