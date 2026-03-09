/**
 * API Authentication Utilities
 *
 * Authenticate the incoming request and return the user + supabase client.
 *
 * Two auth methods:
 * - Cookie-based (web): Supabase session cookies managed by middleware
 * - Token-based (desktop): Bearer token in Authorization header
 */

import "server-only";

import { NextResponse } from 'next/server'
import { createClient } from './supabaseServer'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export type AuthResult =
  | { user: User; supabase: SupabaseClient; error: null }
  | { user: null; supabase: null; error: NextResponse }

async function authenticateWithToken(token: string): Promise<AuthResult> {
  // Pass the user's token in global headers so all subsequent DB queries
  // carry the correct auth context and RLS policies (auth.uid() = id) work.
  // Without this, queries use only the anon key → auth.uid() is null in RLS
  // → student/company rows return empty → profile: null → redirect loop.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { user, supabase, error: null };
}

/**
 * Authenticate the current request and return the authenticated user.
 *
 * @param request - The incoming request (required so Bearer tokens work for desktop)
 * @returns Object containing user and supabase client, or error response
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const auth = await authenticateRequest(request)
 *   if (auth.error) return auth.error
 *
 *   const { user, supabase } = auth
 * }
 * ```
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  // Desktop app: Check for Bearer token
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    return authenticateWithToken(token);
  }

  // Web app: Cookie-based authentication (cookies read from Next.js request context)
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { user, supabase, error: null };
}
