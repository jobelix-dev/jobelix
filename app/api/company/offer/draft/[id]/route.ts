/**
 * Company Offer Draft By ID API Routes
 * 
 * GET /api/company/offer/draft/[id] - Get specific draft
 * PUT /api/company/offer/draft/[id] - Update draft (auto-save)
 * DELETE /api/company/offer/draft/[id] - Delete draft
 */

import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

/**
 * GET - Retrieve a specific draft by ID
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    const { id: draftId } = await context.params;

    const { data: draft, error: fetchError } = await supabase
      .from('company_offer_draft')
      .select('*')
      .eq('id', draftId)
      .eq('company_id', user.id) // RLS check
      .single();

    if (fetchError || !draft) {
      console.error('Fetch draft error:', fetchError);
      return new Response('Draft not found', { status: 404 });
    }

    return Response.json({ draft });
  } catch (error: any) {
    console.error('Get draft error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
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
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    const { id: draftId } = await context.params;

    const updates = await req.json();

    console.log('Updating draft:', draftId, 'with data:', updates);

    // Update the draft with new data
    const { data: draft, error: updateError } = await supabase
      .from('company_offer_draft')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('company_id', user.id) // RLS check
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ 
        error: updateError.message,
        details: updateError 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!draft) {
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
  } catch (error: any) {
    console.error('Update draft error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
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
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    const { id: draftId } = await context.params;

    const { error: deleteError } = await supabase
      .from('company_offer_draft')
      .delete()
      .eq('id', draftId)
      .eq('company_id', user.id); // RLS check

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response('Failed to delete draft', { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Delete draft error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
