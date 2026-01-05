/**
 * Resume Chat API Route
 * 
 * Note: This route is deprecated. Validation is now handled client-side.
 * Kept for backward compatibility but returns completion message immediately.
 */

import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

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
