/**
 * POST /api/autoapply/gpt4
 *
 * Body: { token: string, messages: Array<{ role: 'user'|'assistant'|'system', content: string }> }
 *
 * This endpoint is for the Python desktop app only.
 * Validates API token, checks credits, forwards to OpenAI, and deducts 1 credit.
 * 
 * Security: Token is stored in database and validated server-side.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServiceSupabase } from '@/lib/supabaseService'

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.error('[GPT4 Route] CRITICAL: OPENAI_API_KEY not set in environment variables!')
}

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null
function getOpenAI() {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiInstance
}

/**
 * OpenAI GPT-4o-mini Pricing (per 1M tokens)
 * Source: https://platform.openai.com/docs/models/gpt-4o-mini
 * Updated: January 10, 2026
 */
const GPT4O_MINI_PRICING = {
  input: 0.15,   // $0.15 per 1M input tokens
  output: 0.60   // $0.60 per 1M output tokens
}

/**
 * Calculate cost for GPT-4o-mini API call
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * GPT4O_MINI_PRICING.input + outputTokens * GPT4O_MINI_PRICING.output) / 1_000_000
}

export async function POST(req: NextRequest) {
  try {
    console.log('[GPT4 Route] Request received')
    const body = await req.json()
    const { token, messages, temperature = 0.8 } = body || {}

    console.log('[GPT4 Route] Token present:', !!token)
    console.log('[GPT4 Route] Messages count:', messages?.length)

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    // Get service Supabase client
    const serviceSupabase = getServiceSupabase()

    console.log('[GPT4 Route] Validating token...')

    // Validate token and get user_id
    const { data: apiToken, error: tokenError } = await serviceSupabase
      .from('api_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle()

    if (tokenError || !apiToken) {
      console.error('[GPT4 Route] Token validation failed:', tokenError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user_id = apiToken.user_id
    console.log('[GPT4 Route] Token validated for user:', user_id)

    console.log('[GPT4 Route] Checking credits...')
    // Check if user has credits available
    const { data: userCredits, error: creditsError } = await serviceSupabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user_id)
      .maybeSingle()

    if (creditsError) {
      console.error('[GPT4 Route] Credits lookup error:', creditsError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!userCredits || userCredits.balance <= 0) {
      console.warn('[GPT4 Route] Insufficient credits for user:', user_id)
      return NextResponse.json({ 
        error: 'Insufficient credits',
        message: 'You need to claim daily credits or purchase more credits'
      }, { status: 402 })
    }

    console.log('[GPT4 Route] Credits available:', userCredits.balance)
    console.log('[GPT4 Route] Calling OpenAI API...')
    
    // Call OpenAI with GPT-4o-mini (cheaper model)
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature,
    })

    console.log('[GPT4 Route] OpenAI call successful')
    console.log('[GPT4 Route] Token usage - Input:', completion.usage?.prompt_tokens, 'Output:', completion.usage?.completion_tokens)

    // Calculate cost for this API call
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const totalTokens = completion.usage?.total_tokens || (inputTokens + outputTokens)
    const callCost = calculateCost(inputTokens, outputTokens)

    // Deduct 1 credit from user balance                        
    const { data: creditResult, error: deductError } = await serviceSupabase
      .rpc('use_credits', {
        p_user_id: user_id,
        p_amount: 1
      })

    if (deductError || !creditResult || creditResult.length === 0) {
      console.error('Failed to deduct credits:', deductError)
      // Don't fail the request - OpenAI call already succeeded
      console.warn(`Credits not deducted for user ${user_id}`)
    } else {
      const { success, new_balance } = creditResult[0]
      if (success) {
        console.log(`[Credits] User ${user_id}: 1 credit used, balance: ${new_balance}`)
        
        // Update token usage statistics (tokens used + cost)
        await serviceSupabase.rpc('update_token_usage', {
          p_token: token,
          p_tokens_used: totalTokens,
          p_cost_usd: callCost
        })
      } else {
        console.warn(`[Credits] Failed to deduct credit for user ${user_id}`)
      }
    }

    // Transform OpenAI response to client-expected format
    const choice = completion.choices[0]
    return NextResponse.json({
      content: choice.message.content,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        total_cost: callCost
      },
      model: completion.model,
      finish_reason: choice.finish_reason || 'stop'
    })
  } catch (err: any) {
    console.error('GPT proxy error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
