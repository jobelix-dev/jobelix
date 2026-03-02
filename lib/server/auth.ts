/**
 * API Authentication Utilities
 * 
 * Reusable authentication helpers for API routes.
 * Provides consistent error handling and user validation across all endpoints.
 * 
 * Supports two authentication methods:
 * - Cookie-based (web browsers): Uses Supabase session cookies
 * - Token-based (desktop app): Uses Bearer token in Authorization header
 */

import "server-only";

import { NextResponse } from 'next/server'
import { createClient } from './supabaseServer'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Authentication result containing either authenticated user or error response
 */
export type AuthResult = 
  | { user: User; supabase: SupabaseClient; error: null }
  | { user: null; supabase: null; error: NextResponse }

/**
 * In-memory cache for authenticated users to reduce auth.getUser() calls
 * Key: access_token, Value: { user, timestamp }
 * 
 * NOTE: This cache is per-process and short-lived (3s TTL).
 * In serverless environments, it provides benefit during request bursts
 * but doesn't persist across cold starts (which is fine for auth).
 */
const userCache = new Map<string, { user: User; timestamp: number }>();
const CACHE_TTL_MS = 3_000; // 3 second cache to balance freshness vs. performance
const CACHE_MAX_SIZE = 1000; // Prevent unbounded memory growth

/**
 * Clean up expired cache entries lazily (on access)
 * No setInterval needed - avoids memory leaks in serverless
 */
function cleanupCache(): void {
  const now = Date.now();
  // Only clean if cache is getting large
  if (userCache.size > CACHE_MAX_SIZE / 2) {
    for (const [key, value] of userCache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        userCache.delete(key);
      }
    }
  }
}

/**
 * Authenticate request via Bearer token (desktop app)
 */
async function authenticateWithToken(token: string): Promise<AuthResult> {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // Check cache first
  const cached = userCache.get(token);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { user: cached.user, supabase, error: null };
  }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    };
  }
  
  // Cache the authenticated user
  userCache.set(token, { user, timestamp: Date.now() });
  
  return { user, supabase, error: null };
}

/**
 * Authenticate the current request and return the authenticated user.
 * Uses in-memory cache (3s TTL) to reduce repeated auth.getUser() calls.
 * 
 * Supports two authentication methods:
 * 1. Token-based (desktop): Authorization: Bearer <token>
 * 2. Cookie-based (web): Supabase session cookies
 * 
 * @param request - Optional request object to check for Bearer token
 * @returns Object containing user and supabase client, or error response
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const auth = await authenticateRequest(request)
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
export async function authenticateRequest(request?: Request): Promise<AuthResult> {
  // Lazy cleanup on each request (lightweight - only runs if cache is large)
  cleanupCache();
  
  // Desktop app: Check for Bearer token
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      return authenticateWithToken(token);
    }
  }
  
  // Web app: Use cookie-based authentication
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
