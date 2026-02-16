/**
 * Company Offer Draft By ID API Routes
 *
 * GET /api/company/offer/draft/[id]    - Get specific draft
 * PUT /api/company/offer/draft/[id]    - Update draft (auto-save)
 * DELETE /api/company/offer/draft/[id] - Delete draft
 *
 * Beginner mental model:
 * - A "draft" is private to the company that owns it.
 * - We authenticate the request first.
 * - Then we always filter by BOTH:
 *   - the draft id (which draft)
 *   - company_id = user.id (who owns it)
 *
 * Even if someone guesses another draftId, the company_id filter blocks access.
 * (And your database RLS should also enforce this.)
 */

import "server-only";

import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { enforceSameOrigin } from '@/lib/server/csrf';

/** UUID validation regex */
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * SECURITY: Whitelist of allowed fields for draft updates.
 * This prevents mass assignment attacks where a malicious client
 * could attempt to set arbitrary database columns.
 */
const ALLOWED_DRAFT_FIELDS = [
  'basic_info',
  'compensation',
  'work_config',
  'startup_signals',
  'skills',
  'locations',
  'responsibilities',
  'capabilities',
  'questions',
  'perks',
  'seniority',
  'status',
] as const;

/**
 * GET - Retrieve a specific draft by ID
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    /**
     * 1) Authenticate (server-side).
     * authenticateRequest() should return:
     * - user: the logged-in user (company)
     * - supabase: a Supabase client tied to that user's session (cookies)
     */
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    /**
     * 2) Read the draft id from the URL params.
     * Note: params are usually not a Promise, but awaiting is OK if your setup uses it.
     */
    const { id: draftId } = await context.params;

    // Validate draftId is a valid UUID
    if (!draftId || !uuidRegex.test(draftId)) {
      return new Response(JSON.stringify({ error: 'Invalid ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    /**
     * 3) Fetch the draft.
     *
     * 🔐 Avoid select('*') to not fetch fields you don't need.
     * It’s safer and faster.
     *
     * ⚠️ Use maybeSingle() so "not found" is not treated like a server error.
     */
    const { data: draft, error: fetchError } = await supabase
      .from('company_offer_draft')
      .select('id, company_id, offer_id, basic_info, compensation, work_config, startup_signals, skills, locations, responsibilities, capabilities, questions, perks, seniority, status, created_at, updated_at')
      .eq('id', draftId)
      .eq('company_id', user.id) // RLS check
      .maybeSingle();

    if (fetchError || !draft) {
      // We do NOT leak internal error details to the client; just return 404.
      console.error('Fetch draft error:', fetchError);
      return new Response('Draft not found', { status: 404 });
    }

    return Response.json({ draft });
  } catch {
    /**
     * 🔐 SECURITY:
     * Don't send raw error.message to the client (can leak internals).
     */
    console.error('Get draft error');
    return new Response(JSON.stringify({ error: 'Failed to get draft' }), { // 🔐
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PUT - Update draft fields (auto-save)
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = enforceSameOrigin(req);
    if (csrfError) return csrfError;

    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    const { id: draftId } = await context.params;

    // Validate draftId is a valid UUID
    if (!draftId || !uuidRegex.test(draftId)) {
      return new Response(JSON.stringify({ error: 'Invalid ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    /**
     * Updates are sent by the frontend (auto-save).
     * Beginner note:
     * - Always treat updates as untrusted input.
     * - Your database schema + RLS are the real enforcement layer.
     */
    const updates = await req.json();
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    /**
     * SECURITY FIX: Sanitize updates to only allow whitelisted fields.
     * This prevents mass assignment attacks where a malicious client
     * could attempt to set arbitrary database columns.
     */
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates || {}).filter(
        ([key]) => ALLOWED_DRAFT_FIELDS.includes(key as typeof ALLOWED_DRAFT_FIELDS[number])
      )
    );

    /**
     * 🔐 SECURITY:
     * Don't log full `updates` objects in production.
     * Drafts may contain sensitive company info and logs can leak.
     */
    console.log('Updating draft:', draftId); // 🔐 (removed logging `updates`)

    // Update the draft with new data
    const { data: draft, error: updateError } = await supabase
      .from('company_offer_draft')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('company_id', user.id) // RLS check
      .select('id, company_id, offer_id, basic_info, compensation, work_config, startup_signals, skills, locations, responsibilities, capabilities, questions, perks, seniority, status, created_at, updated_at')
      .maybeSingle();
    
    if (updateError) {
      /**
       * 🔐 SECURITY:
       * - Do NOT return updateError.message or the full error object to the client.
       * - It can reveal table/column names and RLS details.
       */
      return new Response(JSON.stringify({
        error: 'Failed to update draft' // 🔐
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!draft) {
      // Not found or not authorized (same external behavior)
      console.error('No draft returned after update');
      return new Response(JSON.stringify({ error: 'Draft not found or not authorized' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return Response.json({
      success: true,
      draft,
    });
  } catch {
    /**
     * 🔐 SECURITY:
     * Don't leak raw error.message to the client.
     */
    return new Response(JSON.stringify({ error: 'Failed to update draft' }), { // 🔐
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * DELETE - Delete a draft
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = enforceSameOrigin(req);
    if (csrfError) return csrfError;

    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    const { id: draftId } = await context.params;

    // Validate draftId is a valid UUID
    if (!draftId || !uuidRegex.test(draftId)) {
      return new Response(JSON.stringify({ error: 'Invalid ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    /**
     * Delete the draft.
     * We filter by company_id so a company cannot delete another company's draft.
     */
    const { error: deleteError } = await supabase
      .from('company_offer_draft')
      .delete()
      .eq('id', draftId)
      .eq('company_id', user.id); // RLS check

    if (deleteError) {
      return new Response('Failed to delete draft', { status: 500 });
    }

    return Response.json({ success: true });
  } catch {
    /**
     * 🔐 SECURITY:
     * Don't leak raw error.message to the client.
     */
    return new Response(JSON.stringify({ error: 'Failed to delete draft' }), { // 🔐
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
