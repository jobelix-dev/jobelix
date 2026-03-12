/**
 * GitHub Import Endpoint
 *
 * Route: POST /api/student/import-github
 * - Validates input payload
 * - Loads connected GitHub repositories
 * - Merges repository signals into projects/skills via LLM
 * - Persists merged draft sections
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting';
import { getGitHubConnection, updateLastSynced } from '@/lib/server/github/oauth';
import { fetchGitHubRepos, transformReposForLLM } from '@/lib/server/github/api';
import OpenAI from 'openai';
import { enforceSameOrigin } from '@/lib/server/csrf';
import {
  createGitHubImportProgressUpdater,
  filterAndSortSignificantRepos,
  importRequestSchema,
  mergeGitHubData,
} from '@/lib/server/github/import';
import { API_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies';

export const runtime = 'nodejs';
export const maxDuration = 60;

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not configured');
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: 'https://api.mistral.ai/v1',
    });
  }
  return openaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;

    const { user, supabase } = auth;
    const updateProgress = createGitHubImportProgressUpdater(user.id);
    const rateLimitConfig = API_RATE_LIMIT_POLICIES.githubImport;

    updateProgress({
      step: 'Connecting to GitHub',
      reposProcessed: 0,
      reposTotal: 0,
      batchRepos: [],
    });

    const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig);
    if (rateLimitResult.error) return rateLimitResult.error;
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(rateLimitConfig, rateLimitResult.data);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsedBody = importRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid import payload' }, { status: 400 });
    }

    const currentProjects = parsedBody.data.current_projects;
    const currentSkills = parsedBody.data.current_skills;

    const connection = await getGitHubConnection(user.id);
    if (!connection) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    const BATCH_SIZE = 5;

    updateProgress({
      step: 'Fetching repositories',
      reposProcessed: 0,
      reposTotal: 0,
      batchRepos: [],
    });

    const repos = await fetchGitHubRepos(connection.access_token, false, 50);

    updateProgress({
      step: 'Preparing analysis',
      reposProcessed: 0,
      reposTotal: repos.length,
      batchRepos: [],
    });

    const transformedRepos = await transformReposForLLM(connection.access_token, repos, true);
    if (transformedRepos.length === 0) {
      return NextResponse.json({
        success: true,
        projects: currentProjects,
        skills: currentSkills,
        message: 'No repositories found to import',
      });
    }

    const sortedRepos = filterAndSortSignificantRepos(transformedRepos);

    // Send all repo names upfront so the UI can render the full chip list immediately.
    // Subsequent onBatchProgress calls pass empty batchRepos to preserve this list.
    updateProgress({
      step: 'Analyzing repositories',
      reposProcessed: 0,
      reposTotal: sortedRepos.length,
      batchRepos: sortedRepos.map((r) => r.name || 'Repository'),
    });

    const merged = await mergeGitHubData({
      openai: getOpenAI(),
      repos: sortedRepos,
      currentProjects,
      currentSkills,
      batchSize: BATCH_SIZE,
      onBatchProgress: (reposProcessed, reposTotal) => {
        updateProgress({
          step: 'Analyzing repositories',
          reposProcessed,
          reposTotal,
          batchRepos: [], // empty = preserve the full repo list sent above
        });
      },
    });

    updateProgress({
      step: 'Saving imported data',
      reposProcessed: sortedRepos.length,
      reposTotal: sortedRepos.length,
      batchRepos: [],
    });

    const { error: updateError } = await supabase
      .from('student_profile_draft')
      .update({
        projects: merged.projects,
        skills: merged.skills,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', user.id);

    if (updateError) {
      console.error('Failed to update draft with GitHub data:', updateError);
      return NextResponse.json({ error: 'Failed to save imported data' }, { status: 500 });
    }

    await updateLastSynced(user.id, 'github');
    await logApiCall(user.id, rateLimitConfig.endpoint);

    updateProgress({
      step: 'Import complete',
      reposProcessed: sortedRepos.length,
      reposTotal: sortedRepos.length,
      batchRepos: [],
      complete: true,
    });

    return NextResponse.json({
      success: true,
      projects: merged.projects,
      skills: merged.skills,
      repos_imported: sortedRepos.length,
      batches_processed: merged.batchesProcessed,
    });
  } catch (error: unknown) {
    console.error('GitHub import error:', error);
    return NextResponse.json({ error: 'Failed to import GitHub data' }, { status: 500 });
  }
}
