/**
 * Rate Limiting Utilities
 * Reusable functions for API rate limiting across endpoints
 */

import "server-only";

import { NextResponse } from 'next/server'
import { getServiceSupabase } from './supabaseService'

export interface RateLimitConfig {
  hourlyLimit: number
  dailyLimit: number
  endpoint: string
}

export interface RateLimitResult {
  allowed: boolean
  hourly_count: number
  daily_count: number
  hourly_remaining: number
  daily_remaining: number
}

/**
 * Check if a user is within rate limits for a specific endpoint
 * 
 * @param userId - The user's UUID
 * @param config - Rate limit configuration
 * @returns Rate limit check result or error response
 * 
 * @example
 * ```typescript
 * const rateLimitResult = await checkRateLimit(user.id, {
 *   endpoint: 'gpt4',
 *   hourlyLimit: 100,
 *   dailyLimit: 500
 * });
 * 
 * if (rateLimitResult.error) return rateLimitResult.error;
 * if (!rateLimitResult.data.allowed) {
 *   return NextResponse.json({
 *     error: 'Rate limit exceeded',
 *     ...rateLimitResult.data
 *   }, { status: 429 });
 * }
 * ```
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<{ data: RateLimitResult; error: null } | { data: null; error: NextResponse }> {
  const serviceSupabase = getServiceSupabase()

  const { data, error } = await serviceSupabase.rpc('check_api_rate_limit', {
    p_user_id: userId,
    p_endpoint: config.endpoint,
    p_hourly_limit: config.hourlyLimit,
    p_daily_limit: config.dailyLimit
  })

  if (error) {
    console.error(`[Rate Limit] Check failed for ${config.endpoint}:`, error)
    return {
      data: null,
      error: NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }

  const result = data?.[0]
  if (!result) {
    return {
      data: null,
      error: NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }

  return { data: result, error: null }
}

/**
 * Log an API call for rate limiting purposes
 * Call this AFTER a successful API operation
 * 
 * @param userId - The user's UUID
 * @param endpoint - The endpoint name (e.g., 'gpt4', 'image-generation')
 * 
 * @example
 * ```typescript
 * await logApiCall(user.id, 'gpt4');
 * ```
 */
export async function logApiCall(userId: string, endpoint: string): Promise<void> {
  const serviceSupabase = getServiceSupabase()

  const { error } = await serviceSupabase.rpc('log_api_call', {
    p_user_id: userId,
    p_endpoint: endpoint
  })

  if (error) {
    // Log but don't fail - logging is not critical to API functionality
    console.error(`[Rate Limit] Failed to log API call for ${endpoint}:`, error)
  }
}

/**
 * Add rate limit information to response headers
 * This helps clients track their usage without making additional API calls
 * 
 * @param response - NextResponse object to add headers to
 * @param config - Rate limit configuration
 * @param result - Current rate limit status
 * 
 * @example
 * ```typescript
 * const response = NextResponse.json({ ... });
 * addRateLimitHeaders(response, {
 *   hourlyLimit: 100,
 *   dailyLimit: 500,
 *   endpoint: 'gpt4'
 * }, rateLimitResult);
 * return response;
 * ```
 */
export function addRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Hourly-Limit', config.hourlyLimit.toString())
  response.headers.set('X-RateLimit-Daily-Limit', config.dailyLimit.toString())
  response.headers.set('X-RateLimit-Hourly-Remaining', result.hourly_remaining.toString())
  response.headers.set('X-RateLimit-Daily-Remaining', result.daily_remaining.toString())
  response.headers.set('X-RateLimit-Hourly-Used', result.hourly_count.toString())
  response.headers.set('X-RateLimit-Daily-Used', result.daily_count.toString())
  return response
}

/**
 * Generate a standardized rate limit exceeded error response
 * 
 * @param config - Rate limit configuration
 * @param result - Current rate limit status
 * @returns NextResponse with 429 status and rate limit details
 */
export function rateLimitExceededResponse(
  config: RateLimitConfig,
  result: RateLimitResult
): NextResponse {
  // User-friendly messages based on endpoint
  const endpointMessages: Record<string, string> = {
    'resume-extraction': 'Resume parsing is limited to avoid overload. Please try again in about an hour.',
    'github-import': 'GitHub import is limited to avoid overload. Please try again in about an hour.',
    'work-preferences': 'Too many updates. Please try again later.',
  };
  
  const friendlyMessage = endpointMessages[config.endpoint] || 
    `You've reached the usage limit. Please try again later.`;

  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: friendlyMessage,
      detail: `Hourly: ${result.hourly_count}/${config.hourlyLimit}, Daily: ${result.daily_count}/${config.dailyLimit}`,
      hourly_limit: config.hourlyLimit,
      daily_limit: config.dailyLimit,
      hourly_remaining: result.hourly_remaining,
      daily_remaining: result.daily_remaining,
      hourly_used: result.hourly_count,
      daily_used: result.daily_count
    },
    { status: 429 }
  )
}
