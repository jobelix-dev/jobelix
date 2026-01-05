/**
 * Offers API Route (List & Create)
 * 
 * Manages job offers for companies.
 * Routes: GET /api/company/offers (list all), POST /api/company/offers (create new)
 * Called by: OffersManager for offer management
 * GET: Returns all offers for authenticated company
 * POST: Creates new offer with title and description
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'

// GET - List all offers for the authenticated company
export async function GET() {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    const { data, error } = await supabase
      .from('company_offer')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ offers: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch offers' },
      { status: 500 }
    )
  }
}

// POST - Create a new offer
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest()
    if (auth.error) return auth.error
    
    const { user, supabase } = auth

    const { position_name, description } = await request.json()

    if (!position_name?.trim()) {
      return NextResponse.json(
        { error: 'Position name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('company_offer')
      .insert({
        company_id: user.id,
        position_name,
        description: description || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, offer: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create offer' },
      { status: 500 }
    )
  }
}
