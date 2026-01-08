/**
 * POST /api/company/offer/publish
 * 
 * Publishes an offer draft by calling the publish_offer_draft RPC function.
 * This atomically copies draft data to all normalized company_offer tables.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get draft_id from request body
    const { draft_id } = await request.json();
    if (!draft_id) {
      return NextResponse.json(
        { error: 'draft_id is required' },
        { status: 400 }
      );
    }

    console.log('Publishing draft:', draft_id);

    // Call the RPC function to publish the draft
    const { data: offer_id, error: publishError } = await supabase
      .rpc('publish_offer_draft', { p_draft_id: draft_id });

    if (publishError) {
      console.error('Publish error:', publishError);
      return NextResponse.json(
        { error: publishError.message || 'Failed to publish offer' },
        { status: 500 }
      );
    }

    console.log('Successfully published offer:', offer_id);

    // Return the published offer ID
    return NextResponse.json({
      success: true,
      offer_id,
      message: 'Offer published successfully'
    });

  } catch (error: any) {
    console.error('Publish route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
