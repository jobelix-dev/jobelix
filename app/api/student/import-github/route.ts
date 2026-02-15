/**
 * GitHub Import Endpoint
 * 
 * Imports GitHub repositories and merges them with existing profile data.
 * Only updates Projects and Skills sections, preserves all other data.
 * 
 * Route: POST /api/student/import-github
 * Called by: useGitHubImport hook after GitHub OAuth connection
 */

import "server-only";

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { checkRateLimit, logApiCall, rateLimitExceededResponse } from '@/lib/server/rateLimiting';
import { getGitHubConnection, updateLastSynced } from '@/lib/server/githubOAuth';
import { fetchGitHubRepos, transformReposForLLM } from '@/lib/server/githubService';
import { setGitHubImportProgress } from '@/lib/server/githubImportProgress';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { enforceSameOrigin } from '@/lib/server/csrf';

export const runtime = 'nodejs';

// Vercel serverless config: allow longer execution for OpenAI + GitHub API calls
export const maxDuration = 60; // seconds

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null;
function getOpenAI() {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiInstance;
}

// Schema for GitHub import merge response
const GitHubMergeSchema = z.object({
  projects: z.array(z.object({
    project_name: z.string(),
    description: z.string().nullable(),
    link: z.string().nullable(),
  })),
  skills: z.array(z.object({
    skill_name: z.string(),
    skill_slug: z.string(),
  })),
});

const CurrentProjectSchema = z.object({
  project_name: z.string().max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  link: z.string().max(1000).nullable().optional(),
}).passthrough();

const CurrentSkillSchema = z.object({
  skill_name: z.string().max(200).optional(),
  skill_slug: z.string().max(200).optional(),
}).passthrough();

const importRequestSchema = z.object({
  current_projects: z.array(CurrentProjectSchema).max(300).optional().default([]),
  current_skills: z.array(CurrentSkillSchema).max(500).optional().default([]),
});

/**
 * POST handler for GitHub import
 * Expects: { current_projects, current_skills } in request body
 */
export async function POST(request: NextRequest) {
  try {
    const csrfError = enforceSameOrigin(request);
    if (csrfError) return csrfError;

    // Authenticate user
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    let lastBatchRepos: string[] = [];
    let lastReposTotal = 0;

    const updateProgress = (params: {
      step: string;
      reposProcessed: number;
      reposTotal: number;
      batchRepos: string[];
      complete?: boolean;
    }) => {
      if (params.batchRepos && params.batchRepos.length > 0) {
        lastBatchRepos = params.batchRepos;
      }
      if (params.reposTotal && params.reposTotal > 0) {
        lastReposTotal = params.reposTotal;
      }
      const effectiveTotal = params.reposTotal > 0 ? params.reposTotal : lastReposTotal;
      const progress = effectiveTotal > 0
        ? Math.round((params.reposProcessed / effectiveTotal) * 100)
        : 0;
      setGitHubImportProgress(user.id, {
        step: params.step,
        progress,
        reposProcessed: params.reposProcessed,
        reposTotal: effectiveTotal,
        batchRepos: lastBatchRepos,
        complete: params.complete,
      });
    };

    updateProgress({
      step: 'Connecting to GitHub',
      reposProcessed: 0,
      reposTotal: 0,
      batchRepos: [],
    });

    // Rate limiting: 3 imports per hour, 6 per day (this is expensive with OpenAI)
    const rateLimitResult = await checkRateLimit(user.id, {
      endpoint: 'github-import',
      hourlyLimit: 3,
      dailyLimit: 6,
    })

    if (rateLimitResult.error) return rateLimitResult.error
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(
        { endpoint: 'github-import', hourlyLimit: 3, dailyLimit: 6 },
        rateLimitResult.data
      )
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

    // Get GitHub connection
    const connection = await getGitHubConnection(user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 400 }
      );
    }

    const BATCH_SIZE = 10;

    // Fetch GitHub repositories with README excerpts for better descriptions
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
      batchRepos: repos.slice(0, BATCH_SIZE).map((repo: { name?: string; full_name?: string }) => repo.name || repo.full_name || 'Repository'),
    });
    }
    
    updateProgress({
      step: 'Preparing repository analysis',
      reposProcessed: 0,
      reposTotal: repos.length,
      batchRepos: [],
    });
    const transformedRepos = await transformReposForLLM(connection.access_token, repos, true); // Enable README fetching

    if (transformedRepos.length === 0) {
      return NextResponse.json({
        success: true,
        projects: currentProjects,
        skills: currentSkills,
        message: 'No repositories found to import'
      });
    }

    // Filter repos: Remove forks and very small repos (< 2 stars, no description)
    const significantRepos = transformedRepos.filter(repo => {
      // Keep if: not a fork, OR has stars, OR has a good description/README
      return !repo.is_fork || 
             (repo.stars && repo.stars > 0) || 
             repo.description || 
             repo.readme_summary;
    });

    // Sort by importance: stars, has README, recently updated
    const sortedRepos = significantRepos.sort((a, b) => {
      const scoreA = (a.stars || 0) * 10 + (a.readme_summary ? 5 : 0) + (a.description ? 2 : 0);
      const scoreB = (b.stars || 0) * 10 + (b.readme_summary ? 5 : 0) + (b.description ? 2 : 0);
      return scoreB - scoreA;
    });

    // Process in batches to avoid overwhelming the LLM
    let mergedProjects = [...currentProjects];
    let mergedSkills = [...currentSkills];
    const totalBatches = Math.ceil(sortedRepos.length / BATCH_SIZE);

    for (let i = 0; i < sortedRepos.length; i += BATCH_SIZE) {
      const batch = sortedRepos.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      updateProgress({
        step: 'Parsing repositories',
        reposProcessed: i,
        reposTotal: sortedRepos.length,
        batchRepos: batch.map((repo: { name?: string; full_name?: string }) => repo.name || repo.full_name || 'Repository'),
      });

      // Call OpenAI to merge this batch with current merged data
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a profile data merge expert. Your task is to intelligently merge GitHub repository data with existing profile data.

⚠️ CRITICAL: This is an ADDITIVE merge ONLY. You must PRESERVE ALL existing data and only ADD new items.

⚠️ IMPORTANT: ALL output text MUST be in English. If repository descriptions, README content, or any text is in another language, translate it to English.

This is batch ${batchNum} of ${totalBatches}. Process EVERY repository in this batch - do not skip any.

RULES FOR MERGING PROJECTS:

1. **Duplicate Detection:**
   - Compare project names case-insensitively
   - Detect similar names (e.g., "Portfolio Site" vs "portfolio-website")
   - Match by repository URL if available

2. **Merging Strategy - PRESERVE EXISTING:**
   - ✅ KEEP all existing projects exactly as they are
   - ✅ If a project already exists (by name or URL), DO NOT modify it
   - ✅ ADD EVERY new repository as a project (unless it's a duplicate)
   - ✅ Preserve ALL manually entered project data
   - ❌ NEVER remove or modify existing projects

3. **New Project Fields from GitHub:**
   - project_name: Use repository name (convert hyphens/underscores to spaces, capitalize properly) - translate to English if needed
   - description: Generate comprehensive, professional project descriptions using ALL available data:
     * Use README summary and repo description as foundation
     * Include project timeline: "Developed [created_at] - [pushed_at]" showing duration and recency
     * Analyze language_bytes to determine expertise levels: "Built with [primary_language] (primary) and [other_languages] - [X] lines of code total"
     * Use topics for categorization: Identify project type (web app, API, library, mobile app, data analysis, etc.)
     * Infer advanced skills from topics, languages, and README: frameworks (React, Django), tools (Docker, AWS), methodologies (TDD, CI/CD)
     * Focus on achievements, technologies used, and outcomes in resume-style language
     * Example: "Full-stack web application built with React and Node.js, featuring user authentication and real-time data visualization. Developed over 18 months with 15,000+ lines of code across 8 programming languages."
   - link: Use repository URL (url field)

RULES FOR MERGING SKILLS:

1. **Skill Extraction from GitHub:**
   - Extract programming languages from all_languages field
   - Extract frameworks/tools from topics field
   - Analyze language_bytes to determine expertise levels: languages with higher byte counts indicate stronger proficiency
   - Infer advanced skills from topics, README content, and project patterns (e.g., testing frameworks, deployment tools, cloud services)
   - Extract technologies mentioned in README summaries and descriptions

2. **Merging Strategy - PRESERVE EXISTING:**
   - ✅ KEEP all existing skills exactly as they are
   - ✅ Only ADD new skills not present in current list
   - ❌ NEVER remove existing skills

OUTPUT:
Return the MERGED projects and skills arrays. YOUR OUTPUT MUST HAVE AT LEAST AS MANY ITEMS AS THE INPUT.
ALL text content must be in English.`,
          },
          {
            role: 'user',
            content: `Merge this batch of GitHub repos with the current profile data.

**CURRENT PROJECTS (MUST ALL BE PRESERVED):**
${JSON.stringify(mergedProjects, null, 2)}
Count: ${mergedProjects.length} projects

**CURRENT SKILLS (MUST ALL BE PRESERVED):**
${JSON.stringify(mergedSkills, null, 2)}
Count: ${mergedSkills.length} skills

**GITHUB REPOSITORIES IN THIS BATCH (${batch.length} repos - ADD ALL AS NEW PROJECTS UNLESS DUPLICATE):**
${JSON.stringify(batch, null, 2)}

CRITICAL: Your output MUST contain AT LEAST ${mergedProjects.length} projects and ${mergedSkills.length} skills.
Process ALL ${batch.length} repositories in this batch.`,
          },
        ],
        response_format: zodResponseFormat(GitHubMergeSchema, 'github_merge'),
      });

      // Parse the batch merge result
      const batchResult = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Validation check
      if (batchResult.projects.length < mergedProjects.length) {
        console.warn(`[GitHub Import] Batch ${batchNum} reduced project count unexpectedly`);
      }
      if (batchResult.skills.length < mergedSkills.length) {
        console.warn(`[GitHub Import] Batch ${batchNum} reduced skill count unexpectedly`);
      }
      
      // Update merged data for next iteration
      mergedProjects = batchResult.projects;
      mergedSkills = batchResult.skills;

      updateProgress({
        step: 'Parsing repositories',
        reposProcessed: Math.min(i + batch.length, sortedRepos.length),
        reposTotal: sortedRepos.length,
        batchRepos: batch.map((repo: { name?: string; full_name?: string }) => repo.name || repo.full_name || 'Repository'),
      });
    }

    // Final validation check
    if (mergedProjects.length < currentProjects.length) {
      console.warn('[GitHub Import] Final merge reduced project count unexpectedly');
    }
    if (mergedSkills.length < currentSkills.length) {
      console.warn('[GitHub Import] Final merge reduced skill count unexpectedly');
    }

    // Update the draft with merged projects and skills
    updateProgress({
      step: 'Saving imported data',
      reposProcessed: sortedRepos.length,
      reposTotal: sortedRepos.length,
      batchRepos: [],
    });
    const { error: updateError } = await supabase
      .from('student_profile_draft')
      .update({
        projects: mergedProjects,
        skills: mergedSkills,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', user.id);

    if (updateError) {
      console.error('Failed to update draft with GitHub data:', updateError);
      return NextResponse.json(
        { error: 'Failed to save imported data' },
        { status: 500 }
      );
    }

    // Update last_synced_at timestamp
    await updateLastSynced(user.id, 'github');

    // Log the API call for rate limiting
    await logApiCall(user.id, 'github-import')

    updateProgress({
      step: 'Import complete',
      reposProcessed: sortedRepos.length,
      reposTotal: sortedRepos.length,
      batchRepos: [],
      complete: true,
    });

    return NextResponse.json({
      success: true,
      projects: mergedProjects,
      skills: mergedSkills,
      repos_imported: sortedRepos.length,
      batches_processed: totalBatches,
    });
  } catch (error: unknown) {
    console.error('GitHub import error:', error);
    return NextResponse.json(
      { error: 'Failed to import GitHub data' },
      { status: 500 }
    );
  }
}
