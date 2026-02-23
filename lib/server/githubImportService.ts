import "server-only";

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { setGitHubImportProgress } from '@/lib/server/githubImportProgress';
import type { GitHubRepoForLLM } from '@/lib/server/githubService';

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

export const importRequestSchema = z.object({
  current_projects: z.array(CurrentProjectSchema).max(300).optional().default([]),
  current_skills: z.array(CurrentSkillSchema).max(500).optional().default([]),
});

export type GitHubImportRequest = z.infer<typeof importRequestSchema>;
export type GitHubImportProject = z.infer<typeof CurrentProjectSchema>;
export type GitHubImportSkill = z.infer<typeof CurrentSkillSchema>;

export interface GitHubImportProgressParams {
  step: string;
  reposProcessed: number;
  reposTotal: number;
  batchRepos: string[];
  complete?: boolean;
}

export function createGitHubImportProgressUpdater(userId: string) {
  let lastBatchRepos: string[] = [];
  let lastReposTotal = 0;

  return (params: GitHubImportProgressParams) => {
    if (params.batchRepos.length > 0) {
      lastBatchRepos = params.batchRepos;
    }
    if (params.reposTotal > 0) {
      lastReposTotal = params.reposTotal;
    }

    const effectiveTotal = params.reposTotal > 0 ? params.reposTotal : lastReposTotal;
    const progress = effectiveTotal > 0
      ? Math.round((params.reposProcessed / effectiveTotal) * 100)
      : 0;

    setGitHubImportProgress(userId, {
      step: params.step,
      progress,
      reposProcessed: params.reposProcessed,
      reposTotal: effectiveTotal,
      batchRepos: lastBatchRepos,
      complete: params.complete,
    });
  };
}

export function filterAndSortSignificantRepos(repos: GitHubRepoForLLM[]): GitHubRepoForLLM[] {
  const significantRepos = repos.filter((repo) => {
    return !repo.is_fork ||
           (repo.stars && repo.stars > 0) ||
           repo.description ||
           repo.readme_summary;
  });

  return significantRepos.sort((a, b) => {
    const scoreA = (a.stars || 0) * 10 + (a.readme_summary ? 5 : 0) + (a.description ? 2 : 0);
    const scoreB = (b.stars || 0) * 10 + (b.readme_summary ? 5 : 0) + (b.description ? 2 : 0);
    return scoreB - scoreA;
  });
}

function getMergeSystemPrompt(batchNum: number, totalBatches: number): string {
  return `You are a profile data merge expert. Your task is to intelligently merge GitHub repository data with existing profile data.

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
ALL text content must be in English.`;
}

export async function mergeGitHubData(params: {
  openai: OpenAI;
  repos: GitHubRepoForLLM[];
  currentProjects: GitHubImportProject[];
  currentSkills: GitHubImportSkill[];
  batchSize: number;
  onBatchProgress: (reposProcessed: number, reposTotal: number, batchRepos: string[]) => void;
}): Promise<{ projects: GitHubImportProject[]; skills: GitHubImportSkill[]; batchesProcessed: number }> {
  const { openai, repos, currentProjects, currentSkills, batchSize, onBatchProgress } = params;

  let mergedProjects: GitHubImportProject[] = [...currentProjects];
  let mergedSkills: GitHubImportSkill[] = [...currentSkills];
  const totalBatches = Math.ceil(repos.length / batchSize);

  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const batchRepos = batch.map((repo) => repo.name || 'Repository');

    onBatchProgress(i, repos.length, batchRepos);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: getMergeSystemPrompt(batchNum, totalBatches),
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

    const batchResult = JSON.parse(completion.choices[0].message.content || '{}') as {
      projects: GitHubImportProject[];
      skills: GitHubImportSkill[];
    };

    if (batchResult.projects.length < mergedProjects.length) {
      console.warn(`[GitHub Import] Batch ${batchNum} reduced project count unexpectedly`);
    }
    if (batchResult.skills.length < mergedSkills.length) {
      console.warn(`[GitHub Import] Batch ${batchNum} reduced skill count unexpectedly`);
    }

    mergedProjects = batchResult.projects;
    mergedSkills = batchResult.skills;

    onBatchProgress(Math.min(i + batch.length, repos.length), repos.length, batchRepos);
  }

  if (mergedProjects.length < currentProjects.length) {
    console.warn('[GitHub Import] Final merge reduced project count unexpectedly');
  }
  if (mergedSkills.length < currentSkills.length) {
    console.warn('[GitHub Import] Final merge reduced skill count unexpectedly');
  }

  return {
    projects: mergedProjects,
    skills: mergedSkills,
    batchesProcessed: totalBatches,
  };
}
