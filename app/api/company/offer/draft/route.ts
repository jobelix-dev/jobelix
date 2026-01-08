/**
 * Company Offer Draft API Routes
 * 
 * This file is DEPRECATED - use specific endpoints:
 * - POST /api/company/offer/draft/new - Create new draft
 * - GET /api/company/offer/draft/for-offer/[offerId] - Load/create draft for editing existing offer
 * - GET /api/company/offer/draft/[id] - Load draft by ID
 * - PUT /api/company/offer/draft/[id] - Update draft by ID
 * - DELETE /api/company/offer/draft/[id] - Delete draft by ID
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/company/offer/draft/new or /api/company/offer/draft/for-offer/[offerId]' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/company/offer/draft/new' },
    { status: 410 }
  );
}
