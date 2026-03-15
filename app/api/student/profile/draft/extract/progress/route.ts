/**
 * GET /api/student/profile/draft/extract/progress
 *
 * Returns the current extraction progress for the authenticated user.
 * The frontend polls this endpoint every 500 ms while extraction is running.
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getExtractionProgress } from '@/lib/server/extractionProgress';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;

  const progress = await getExtractionProgress(auth.user.id);
  return NextResponse.json(progress);
}
