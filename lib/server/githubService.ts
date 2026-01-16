/**
 * GitHub API Service
 * 
 * Server-side service for fetching data from GitHub API.
 * Used for importing user repositories, languages, and project information.
 */

import "server-only";

// =============================================================================
// TYPES
// =============================================================================

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
}

export interface GitHubLanguages {
  [language: string]: number; // Language name -> bytes of code
}

export interface GitHubRepoForLLM {
  name: string;
  description: string | null;
  url: string;
  homepage: string | null;
  primary_language: string | null;
  all_languages: string[];
  topics: string[];
  stars: number;
  is_fork: boolean;
  created_at: string;
  last_updated: string;
  readme_summary?: string | null;
}

// =============================================================================
// GITHUB API FUNCTIONS
// =============================================================================

/**
 * Fetch user's repositories from GitHub
 * @param accessToken - GitHub OAuth access token
 * @param includePrivate - Whether to include private repos (default: true)
 * @param maxRepos - Maximum number of repos to fetch (default: 100)
 */
export async function fetchGitHubRepos(
  accessToken: string,
  includePrivate: boolean = true,
  maxRepos: number = 100
): Promise<GitHubRepo[]> {
  try {
    const repos: GitHubRepo[] = [];
    let page = 1;
    const perPage = 100;

    while (repos.length < maxRepos) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Jobelix-App'
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${error}`);
      }

      const pageRepos: GitHubRepo[] = await response.json();
      
      if (pageRepos.length === 0) {
        break; // No more repos
      }

      // Filter out forks and archived repos by default
      const filteredRepos = pageRepos.filter(repo => {
        if (repo.fork || repo.archived) return false;
        if (!includePrivate && repo.private) return false;
        return true;
      });

      repos.push(...filteredRepos);
      
      if (pageRepos.length < perPage) {
        break; // Last page
      }
      
      page++;
    }

    return repos.slice(0, maxRepos);
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    throw error;
  }
}

/**
 * Fetch languages used in a specific repository
 * @param accessToken - GitHub OAuth access token
 * @param owner - Repository owner username
 * @param repo - Repository name
 */
export async function fetchRepoLanguages(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubLanguages> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Jobelix-App'
        }
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch languages for ${owner}/${repo}: ${response.status}`);
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching languages for ${owner}/${repo}:`, error);
    return {};
  }
}

/**
 * Fetch repository README content
 * @param accessToken - GitHub OAuth access token
 * @param owner - Repository owner username
 * @param repo - Repository name
 * @param maxLines - Maximum number of lines to extract (default: 15)
 */
export async function fetchRepoReadme(
  accessToken: string,
  owner: string,
  repo: string,
  maxLines: number = 15
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3.raw', // Get raw markdown
          'User-Agent': 'Jobelix-App'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const readme = await response.text();
    
    // Extract first N lines (more meaningful than character limit)
    const lines = readme.split('\n').slice(0, maxLines);
    const excerpt = lines.join('\n').trim();
    
    // Fallback to character limit if result is too long
    return excerpt.length > 1000 ? excerpt.slice(0, 1000) : excerpt;
  } catch (error) {
    console.error(`Error fetching README for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Get GitHub user info
 * @param accessToken - GitHub OAuth access token
 */
export async function fetchGitHubUser(accessToken: string): Promise<{
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
} | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Jobelix-App'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching GitHub user:', error);
    return null;
  }
}

// =============================================================================
// DATA TRANSFORMATION FOR LLM
// =============================================================================

/**
 * Transform GitHub repos into LLM-friendly format
 * Enriches repos with language data and README excerpts for AI consumption
 * @param accessToken - GitHub OAuth access token
 * @param repos - Array of GitHub repositories
 * @param includeReadme - Whether to fetch README for additional context (default: true for better descriptions)
 * @param maxConcurrent - Maximum concurrent API requests (default: 5)
 */
export async function transformReposForLLM(
  accessToken: string,
  repos: GitHubRepo[],
  includeReadme: boolean = true,
  maxConcurrent: number = 5
): Promise<GitHubRepoForLLM[]> {
  const transformedRepos: GitHubRepoForLLM[] = [];

  // Process repos in batches to avoid rate limiting
  for (let i = 0; i < repos.length; i += maxConcurrent) {
    const batch = repos.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(async (repo) => {
      try {
        const [owner, repoName] = repo.full_name.split('/');
        
        // Fetch languages and README in parallel
        const [languages, readmeSummary] = await Promise.all([
          fetchRepoLanguages(accessToken, owner, repoName),
          includeReadme ? fetchRepoReadme(accessToken, owner, repoName) : Promise.resolve(null)
        ]);

        const allLanguages = Object.keys(languages);

        return {
          name: repo.name,
          description: repo.description,
          url: repo.html_url,
          homepage: repo.homepage,
          primary_language: repo.language,
          all_languages: allLanguages,
          topics: repo.topics || [],
          stars: repo.stargazers_count,
          is_fork: repo.fork,
          created_at: repo.created_at,
          last_updated: repo.updated_at,
          readme_summary: readmeSummary
        };
      } catch (error) {
        console.error(`Error transforming repo ${repo.full_name}:`, error);
        // Still include basic repo info even if enrichment fails
        return {
          name: repo.name,
          description: repo.description,
          url: repo.html_url,
          homepage: repo.homepage,
          primary_language: repo.language,
          all_languages: repo.language ? [repo.language] : [],
          topics: repo.topics || [],
          stars: repo.stargazers_count,
          is_fork: repo.fork,
          created_at: repo.created_at,
          last_updated: repo.updated_at,
          readme_summary: null
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    transformedRepos.push(...batchResults);
  }

  return transformedRepos;
}

/**
 * Extract unique skills/technologies from GitHub repos
 * Useful for quick skills list without LLM call
 */
export function extractSkillsFromRepos(repos: GitHubRepoForLLM[]): string[] {
  const skillsSet = new Set<string>();

  repos.forEach(repo => {
    // Add languages
    repo.all_languages.forEach(lang => skillsSet.add(lang));
    
    // Add topics (often include frameworks/tools)
    repo.topics.forEach(topic => {
      // Convert topic format (e.g., 'react-js' -> 'React')
      const formatted = topic
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      skillsSet.add(formatted);
    });
  });

  return Array.from(skillsSet).sort();
}
