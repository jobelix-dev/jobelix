/**
 * POST /api/autoapply/gpt4
 *
 * Body: { token: string, messages: Array<{ role: 'user'|'assistant'|'system', content: string }>, temperature?: number }
 *
 * This endpoint is for the Python desktop app only.
 * Validates API token, checks credits, forwards to OpenAI, and deducts 1 credit.
 *
 * Security model (beginner-friendly):
 * - The client sends an API token (like a password for the desktop app).
 * - We validate the token on the server using the service role key (bypasses RLS safely).
 * - We charge 1 credit per call using a database RPC (so clients cannot fake credits).
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServiceSupabase } from '@/lib/server/supabaseService'
import { checkRateLimit, logApiCall, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/server/rateLimiting'
import { API_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies'

// Check if Mistral API key is configured
if (!process.env.MISTRAL_API_KEY) {
  console.error('[GPT4 Route] CRITICAL: MISTRAL_API_KEY not set in environment variables!')
}

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null
function getOpenAI() {
  if (!openaiInstance) {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not configured')
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: 'https://api.mistral.ai/v1',
    })
  }
  return openaiInstance
}

// Mistral Small: $0.10/1M input, $0.30/1M output
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 0.10 + outputTokens * 0.30) / 1_000_000
}



/**
 * 🔐 Simple safety limits to prevent abuse / huge bills.
 * You can tune these numbers later.
 */
const MAX_MESSAGES = 5 // 🔐
const MAX_CHARS_PER_MESSAGE = 30_000 // 🔐
const MAX_TOTAL_CHARS = 30_000 // 🔐

export async function POST(req: NextRequest) {
  try {
    // Keep logs light in production (avoid logging user_id / secrets)
    console.log('[GPT4 Route] Request received')
    const body = await req.json()
    const { token, messages, temperature = 0.8 } = body || {}

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    /**
     * 🔐 Validate shape and size to prevent giant payloads.
     * Without this, someone can send huge messages and burn your OpenAI budget.
     */

    if (messages.length === 0 || messages.length > MAX_MESSAGES) { // 🔐
      return NextResponse.json({ error: 'messages too large' }, { status: 400 }) // 🔐
    }

    let totalChars = 0 // 🔐
    for (const m of messages) { // 🔐
      if (!m || (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system')) { // 🔐
        return NextResponse.json({ error: 'invalid message role' }, { status: 400 }) // 🔐
      }
      if (typeof m.content !== 'string') { // 🔐
        return NextResponse.json({ error: 'invalid message content' }, { status: 400 }) // 🔐
      }
      if (m.content.length > MAX_CHARS_PER_MESSAGE) { // 🔐
        return NextResponse.json({ error: 'message too long' }, { status: 400 }) // 🔐
      }
      totalChars += m.content.length // 🔐
      if (totalChars > MAX_TOTAL_CHARS) { // 🔐
        return NextResponse.json({ error: 'payload too large' }, { status: 400 }) // 🔐
      }
    }

    /**
     * 🔐 Clamp temperature to a safe range (avoid weird values like 999).
     */
    const safeTemperature = Math.max(0, Math.min(2, Number(temperature) || 0.8)) // 🔐

    // Service role client (bypasses RLS)  -  ONLY on server routes
    const serviceSupabase = getServiceSupabase()

    // Validate token and get user_id
    const { data: apiToken, error: tokenError } = await serviceSupabase
      .from('api_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle()

    if (tokenError || !apiToken) {
      // Don't reveal whether token exists; just "Invalid token"
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user_id = apiToken.user_id

    /**
     * 🔐 RATE LIMITING: Check if user is within rate limits
     * This prevents abuse and protects against excessive API costs
     */
    const rateLimitConfig = API_RATE_LIMIT_POLICIES.gpt4

    const rateLimitResult = await checkRateLimit(user_id, rateLimitConfig)
    if (rateLimitResult.error) return rateLimitResult.error

    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data)
    }

    const rateLimit = rateLimitResult.data

    /**
     * 🔐 IMPORTANT FIX: deduct/reserve credit BEFORE calling OpenAI.
     *
     * Why?
     * - If two requests arrive at the same time, both can see "balance > 0"
     * - Then both call OpenAI (costs you money)
     * - Only one may successfully deduct credit
     * Deducting first prevents "free calls" under concurrency.
     */
      const { data: creditResult, error: deductError } = await serviceSupabase // 🔐
      .rpc('use_credits', { // 🔐
        p_user_id: user_id, // 🔐
        p_amount: 1 // 🔐
      }) // 🔐

      if (deductError || !creditResult || creditResult.length === 0 || !creditResult[0]?.success) { // 🔐
        // Not enough credits (or deduction failed) → do NOT call OpenAI
        return NextResponse.json({ // 🔐
          error: 'Insufficient credits', // 🔐
          message: 'You need to claim daily credits or purchase more credits' // 🔐
        }, { status: 402 }) // 🔐
      }

      // At this point, 1 credit has been reserved/deducted successfully.
      console.log('[GPT4 Route] Credit deducted, calling OpenAI...') // 🔐 (log ok, no user_id)

      // Call OpenAI — if this throws, refund the credit so the user isn't charged
      // for a call that returned no result.
      const openai = getOpenAI()
      let completion: Awaited<ReturnType<typeof openai.chat.completions.create>>
      try {
        completion = await openai.chat.completions.create({
          model: 'mistral-small-latest',
          messages,
          temperature: safeTemperature, // 🔐
        })
      } catch (llmError) {
        // Refund the credit — best-effort, failure is logged but not surfaced.
        await serviceSupabase.rpc('refund_credit', { p_user_id: user_id, p_amount: 1 }).catch(
          (e) => console.error('[GPT4 Route] Failed to refund credit after LLM error:', e)
        )
        throw llmError // rethrow → caught by outer catch → 500 response
      }

    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const totalTokens = completion.usage?.total_tokens || (inputTokens + outputTokens)
    const callCost = calculateCost(inputTokens, outputTokens)

    /**
     * Optional stats update.
     * Note: If this fails, it should not break the response.
     */
    await serviceSupabase.rpc('update_token_usage', {
      p_token: token,
      p_tokens_used: totalTokens,
      p_cost_usd: callCost
    })

    /**
     * 🔐 Log this API call for rate limiting
     * This happens AFTER successful OpenAI call (don't log failed attempts)
     */
    await logApiCall(user_id, 'gpt4')

    // Transform OpenAI response
    const choice = completion.choices[0]
    const response = NextResponse.json({
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

    // Add rate limit info to response headers
    addRateLimitHeaders(response, rateLimitConfig, rateLimit)

    return response
  } catch {
    /**
     * 🔐 SECURITY:
     * Don't return raw err.message to clients (can leak internal details).
     */
    return NextResponse.json({ error: 'Internal error' }, { status: 500 }) // 🔐
  }
}
