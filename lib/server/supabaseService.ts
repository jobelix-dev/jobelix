/**
 * Server-side Supabase service client
 *
 * Use the service role key for server-only operations that need to bypass RLS
 * (e.g. token validation for compiled apps). Keep this file server-only.
 */

import "server-only";

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let serviceSupabaseInstance: SupabaseClient | null = null

/**
 * Get or create the service role Supabase client
 * This uses lazy initialization to avoid build-time errors when env vars aren't available
 */
export function getServiceSupabase(): SupabaseClient {
  if (serviceSupabaseInstance) {
    return serviceSupabaseInstance
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  serviceSupabaseInstance = createClient(url, key)
  return serviceSupabaseInstance
}

// Export the function as default for backward compatibility
export default getServiceSupabase
