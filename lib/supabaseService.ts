/**
 * Server-side Supabase service client
 *
 * Use the service role key for server-only operations that need to bypass RLS
 * (e.g. token validation for compiled apps). Keep this file server-only.
 */
import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // We intentionally don't throw here to allow local type checks, but runtime
  // usage will fail fast if env is missing.
}

export const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default serviceSupabase
