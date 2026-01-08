/**
 * Create New Offer Draft API
 * 
 * POST /api/company/offer/draft/new - Always creates a NEW unpublished draft (offer_id = NULL)
 */

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST() {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    // Always create a fresh draft with offer_id = NULL (unpublished)
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
        salary_period: null,
        equity: false,
        equity_range: null,
      },
      work_config: {
        remote_mode: null,
        employment_type: null,
        availability: null,
      },
      startup_signals: {
        mission: null,
        stage: null,
        team_size: null,
        seniority: null,
      },
      skills: [],
      locations: [],
      responsibilities: [],
      capabilities: [],
      questions: [],
      perks: [],
      status: 'editing',
    };

    const { data: newDraft, error: createError } = await supabase
      .from('company_offer_draft')
      .insert(emptyDraft)
      .select()
      .single();

    if (createError || !newDraft) {
      console.error('Create draft error:', createError);
      return NextResponse.json(
        { error: 'Failed to create draft' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      draft: newDraft 
    });
  } catch (error: any) {
    console.error('Create draft error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create draft' },
      { status: 500 }
    );
  }
}
