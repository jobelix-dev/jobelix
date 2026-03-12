import "server-only";

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { setGitHubImportProgress } from '@/lib/server/github/progress';
import type { GitHubRepoForLLM } from '@/lib/server/github/api';

// Each batch returns only NEW items to add (not the full accumulated list).
// Final merge is done deterministically after all batches complete in parallel.
const GitHubExtractionSchema = z.object({
  new_projects: z.array(z.object({
    project_name: z.string(),
    description: z.string().nullable(),
    link: z.string().nullable(),
  })),
  new_skills: z.array(z.object({
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

function getExtractionSystemPrompt(): string {
  return `You are a developer profile extractor. Your task is to extract NEW projects and skills from GitHub repositories that are not already in the user's profile.

⚠️ IMPORTANT: ALL output text MUST be in English. Translate any non-English content.

RULES FOR EXTRACTING PROJECTS:

1. **Duplicate Detection — skip a repo if it already exists:**
   - Compare project names case-insensitively
   - Match by repository URL if available
   - Detect similar names (e.g., "Portfolio Site" vs "portfolio-website")

2. **For each NEW repository (not a duplicate), create a project entry:**
   - project_name: Use repository name (convert hyphens/underscores to spaces, capitalize properly)
   - description: Comprehensive, professional resume-style description using ALL available data:
     * Use README summary and repo description as foundation
     * Include project timeline from created_at to pushed_at
     * Mention primary languages and approximate code volume from language_bytes
     * Identify project type (web app, API, library, mobile, data analysis, etc.) from topics
     * Infer frameworks/tools/methodologies from topics, languages, README
     * Example: "Full-stack web application built with React and Node.js, featuring real-time data visualization. Developed over 18 months with 15,000+ lines of code."
   - link: Repository URL (url field)

RULES FOR EXTRACTING SKILLS:

1. Extract from ALL repositories in the batch:
   - Programming languages from all_languages / language_bytes
   - Frameworks and tools from topics
   - Technologies inferred from README content and project patterns

2. Only return skills NOT already in the existing skills list (match by skill_slug).

OUTPUT: Return only the NEW items to add — not the full list. Return empty arrays if nothing new is found.
ALL text must be in English.`;
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

  // Split into batches upfront
  const batches: GitHubRepoForLLM[][] = [];
  for (let i = 0; i < repos.length; i += batchSize) {
    batches.push(repos.slice(i, i + batchSize));
  }

  // Snapshot the existing data once — all batches check against the same baseline.
  // Each batch only returns NEW items to add; cross-batch de-dup is deterministic below.
  const existingProjectNames = new Set(
    currentProjects.map((p) => (p.project_name || '').toLowerCase().trim())
  );
  const existingSkillSlugs = new Set(currentSkills.map((s) => s.skill_slug || ''));

  let reposProcessed = 0;

  // Run all batches in parallel
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const batchRepos = batch.map((repo) => repo.name || 'Repository');

      const completion = await openai.chat.completions.create({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: getExtractionSystemPrompt(),
          },
          {
            role: 'user',
            content: `Extract NEW projects and skills from these GitHub repositories.

**EXISTING PROJECTS (do not add duplicates of these):**
${JSON.stringify(currentProjects.map((p) => ({ project_name: p.project_name, link: p.link })), null, 2)}

**EXISTING SKILL SLUGS (do not add these again):**
${JSON.stringify([...existingSkillSlugs], null, 2)}

**GITHUB REPOSITORIES TO PROCESS (${batch.length} repos — add each as a new project unless it duplicates an existing one):**
${JSON.stringify(batch, null, 2)}

Return only NEW items not already present. Return empty arrays if nothing new to add.`,
          },
        ],
        response_format: zodResponseFormat(GitHubExtractionSchema, 'github_extraction'),
      });

      reposProcessed += batch.length;
      onBatchProgress(reposProcessed, repos.length, batchRepos);

      return JSON.parse(completion.choices[0].message.content || '{}') as {
        new_projects: GitHubImportProject[];
        new_skills: GitHubImportSkill[];
      };
    })
  );

  // Deterministic merge: combine currentProjects/Skills + all new items, de-duping across batches
  const mergedProjects: GitHubImportProject[] = [...currentProjects];
  const mergedSkills: GitHubImportSkill[] = [...currentSkills];

  for (const result of batchResults) {
    for (const project of result.new_projects || []) {
      const key = (project.project_name || '').toLowerCase().trim();
      if (key && !existingProjectNames.has(key)) {
        existingProjectNames.add(key);
        mergedProjects.push(project);
      }
    }
    for (const skill of result.new_skills || []) {
      if (skill.skill_slug && !existingSkillSlugs.has(skill.skill_slug)) {
        existingSkillSlugs.add(skill.skill_slug);
        mergedSkills.push(skill);
      }
    }
  }

  return {
    projects: mergedProjects,
    skills: mergedSkills,
    batchesProcessed: batches.length,
  };
}
