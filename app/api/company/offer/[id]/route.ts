/**
 * Company Offer By ID API Route
 * 
 * DELETE /api/company/offer/[id] - Delete a published offer
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

// DELETE - Delete a published offer
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    const { id: offerId } = await context.params;

    // Delete the offer (RLS ensures only company's own offers can be deleted)
    const { error } = await supabase
      .from('company_offer')
      .delete()
      .eq('id', offerId)
      .eq('company_id', user.id);

    if (error) {
      console.error('Delete offer error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete offer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete offer' },
      { status: 500 }
    );
  }
}
