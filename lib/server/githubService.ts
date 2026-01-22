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
  watchers_count: number;
  subscribers_count: number;
  network_count: number;
  size: number; // KB
  created_at: string;
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  private: boolean;
  default_branch: string;
  open_issues_count: number;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_downloads: boolean;
  has_discussions: boolean;
  is_template: boolean;
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
    node_id: string;
  } | null;
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
  language_bytes: { [language: string]: number }; // Lines of code per language for expertise levels
  topics: string[];
  stars: number;
  forks: number;
  watchers: number;
  subscribers: number;
  size_kb: number; // Repository size in KB
  is_fork: boolean;
  is_archived: boolean;
  is_disabled: boolean;
  is_template: boolean;
  default_branch: string;
  open_issues_count: number;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_discussions: boolean;
  license_key: string | null; // e.g., "mit", "apache-2.0"
  license_name: string | null; // e.g., "MIT License"
  created_at: string;
  last_updated: string;
  last_pushed: string; // Last commit/activity date
  readme_summary?: string | null;
  contributors_count?: number | null; // Number of contributors
  releases_count?: number | null; // Number of releases
  last_commit_date?: string | null; // Date of last commit
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// GITHUB API FUNCTIONS
// =============================================================================

/**
 * Fetch GitHub user information
 * @param accessToken - GitHub OAuth access token
 * @returns GitHub user data or null if failed
 */
export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Jobelix-App'
      }
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const userData = await response.json();
    return userData as GitHubUser;
  } catch (error) {
    console.error('Error fetching GitHub user:', error);
    return null;
  }
}

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
  maxLines: number = 30
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
 * Fetch repository contributors count
 * @param accessToken - GitHub OAuth access token
 * @param owner - Repository owner username
 * @param repo - Repository name
 */
export async function fetchRepoContributorsCount(
  accessToken: string,
  owner: string,
  repo: string
): Promise<number> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Jobelix-App'
        }
      }
    );

    if (!response.ok) {
      return 0;
    }

    // Get the Link header to find the last page number
    const linkHeader = response.headers.get('link');
    if (linkHeader) {
      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      if (lastPageMatch) {
        return parseInt(lastPageMatch[1]);
      }
    }

    // If no pagination, get the count from the response
    const contributors = await response.json();
    return contributors.length;
  } catch (error) {
    console.error(`Error fetching contributors count for ${owner}/${repo}:`, error);
    return 0;
  }
}

/**
 * Fetch repository releases count
 * @param accessToken - GitHub OAuth access token
 * @param owner - Repository owner username
 * @param repo - Repository name
 */
export async function fetchRepoReleasesCount(
  accessToken: string,
  owner: string,
  repo: string
): Promise<number> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Jobelix-App'
        }
      }
    );

    if (!response.ok) {
      return 0;
    }

    // Get the Link header to find the last page number
    const linkHeader = response.headers.get('link');
    if (linkHeader) {
      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      if (lastPageMatch) {
        return parseInt(lastPageMatch[1]);
      }
    }

    // If no pagination, get the count from the response
    const releases = await response.json();
    return releases.length;
  } catch (error) {
    console.error(`Error fetching releases count for ${owner}/${repo}:`, error);
    return 0;
  }
}

/**
 * Fetch repository last commit date
 * @param accessToken - GitHub OAuth access token
 * @param owner - Repository owner username
 * @param repo - Repository name
 */
export async function fetchRepoLastCommitDate(
  accessToken: string,
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Jobelix-App'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const commits = await response.json();
    if (commits.length > 0) {
      return commits[0].commit.committer.date;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching last commit date for ${owner}/${repo}:`, error);
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

        // Fetch additional metadata in parallel (contributors, releases, last commit)
        const [contributorsCount, releasesCount, lastCommitDate] = await Promise.all([
          fetchRepoContributorsCount(accessToken, owner, repoName),
          fetchRepoReleasesCount(accessToken, owner, repoName),
          fetchRepoLastCommitDate(accessToken, owner, repoName)
        ]);

        const allLanguages = Object.keys(languages);

        return {
          name: repo.name,
          description: repo.description,
          url: repo.html_url,
          homepage: repo.homepage,
          primary_language: repo.language,
          all_languages: allLanguages,
          language_bytes: languages, // Include byte counts for expertise analysis
          topics: repo.topics || [],
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          subscribers: repo.subscribers_count,
          size_kb: repo.size,
          is_fork: repo.fork,
          is_archived: repo.archived,
          is_disabled: repo.disabled,
          is_template: repo.is_template,
          default_branch: repo.default_branch,
          open_issues_count: repo.open_issues_count,
          has_issues: repo.has_issues,
          has_projects: repo.has_projects,
          has_wiki: repo.has_wiki,
          has_pages: repo.has_pages,
          has_discussions: repo.has_discussions,
          license_key: repo.license?.key || null,
          license_name: repo.license?.name || null,
          created_at: repo.created_at,
          last_updated: repo.updated_at,
          last_pushed: repo.pushed_at, // Last commit/activity date
          readme_summary: readmeSummary,
          contributors_count: contributorsCount,
          releases_count: releasesCount,
          last_commit_date: lastCommitDate,
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
          language_bytes: {}, // Empty object when languages fetch fails
          topics: repo.topics || [],
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          subscribers: repo.subscribers_count,
          size_kb: repo.size,
          is_fork: repo.fork,
          is_archived: repo.archived,
          is_disabled: repo.disabled,
          is_template: repo.is_template,
          default_branch: repo.default_branch,
          open_issues_count: repo.open_issues_count,
          has_issues: repo.has_issues,
          has_projects: repo.has_projects,
          has_wiki: repo.has_wiki,
          has_pages: repo.has_pages,
          has_discussions: repo.has_discussions,
          license_key: repo.license?.key || null,
          license_name: repo.license?.name || null,
          created_at: repo.created_at,
          last_updated: repo.updated_at,
          last_pushed: repo.pushed_at, // Last commit/activity date
          readme_summary: null,
          contributors_count: 0,
          releases_count: 0,
          last_commit_date: undefined,
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
