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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, messages, model = 'gpt-4' } = body || {}

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

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model,
      messages,
      // You can tune other params (max_tokens, temperature) as needed
    })

    // Decrement usage atomically (best-effort; race is acceptable for MVP)
    try {
      const newValues: any = { last_used_at: new Date().toISOString() }
      if (tokenRow.uses_remaining !== null) {
        newValues.uses_remaining = Math.max(0, tokenRow.uses_remaining - 1)
      }
      await serviceSupabase
        .from('gpt_tokens')
        .update(newValues)
        .eq('id', tokenRow.id)
    } catch (uErr) {
      console.warn('Failed to update token usage:', uErr)
      // Not fatal for response
    }

    // Return the model output
    return NextResponse.json({ success: true, result: completion })
  } catch (err: any) {
    console.error('GPT proxy error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
