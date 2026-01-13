/**
 * Supabase Client-Side Instance
 * 
 * Creates browser-based Supabase client for client components.
 * Used by: Client components that need direct database access.
 * Handles authentication state and real-time subscriptions on the frontend.
 * Use createClient() in client components, not server components.
 */

// import { createClient } from "@supabase/supabase-js";

// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}