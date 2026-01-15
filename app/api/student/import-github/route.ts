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

    // Call OpenAI to intelligently merge GitHub data with existing profile
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a profile data merge expert. Your task is to intelligently merge GitHub repository data with existing profile data.

⚠️ CRITICAL: This is an ADDITIVE merge ONLY. You must PRESERVE ALL existing data and only ADD new items.

RULES FOR MERGING PROJECTS:

1. **Duplicate Detection:**
   - Compare project names case-insensitively
   - Detect similar names (e.g., "Portfolio Site" vs "portfolio-website")
   - Match by repository URL if available

2. **Merging Strategy - PRESERVE EXISTING:**
   - ✅ KEEP all existing projects exactly as they are
   - ✅ If a project already exists (by name or URL), DO NOT modify it
   - ✅ Only ADD new projects that don't exist yet
   - ✅ Preserve ALL manually entered project data
   - ❌ NEVER remove or modify existing projects
   - ❌ NEVER replace existing descriptions or links

3. **New Project Fields from GitHub:**
   - project_name: Use repository name (convert hyphens/underscores to spaces, capitalize properly)
   - description: **IMPORTANT - Generate comprehensive descriptions:**
     * If README excerpt is available (readme_summary field), USE IT as primary source
     * Extract key features, purpose, and technologies from README
     * Combine README insights with repository description
     * Include primary programming language and main technologies
     * Make descriptions detailed and informative (2-3 sentences)
     * If no README, use: repository description + primary language + notable topics
   - link: Use repository URL (html_url)

4. **README Usage:**
   - README excerpts contain first 15 lines of the repository README
   - These provide the BEST context for project descriptions
   - Parse README for: project purpose, features, tech stack, use cases
   - Ignore README metadata like badges, headers, table of contents
   - Focus on actual project description content

5. **Ordering:**
   - Keep existing projects in their current order
   - Add new GitHub projects at the end (sorted by stars/recency)

RULES FOR MERGING SKILLS:

1. **Skill Extraction from GitHub:**
   - Extract programming languages from all_languages field
   - Extract frameworks/tools from topics field
   - Common mappings: "javascript" → "JavaScript", "typescript" → "TypeScript", "python" → "Python"

2. **Merging Strategy - PRESERVE EXISTING:**
   - ✅ KEEP all existing skills exactly as they are
   - ✅ Compare skills case-insensitively
   - ✅ If skill already exists, DO NOT modify it (preserve skill_slug)
   - ✅ Only ADD new skills not present in current list
   - ❌ NEVER remove existing skills
   - ❌ NEVER modify existing skill names or slugs
   - Normalize skill names (proper capitalization)

3. **Skill Format:**
   - skill_name: Proper case (e.g., "JavaScript", "React", "Node.js")
   - skill_slug: Lowercase, hyphenated (e.g., "javascript", "react", "node-js")

4. **Ordering:**
   - Keep existing skills in their current order
   - Add new skills at the end, sorted alphabetically

⚠️ FINAL CHECK:
- Returned projects array length MUST be >= existing projects length
- Returned skills array length MUST be >= existing skills length
- ALL existing project names MUST appear in output
- ALL existing skill names MUST appear in output

OUTPUT:
Return the MERGED projects and skills arrays. Preserve all existing data and only add new items from GitHub.`,
        },
        {
          role: 'user',
          content: `Merge this GitHub data with the existing profile data.

**EXISTING PROJECTS (MUST ALL BE PRESERVED):**
${JSON.stringify(currentProjects, null, 2)}
Count: ${currentProjects.length} projects

**EXISTING SKILLS (MUST ALL BE PRESERVED):**
${JSON.stringify(currentSkills, null, 2)}
Count: ${currentSkills.length} skills

**GITHUB REPOSITORIES (ADD NEW ONES ONLY):**
${JSON.stringify(transformedRepos, null, 2)}

IMPORTANT: Your output MUST contain AT LEAST ${currentProjects.length} projects and ${currentSkills.length} skills. 
Intelligently merge the data, avoiding duplicates and preserving all existing manually-entered information.`,
        },
      ],
      response_format: zodResponseFormat(GitHubMergeSchema, 'github_merge'),
    });

    // Parse the merged data
    const mergedData = JSON.parse(completion.choices[0].message.content || '{}');

    // Update the draft with merged projects and skills
    const { error: updateError } = await supabase
      .from('student_profile_draft')
      .update({
        projects: mergedData.projects,
        skills: mergedData.skills,
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

    console.log(`GitHub import successful: Added ${mergedData.projects.length - currentProjects.length} projects, ${mergedData.skills.length - currentSkills.length} skills`);

    return NextResponse.json({
      success: true,
      projects: mergedData.projects,
      skills: mergedData.skills,
      repos_imported: transformedRepos.length,
    });
  } catch (error: any) {
    console.error('GitHub import error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import GitHub data' },
      { status: 500 }
    );
  }
}
