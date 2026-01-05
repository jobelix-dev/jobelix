/**
 * Offer Delete API Route
 * 
 * Deletes specific job offer by ID.
 * Route: DELETE /api/company/offers/[id]
 * Called by: OffersList delete button
 * Security: Companies can only delete their own offers
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    const { id } = await params

    const { error } = await supabase
      .from('company_offer')
      .delete()
      .eq('id', id)
      .eq('company_id', user.id) // Ensure user owns this offer

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete offer' },
      { status: 500 }
    )
  }
}
