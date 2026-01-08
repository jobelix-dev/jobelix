/**
 * Company Offers API Route (List)
 * 
 * GET /api/company/offer - List all published offers + unpublished drafts for authenticated company
 */

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

// GET - List all published offers AND unpublished drafts for the authenticated company
export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    // Fetch published offers
    const { data: publishedOffers, error: offersError } = await supabase
      .from('company_offer')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });

    if (offersError) {
      return NextResponse.json(
        { error: offersError.message },
        { status: 500 }
      );
    }

    // Fetch unpublished drafts (offer_id IS NULL)
    const { data: unpublishedDrafts, error: draftsError } = await supabase
      .from('company_offer_draft')
      .select('*')
      .eq('company_id', user.id)
      .is('offer_id', null)
      .order('created_at', { ascending: false });

    if (draftsError) {
      return NextResponse.json(
        { error: draftsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      publishedOffers: publishedOffers || [],
      unpublishedDrafts: unpublishedDrafts || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}
