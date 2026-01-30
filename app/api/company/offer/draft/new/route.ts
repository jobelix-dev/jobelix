/**
 * Create New Offer Draft API
 *
 * POST /api/company/offer/draft/new
 *
 * What this route does (beginner-friendly):
 * - A logged-in company clicks "Create new offer"
 * - We create a brand new DRAFT row in company_offer_draft
 * - This draft is NOT linked to any published offer yet:
 *   offer_id = NULL means "unpublished draft"
 *
 * Security model:
 * - authenticateRequest() gives us the logged-in user and a Supabase client
 * - We set company_id = user.id on the server (client can’t spoof it)
 * - RLS should also ensure companies only access their own drafts
 */
import "server-only";

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function POST() {
  try {
    /**
     * 1) Authenticate the request
     * If not logged in, authenticateRequest() returns an error response.
     */
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    /**
     * 2) Build the "empty" draft object
     *
     * Beginner note:
     * - This draft is like a saved form that starts blank.
     * - The frontend can then auto-save as the user types.
     */

    const emptyDraft = {
      company_id: user.id,
      offer_id: null, // Explicitly NULL - this is an unpublished draft
      basic_info: {
        position_name: '',
        description: null,
      },
      compensation: {
        salary_min: null,
        salary_max: null,
        salary_currency: 'EUR',
        salary_period: 'year',
        equity: false,
        equity_range: null,
      },
      work_config: {
        remote_mode: null,
        employment_type: null,
        availability: null,
      },
      seniority: null,
      skills: [],
      locations: [],
      responsibilities: [],
      capabilities: [],
      questions: [],
      perks: [],
      status: 'editing',
    };

    /**
     * 3) Insert the draft
     *
     * 🔐 SECURITY:
     * - Avoid `.select()` with no column list, because it returns ALL columns.
     * - Return only what the frontend needs.
     */
    const { data: newDraft, error: createError } = await supabase
      .from('company_offer_draft')
      .insert(emptyDraft)
      .select('id, company_id, offer_id, basic_info, compensation, work_config, seniority, skills, locations, responsibilities, capabilities, questions, perks, status, created_at, updated_at') // 🔐
      .single();

    if (createError || !newDraft) {
      console.error('Create draft error:', createError);
      return NextResponse.json(
        { error: 'Failed to create draft' },
        { status: 500 }
      );
    }

    /**
     * 4) Return the created draft
     * The frontend can now redirect to the edit page for this draft.
     */
    return NextResponse.json({ 
      success: true,
      draft: newDraft 
    });
  } catch (error: any) {
    /**
     * 🔐 SECURITY:
     * - Do NOT return error.message to the client (can leak internals).
     * - Log the real error on the server; return a generic message to the client.
     */
    console.error('Create offer draft error:', error);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    );
  }
}
