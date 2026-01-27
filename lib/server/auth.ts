/**
 * API Authentication Utilities
 * 
 * Reusable authentication helpers for API routes.
 * Provides consistent error handling and user validation across all endpoints.
 */

import "server-only";

import { NextResponse } from 'next/server'
import { createClient } from './supabaseServer'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Authentication result containing either authenticated user or error response
 */
export type AuthResult = 
  | { user: User; supabase: SupabaseClient; error: null }
  | { user: null; supabase: null; error: NextResponse }

/**
 * In-memory cache for authenticated users to reduce auth.getUser() calls
 * Key: user.id, Value: { user, timestamp }
 */
const userCache = new Map<string, { user: User; timestamp: number }>();
const CACHE_TTL_MS = 3_000; // 3 second cache to balance freshness vs. performance

/**
 * Clean up expired cache entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      userCache.delete(key);
    }
  }
}, 10_000); // Clean every 10 seconds

/**
 * Authenticate the current request and return the authenticated user.
 * Uses in-memory cache (3s TTL) to reduce repeated auth.getUser() calls.
 * 
 * @returns Object containing user and supabase client, or error response
 * 
 * @example
 * ```typescript
 * export async function GET() {
 *   const auth = await authenticateRequest()
 *   if (auth.error) return auth.error
 *   
 *   // Use auth.user and auth.supabase
 *   const { data } = await auth.supabase
 *     .from('student')
 *     .select('*')
 *     .eq('id', auth.user.id)
 * }
 * ```
 */
export async function authenticateRequest(): Promise<AuthResult> {
  const supabase = await createClient()
  
  // Try to get session from Supabase client to use as cache key
  const { data: { session } } = await supabase.auth.getSession()
  const cacheKey = session?.access_token
  
  // Check cache if we have a session token
  if (cacheKey) {
    const cached = userCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Return cached user (still need fresh supabase client)
      return { user: cached.user, supabase, error: null }
    }
  }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Cache the user if authenticated
  if (user && cacheKey) {
    userCache.set(cacheKey, { user, timestamp: Date.now() })
  }
  
  if (authError || !user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
  
  return { user, supabase, error: null }
}

/**
 * Require authentication for an API route.
 * Throws early return if user is not authenticated.
 * 
 * @returns Authenticated user and supabase client
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const { user, supabase } = await requireAuth()
 *   
 *   // Guaranteed to have user and supabase here
 *   const { data } = await supabase
 *     .from('student')
 *     .select('*')
 *     .eq('id', user.id)
 * }
 * ```
 * 
 * Note: This function uses type assertion to signal to TypeScript that
 * if the function returns, authentication has succeeded.
 */
export async function requireAuth(): Promise<{ user: User; supabase: SupabaseClient }> {
  const auth = await authenticateRequest()
  if (auth.error) {
    // This will cause an early return in the calling function
    throw auth.error
  }
  return { user: auth.user, supabase: auth.supabase }
}
