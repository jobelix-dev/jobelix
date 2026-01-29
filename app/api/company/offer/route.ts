/**
 * Company Offers API Route (List)
 *
 * GET /api/company/offer
 *
 * What this route does (beginner-friendly):
 * - A company opens their dashboard.
 * - We return TWO lists:
 *   1) publishedOffers      -> rows from company_offer
 *   2) unpublishedDrafts    -> rows from company_offer_draft where offer_id IS NULL
 *
 * Security model:
 * - authenticateRequest() verifies the user is logged in (cookie/session).
 * - We filter by company_id = user.id so a company only sees their own data.
 * - RLS should also protect these tables.
 */

import "server-only";

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

// GET - List all published offers AND unpublished drafts for the authenticated company
export async function GET() {
  try {
    /**
     * 1) Authenticate (server-side)
     * If not logged in, authenticateRequest() returns an error Response.
     */
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    /**
     * 2) Fetch published offers
     *
     * 🔐 Avoid select('*') because it fetches ALL columns.
     * Only select what the dashboard needs.
     *
     * (Replace/adjust the columns to match your schema.)
     */
    const { data: publishedOffers, error: offersError } = await supabase
      .from('company_offer')
      .select('id, company_id, created_at, updated_at, position_name, description, remote_mode, employment_type, salary_min, salary_max, salary_currency, stage, status') // 🔐
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });

    if (offersError) {
      /**
       * 🔐 SECURITY:
       * Do NOT return offersError.message to the client (can leak internals).
       * Log it server-side, return a generic error to the client.
       */
      console.error('Fetch published offers error:', offersError); // 🔐
      return NextResponse.json(
        { error: 'Failed to fetch offers' }, // 🔐
        { status: 500 }
      );
    }

    /**
     * 3) Fetch unpublished drafts (offer_id IS NULL)
     *
     * 🔐 Avoid select('*') here too.
     * Drafts can contain internal/private fields  -  only send what the UI needs.
     */
    const { data: unpublishedDrafts, error: draftsError } = await supabase
      .from('company_offer_draft')
      .select('id, company_id, offer_id, created_at, updated_at, basic_info, status') // 🔐
      .eq('company_id', user.id)
      .is('offer_id', null)
      .order('created_at', { ascending: false });

    if (draftsError) {
      /**
       * 🔐 SECURITY:
       * Do NOT return draftsError.message to the client.
       */
      console.error('Fetch unpublished drafts error:', draftsError); // 🔐
      return NextResponse.json(
        { error: 'Failed to fetch drafts' }, // 🔐
        { status: 500 }
      );
    }

    /**
     * 4) Return both lists
     * We always return arrays to keep frontend simple.
     */
    return NextResponse.json({
      publishedOffers: publishedOffers || [],
      unpublishedDrafts: unpublishedDrafts || []
    });
  } catch (error: any) {
    /**
     * 🔐 SECURITY:
     * Don't leak raw error.message to the client.
     */
    console.error('Company offers route error:', error); // 🔐
    return NextResponse.json(
      { error: 'Failed to fetch offers' }, // 🔐
      { status: 500 }
    );
  }
}
