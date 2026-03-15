/**
 * GET /api/student/import-github/progress
 *
 * Returns the current GitHub import progress for the authenticated user.
 * The frontend polls this endpoint every 500 ms while import is running.
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { getGitHubImportProgress } from '@/lib/server/github/progress';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;

  const progress = await getGitHubImportProgress(auth.user.id);
  return NextResponse.json(progress);
}
