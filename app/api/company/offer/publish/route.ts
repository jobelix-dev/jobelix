/**
 * POST /api/company/offer/publish
 *
 * What this route does (beginner-friendly):
 * - A company has an "offer draft" they edited.
 * - When they click "Publish", we call a database RPC:
 *   publish_offer_draft(p_draft_id)
 * - That RPC copies the draft into the published offer tables (atomically).
 *
 * Security model:
 * - We authenticate the user using cookies (supabase.auth.getUser()).
 * - The RPC must enforce ownership in the database (RLS / SECURITY DEFINER checks),
 *   so a company cannot publish another company's draft.
 */

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    /**
     * 1) Verify authentication
     */
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;

    const { user, supabase } = auth;

    /**
     * 2) Read draft_id from request body
     * The frontend tells us WHICH draft to publish.
     */
    const { draft_id } = await request.json();
    if (!draft_id) {
      return NextResponse.json(
        { error: 'draft_id is required' },
        { status: 400 }
      );
    }

    /**
     * 🔐 SECURITY:
     * Avoid logging raw identifiers (draft_id / offer_id) in production logs.
     * Logs can be stored and accessed by others.
     */

    console.log('Publishing draft request received'); // 🔐

    /**
     * 4) Call the RPC function to publish the draft
     *
     * Important:
     * - The RPC should verify that this draft belongs to the authenticated user.
     * - This is the real security gate (server + DB).
     */
    const { data: offer_id, error: publishError } = await supabase
      .rpc('publish_offer_draft', { p_draft_id: draft_id });

    if (publishError) {
      /**
       * 🔐 SECURITY:
       * - Do NOT return publishError.message to the client.
       * - It may reveal internal DB details (table names, policy hints, etc.).
       */
      console.error('Publish error:', publishError);
      return NextResponse.json(
        { error: 'Failed to publish offer' }, // 🔐
        { status: 500 }
      );
    }

    console.log('Publish successful'); // 🔐 (no offer_id in logs)

    /**
     * 5) Return the published offer ID
     * The frontend can redirect to /offer/[offer_id]
     */
    return NextResponse.json({
      success: true,
      offer_id,
      message: 'Offer published successfully'
    });

  } catch (error: any) {
    /**
     * 🔐 SECURITY:
     * - Do NOT return raw error.message to the client.
     * - Log it server-side, return a generic error.
     */
    console.error('Publish route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, // 🔐
      { status: 500 }
    );
  }
}
