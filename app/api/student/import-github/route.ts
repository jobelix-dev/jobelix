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
import { getGitHubConnection, updateLastSynced } from '@/lib/server/githubOAuth';
import { fetchGitHubRepos, transformReposForLLM } from '@/lib/server/githubService';
import OpenAI from 'openai';
import { enforceSameOrigin } from '@/lib/server/csrf';
import {
  createGitHubImportProgressUpdater,
  filterAndSortSignificantRepos,
  importRequestSchema,
  mergeGitHubData,
} from '@/lib/server/githubImportService';
import { API_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies';

export const runtime = 'nodejs';
export const maxDuration = 60;

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    const auth = await authenticateRequest();
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

    const BATCH_SIZE = 10;

    updateProgress({
      step: 'Fetching repositories',
      reposProcessed: 0,
      reposTotal: 0,
      batchRepos: [],
    });

    const repos = await fetchGitHubRepos(connection.access_token, false, 50);
    if (repos.length > 0) {
      updateProgress({
        step: 'Collecting repositories',
        reposProcessed: 0,
        reposTotal: repos.length,
        batchRepos: repos.slice(0, BATCH_SIZE).map((repo) => repo.name || repo.full_name || 'Repository'),
      });
    }

    updateProgress({
      step: 'Preparing repository analysis',
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

    const merged = await mergeGitHubData({
      openai: getOpenAI(),
      repos: sortedRepos,
      currentProjects,
      currentSkills,
      batchSize: BATCH_SIZE,
      onBatchProgress: (reposProcessed, reposTotal, batchRepos) => {
        updateProgress({
          step: 'Parsing repositories',
          reposProcessed,
          reposTotal,
          batchRepos,
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
