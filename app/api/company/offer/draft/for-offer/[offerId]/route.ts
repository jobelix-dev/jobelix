/**
 * Load or Create Draft for Editing Existing Offer
 *
 * GET /api/company/offer/draft/for-offer/[offerId]
 *
 * What this route does (beginner-friendly):
 * - A company wants to edit an already published offer.
 * - Editing happens inside a DRAFT table (company_offer_draft).
 *
 * Steps:
 * 1) Check if a draft already exists for this published offer.
 * 2) If it exists: return it.
 * 3) If it does not exist:
 *    - Fetch the published offer (company_offer)
 *    - Fetch related lists (skills, locations, etc.)
 *    - Build a draft JSON object
 *    - Insert the draft row and return it
 *
 * Security model:
 * - authenticateRequest() gives us the logged-in user + a supabase client.
 * - We always filter by company_id = user.id so you can’t access other companies’ data.
 * - RLS should also enforce ownership in the database.
 */

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  context: { params: Promise<{ offerId: string }> }
) {
  try {
    /**
     * 1) Authenticate the request
     * If not logged in, authenticateRequest() returns an error Response.
     */
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    const { offerId } = await context.params;

    /**
     * 2) Check if a draft already exists
     *
     * 🔐 Avoid select('*') to not fetch unnecessary columns.
     * Fetch only the fields you really need to return to the editor.
     * (Replace the list with your real draft columns.)
     */
      const { data: existingDraft, error: draftError } = await supabase
        .from('company_offer_draft')
        .select('id, company_id, offer_id, basic_info, compensation, work_config, startup_signals, skills, locations, responsibilities, capabilities, questions, perks, status, created_at, updated_at') // 🔐
        .eq('company_id', user.id)
        .eq('offer_id', offerId)
        .maybeSingle();


    if (draftError) {
      console.error('Draft lookup error:', draftError);
      return NextResponse.json(
        { error: 'Failed to check for existing draft' },
        { status: 500 }
      );
    }

    // If draft exists, return it
    if (existingDraft) {
      return NextResponse.json({ draft: existingDraft });
    }

    /**
     * 3) No draft exists → fetch the published offer to copy from
     *
     * 🔐 Avoid select('*') here too.
     * Only select fields you actually use when building newDraft.
     *
     * ⚠️ maybeSingle() avoids "no rows found" being treated like a hard error.
     */
    const { data: publishedOffer, error: offerError } = await supabase
      .from('company_offer')
      .select('id, company_id, position_name, description, salary_min, salary_max, salary_currency, salary_period, equity, equity_range, remote_mode, employment_type, availability, mission, stage, team_size, seniority') // 🔐
      .eq('id', offerId)
      .eq('company_id', user.id)
      .maybeSingle();

    if (offerError || !publishedOffer) {
      console.error('Offer lookup error:', offerError);
      return NextResponse.json(
        { error: 'Offer not found or access denied' },
        { status: 404 }
      );
    }

        /**
     * 4) Fetch related tables (skills, locations, etc.)
     *
     * Beginner note:
     * - These are separate tables linked by offer_id
     * - We fetch them in parallel with Promise.all for speed
     *
     * 🔐 IMPORTANT:
     * - We must also check the `.error` of each query
     * - Otherwise a failure could silently return incomplete data
     */

    const [
      skillsRes,
      locationsRes,
      responsibilitiesRes,
      capabilitiesRes,
      questionsRes,
      perksRes
    ] = await Promise.all([
      supabase.from('offer_skills').select('skill_slug, skill_text, importance, level, years').eq('offer_id', offerId), // 🔐
      supabase.from('offer_locations').select('city, country').eq('offer_id', offerId), // 🔐
      supabase.from('offer_responsibilities').select('text, order_index').eq('offer_id', offerId).order('order_index'), // 🔐
      supabase.from('offer_capabilities').select('text, importance').eq('offer_id', offerId), // 🔐
      supabase.from('offer_questions').select('question, order_index').eq('offer_id', offerId).order('order_index'), // 🔐
      supabase.from('offer_perks').select('text, order_index').eq('offer_id', offerId).order('order_index'), // 🔐
    ]);

    // 🔐 If any related query failed, stop (don’t create a partial draft)
    if (skillsRes.error || locationsRes.error || responsibilitiesRes.error || capabilitiesRes.error || questionsRes.error || perksRes.error) { // 🔐
      console.error('Related data fetch error:', { // 🔐
        skills: skillsRes.error,
        locations: locationsRes.error,
        responsibilities: responsibilitiesRes.error,
        capabilities: capabilitiesRes.error,
        questions: questionsRes.error,
        perks: perksRes.error,
      }); // 🔐

      return NextResponse.json(
        { error: 'Failed to load offer details for draft' }, // 🔐
        { status: 500 }
      );
    }

    /**
     * 5) Build the draft object from the published offer + related tables
     *
     * Beginner note:
     * - We copy the published offer into a JSON structure for editing.
     * - This is why drafts can evolve without changing the published offer yet.
     */
    const newDraft = {
      company_id: user.id,
      offer_id: offerId, // Link to the published offer
      basic_info: {
        position_name: publishedOffer.position_name || '',
        description: publishedOffer.description,
      },
      compensation: {
        salary_min: publishedOffer.salary_min,
        salary_max: publishedOffer.salary_max,
        salary_currency: publishedOffer.salary_currency || 'EUR',
        salary_period: publishedOffer.salary_period,
        equity: publishedOffer.equity || false,
        equity_range: publishedOffer.equity_range,
      },
      work_config: {
        remote_mode: publishedOffer.remote_mode,
        employment_type: publishedOffer.employment_type,
        availability: publishedOffer.availability,
      },
      startup_signals: {
        mission: publishedOffer.mission,
        stage: publishedOffer.stage,
        team_size: publishedOffer.team_size,
        seniority: publishedOffer.seniority,
      },
      skills: (skillsRes.data || []).map(s => ({
        skill_slug: s.skill_slug,
        skill_text: s.skill_text,
        importance: s.importance,
        level: s.level,
        years: s.years,
      })),
      locations: (locationsRes.data || []).map(l => ({
        city: l.city,
        country: l.country,
      })),
      responsibilities: (responsibilitiesRes.data || []).map(r => ({
        text: r.text,
      })),
      capabilities: (capabilitiesRes.data || []).map(c => ({
        text: c.text,
        importance: c.importance,
      })),
      questions: (questionsRes.data || []).map(q => ({
        question: q.question,
      })),
      perks: (perksRes.data || []).map(p => ({
        text: p.text,
      })),
      status: 'editing',
    };

    /**
     * 6) Insert the new draft and return it
     *
     * 🔐 Avoid select() without fields; select only needed columns.
     */
    const { data: createdDraft, error: createError } = await supabase
      .from('company_offer_draft')
      .insert(newDraft)
      .select('id, company_id, offer_id, basic_info, compensation, work_config, startup_signals, skills, locations, responsibilities, capabilities, questions, perks, status, created_at, updated_at') // 🔐
      .single();

    if (createError || !createdDraft) {
      console.error('Create draft from offer error:', createError);
      return NextResponse.json(
        { error: 'Failed to create draft from offer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft: createdDraft });
  } catch (error: any) {
    /**
     * 🔐 SECURITY:
     * - Don’t return error.message to the client (leaks internals).
     * - Log internally, return a generic error.
     */
    console.error('Load/create draft error:', error);
    return NextResponse.json(
      { error: 'Failed to load or create draft' }, // 🔐
      { status: 500 }
    );
  }
}

// Helper to convert SQL date to {year, month} object
function convertDateToObject(sqlDate: string): { year: number; month: number | null } {
  const date = new Date(sqlDate);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // JavaScript months are 0-indexed
  };
}