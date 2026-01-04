/**
 * Resume Chat API Route
 * 
 * Note: This route is deprecated. Validation is now handled client-side.
 * Kept for backward compatibility but returns completion message immediately.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Return completion message since validation is now client-side
    const completionMessage = "Your profile data has been extracted. You can review and edit it in the form, then click 'Save Profile' when ready."
    
    return new Response(completionMessage, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
