/**
 * API Authentication Utilities
 * 
 * Reusable authentication helpers for API routes.
 * Provides consistent error handling and user validation across all endpoints.
 */

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
 * Authenticate the current request and return the authenticated user.
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
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
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
