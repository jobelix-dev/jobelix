/**
 * Company Offer By ID API Route
 *
 * DELETE /api/company/offer/[id]
 *
 * What this route does (beginner-friendly):
 * - A logged-in company wants to delete ONE published offer by its id
 * - We first authenticate the request (server-side)
 * - Then we delete the offer from the database
 *
 * Important security idea:
 * - The client is NOT trusted.
 * - We use the authenticated user's id (user.id) on the server.
 * - RLS (Row Level Security) should also protect the table so a company
 *   cannot delete another company's offers.
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { enforceSameOrigin } from '@/lib/server/csrf';

/** UUID validation regex */
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// DELETE - Delete a published offer
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = enforceSameOrigin(req);
    if (csrfError) return csrfError;

    /**
     * 1) Authenticate the request (server-side)
     *
     * authenticateRequest() should:
     * - Read cookies / session
     * - Return the logged-in user + a Supabase client tied to that user
     *
     * If not authenticated, it returns an HTTP error response.
     */
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    /**
     * 2) Read offer id from the URL
     *
     * Note:
     * - In Next.js route handlers, params are usually an object, not a Promise.
     * - But if your setup uses a Promise, awaiting is fine.
     */
    const { id: offerId } = await context.params;

    // Validate offerId is a valid UUID
    if (!offerId || !uuidRegex.test(offerId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    /**
     * 3) Delete the offer
     *
     * SECURITY:
     * - We filter by both:
     *   - offer id (which offer)
     *   - company_id = user.id (who is allowed to delete)
     *
     * Even if someone guesses another offerId, this extra filter prevents deletion.
     * (And RLS should also enforce ownership in the database.)
     */
    const { error } = await supabase
      .from('company_offer')
      .delete()
      .eq('id', offerId)
      .eq('company_id', user.id);

    if (error) {
      /**
       * 🔐 SECURITY:
       * - Do NOT return error.message to the client.
       * - It can leak internal table details / RLS policy hints.
       * - Log the full error on the server, return a generic message to the client.
       */
      return NextResponse.json(
        { error: 'Failed to delete offer' }, // 🔐
        { status: 500 }
      );
    }

    /**
     * 4) Success
     *
     * Beginner note:
     * - If you have related rows (offer_skills, offer_locations, applications),
     *   make sure the database handles cleanup (ON DELETE CASCADE) or you do it explicitly.
     */
    return NextResponse.json({ success: true });
  } catch {
    /**
     * 🔐 SECURITY:
     * - Never expose raw server error messages to clients.
     */
    return NextResponse.json(
      { error: 'Failed to delete offer' }, // 🔐
      { status: 500 }
    );
  }
}
