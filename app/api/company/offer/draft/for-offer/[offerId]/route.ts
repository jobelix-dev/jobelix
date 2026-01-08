/**
 * Load or Create Draft for Editing Existing Offer
 * 
 * GET /api/company/offer/draft/for-offer/[offerId] 
 * - Checks if a draft exists for this offer
 * - If yes, returns it
 * - If no, creates one by copying from published offer
 */

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  context: { params: Promise<{ offerId: string }> }
) {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    const { offerId } = await context.params;

    // 1. Check if draft already exists for this offer
    const { data: existingDraft, error: draftError } = await supabase
      .from('company_offer_draft')
      .select('*')
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

    // 2. No draft exists - fetch published offer to copy from
    const { data: publishedOffer, error: offerError } = await supabase
      .from('company_offer')
      .select('*')
      .eq('id', offerId)
      .eq('company_id', user.id)
      .single();

    if (offerError || !publishedOffer) {
      console.error('Offer lookup error:', offerError);
      return NextResponse.json(
        { error: 'Offer not found or access denied' },
        { status: 404 }
      );
    }

    // 3. Fetch all related data for the published offer
    const [skillsRes, locationsRes, responsibilitiesRes, capabilitiesRes, questionsRes, perksRes] = await Promise.all([
      supabase.from('offer_skills').select('*').eq('offer_id', offerId),
      supabase.from('offer_locations').select('*').eq('offer_id', offerId),
      supabase.from('offer_responsibilities').select('*').eq('offer_id', offerId).order('order_index'),
      supabase.from('offer_capabilities').select('*').eq('offer_id', offerId),
      supabase.from('offer_questions').select('*').eq('offer_id', offerId).order('order_index'),
      supabase.from('offer_perks').select('*').eq('offer_id', offerId).order('order_index'),
    ]);

    // 4. Create draft from published offer data
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
        start_date: publishedOffer.start_date ? convertDateToObject(publishedOffer.start_date) : null,
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
        region: l.region,
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

    const { data: createdDraft, error: createError } = await supabase
      .from('company_offer_draft')
      .insert(newDraft)
      .select()
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
    console.error('Load/create draft error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load or create draft' },
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
