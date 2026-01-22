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
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

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

/**
 * POST handler for GitHub import
 * Expects: { current_projects, current_skills } in request body
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest();
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;

    // Rate limiting: 5 imports per hour, 20 per day (this is expensive with OpenAI)
    const rateLimitResult = await checkRateLimit(user.id, {
      endpoint: 'github-import',
      hourlyLimit: 5,
      dailyLimit: 20,
    })

    if (rateLimitResult.error) return rateLimitResult.error
    if (!rateLimitResult.data.allowed) {
      return rateLimitExceededResponse(
        { endpoint: 'github-import', hourlyLimit: 5, dailyLimit: 20 },
        rateLimitResult.data
      )
    }

    // Get request body
    const body = await request.json();
    const currentProjects = body.current_projects || [];
    const currentSkills = body.current_skills || [];

    // Get GitHub connection
    const connection = await getGitHubConnection(user.id);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'GitHub not connected' },
        { status: 400 }
      );
    }

    // Fetch GitHub repositories with README excerpts for better descriptions
    console.log('Fetching GitHub repositories with README content...');
    const repos = await fetchGitHubRepos(connection.access_token, true, 50);
    
    console.log(`Processing ${repos.length} repositories (fetching languages + READMEs)...`);
    const transformedRepos = await transformReposForLLM(connection.access_token, repos, true); // Enable README fetching

    const reposWithReadme = transformedRepos.filter(r => r.readme_summary).length;
    console.log(`✓ Fetched ${transformedRepos.length} repositories (${reposWithReadme} with README excerpts)`);

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

    console.log(`Filtered to ${significantRepos.length} significant repositories (removed forks without stars/description)`);

    // Sort by importance: stars, has README, recently updated
    const sortedRepos = significantRepos.sort((a, b) => {
      const scoreA = (a.stars || 0) * 10 + (a.readme_summary ? 5 : 0) + (a.description ? 2 : 0);
      const scoreB = (b.stars || 0) * 10 + (b.readme_summary ? 5 : 0) + (b.description ? 2 : 0);
      return scoreB - scoreA;
    });

    // Process in batches of 10 repos to avoid overwhelming the LLM
    const BATCH_SIZE = 5;
    let mergedProjects = [...currentProjects];
    let mergedSkills = [...currentSkills];
    let totalBatches = Math.ceil(sortedRepos.length / BATCH_SIZE);

    console.log(`Processing ${sortedRepos.length} repos in ${totalBatches} batches of ${BATCH_SIZE}`);

    for (let i = 0; i < sortedRepos.length; i += BATCH_SIZE) {
      const batch = sortedRepos.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} repos)...`);

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
      
      console.log(`  Batch ${batchNum}: ${mergedProjects.length} → ${batchResult.projects.length} projects (+${batchResult.projects.length - mergedProjects.length})`);
      console.log(`  Batch ${batchNum}: ${mergedSkills.length} → ${batchResult.skills.length} skills (+${batchResult.skills.length - mergedSkills.length})`);
      
      // Validation check
      if (batchResult.projects.length < mergedProjects.length) {
        console.error(`⚠️ WARNING: Batch ${batchNum} LOST projects! ${mergedProjects.length} → ${batchResult.projects.length}`);
      }
      if (batchResult.skills.length < mergedSkills.length) {
        console.error(`⚠️ WARNING: Batch ${batchNum} LOST skills! ${mergedSkills.length} → ${batchResult.skills.length}`);
      }
      
      // Update merged data for next iteration
      mergedProjects = batchResult.projects;
      mergedSkills = batchResult.skills;
    }

    // Final debug logging
    console.log('=== GITHUB IMPORT MERGE DEBUG (FINAL) ===');
    console.log('Initial projects count:', currentProjects.length);
    console.log('Initial skills count:', currentSkills.length);
    console.log('GitHub repos count:', sortedRepos.length);
    console.log('Final merged projects count:', mergedProjects.length);
    console.log('Final merged skills count:', mergedSkills.length);
    console.log('Projects added:', mergedProjects.length - currentProjects.length);
    console.log('Skills added:', mergedSkills.length - currentSkills.length);
    
    if (currentProjects.length > 0) {
      console.log('Sample current projects:', currentProjects.slice(0, 2).map((p: any) => p.project_name));
    }
    if (mergedProjects.length > 0) {
      console.log('Sample merged projects:', mergedProjects.slice(0, 2).map((p: any) => p.project_name));
    }
    
    // Final validation check
    if (mergedProjects.length < currentProjects.length) {
      console.error('⚠️ CRITICAL: Final merged projects count is LESS than initial count!');
    }
    if (mergedSkills.length < currentSkills.length) {
      console.error('⚠️ CRITICAL: Final merged skills count is LESS than initial count!');
    }
    console.log('==========================================');

    // Update the draft with merged projects and skills
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
        { success: false, error: 'Failed to save imported data' },
        { status: 500 }
      );
    }

    // Update last_synced_at timestamp
    await updateLastSynced(user.id, 'github');

    // Log the API call for rate limiting
    await logApiCall(user.id, 'github-import')

    console.log(`GitHub import successful: Total added ${mergedProjects.length - currentProjects.length} projects, ${mergedSkills.length - currentSkills.length} skills`);

    return NextResponse.json({
      success: true,
      projects: mergedProjects,
      skills: mergedSkills,
      repos_imported: sortedRepos.length,
      batches_processed: totalBatches,
    });
  } catch (error: any) {
    console.error('GitHub import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import GitHub data' },
      { status: 500 }
    );
  }
}
