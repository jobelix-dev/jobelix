/**
 * POST /api/autoapply/gpt4
 *
 * Body: { token: string, messages: Array<{ role: 'user'|'assistant'|'system', content: string }>, model?: string }
 *
 * This endpoint validates the provided token against `gpt_tokens` table using
 * the service-role Supabase key, enforces revocation and simple per-token
 * usage limits, forwards the request to OpenAI (server-side), updates
 * usage counters and returns the model response.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import serviceSupabase from '@/lib/supabaseService'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * OpenAI GPT-4 Pricing (per 1M tokens)
 * Source: https://openai.com/api/pricing/
 */
const GPT4_PRICING = {
  input: 30.00,   // $30 per 1M input tokens
  output: 60.00   // $60 per 1M output tokens
}

/**
 * Calculate cost for GPT-4 API call
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * GPT4_PRICING.input + outputTokens * GPT4_PRICING.output) / 1_000_000
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, messages, temperature = 0.8 } = body || {}

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    // Lookup token (service role client bypasses RLS)
    const { data: tokenRow, error: fetchErr } = await serviceSupabase
      .from('gpt_tokens')
      .select('*')
      .eq('token', token)
      .limit(1)
      .maybeSingle()

    if (fetchErr) {
      console.error('Token lookup error:', fetchErr)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!tokenRow) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (tokenRow.revoked) {
      return NextResponse.json({ error: 'Token revoked' }, { status: 403 })
    }

    if (tokenRow.uses_remaining !== null && tokenRow.uses_remaining <= 0) {
      return NextResponse.json({ error: 'Token usage exhausted' }, { status: 402 })
    }

    // Call OpenAI with GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature,
    })

    // Calculate cost for this API call
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const callCost = calculateCost(inputTokens, outputTokens)

    // Update usage and cost atomically
    try {
      const newValues: any = { last_used_at: new Date().toISOString() }
      
      // Decrement remaining uses
      if (tokenRow.uses_remaining !== null) {
        newValues.uses_remaining = Math.max(0, tokenRow.uses_remaining - 1)
      }
      
      // Increment total cost
      const newTotalCost = (parseFloat(tokenRow.total_cost || '0') + callCost).toFixed(6)
      newValues.total_cost = newTotalCost
      
      await serviceSupabase
        .from('gpt_tokens')
        .update(newValues)
        .eq('id', tokenRow.id)
      
      console.log(`[Token ${tokenRow.id}] Usage: ${tokenRow.uses_remaining} → ${newValues.uses_remaining}, Cost: $${tokenRow.total_cost || 0} → $${newTotalCost} (+$${callCost.toFixed(6)})`)
    } catch (uErr) {
      console.warn('Failed to update token usage:', uErr)
      // Not fatal for response
    }

    // Transform OpenAI response to client-expected format
    const choice = completion.choices[0]
    return NextResponse.json({
      content: choice.message.content,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: completion.usage?.total_tokens || 0,
        total_cost: callCost // Include cost in response
      },
      model: completion.model,
      finish_reason: choice.finish_reason || 'stop'
    })
  } catch (err: any) {
    console.error('GPT proxy error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
