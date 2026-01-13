/**
 * GitHub API Utilities
 * 
 * Server-side utilities for fetching Jobelix desktop app releases from GitHub.
 * Used by: Download page and components that need release information.
 * Implements 1-hour caching to avoid hitting GitHub API rate limits.
 */

import "server-only";

// GitHub release asset information
export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

// Parsed release information with platform-specific download URLs
export interface ReleaseInfo {
  version: string;
  publishedAt: string;
  assets: {
    windows?: {
      url: string;
      filename: string;
      size: number;
    };
    mac?: {
      url: string;
      filename: string;
      size: number;
    };
    linux?: {
      url: string;
      filename: string;
      size: number;
    };
  };
  htmlUrl: string;
}

// GitHub API response type (partial - only fields we need)
interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
}

/**
 * Fetch the latest Jobelix desktop app release from GitHub
 * Uses Next.js revalidation caching to avoid rate limits (1 hour cache)
 * 
 * @returns Release information with platform-specific download URLs
 * @throws Error if fetch fails or release data is invalid
 */
export async function getLatestRelease(): Promise<ReleaseInfo> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/jobelix-dev/jobelix-releases/releases/latest',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Jobelix-Web-App',
        },
        // Cache for 1 hour to avoid hitting GitHub API rate limits
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }

    const data: GitHubRelease = await response.json();

    // Parse version from tag name (e.g., "v0.2.1" -> "0.2.1")
    const version = data.tag_name.replace(/^v/, '');

    // Find platform-specific assets
    const assets: ReleaseInfo['assets'] = {};

    for (const asset of data.assets) {
      const name = asset.name.toLowerCase();
      
      // Windows: .exe installer
      if (name.endsWith('.exe') && name.includes('setup')) {
        assets.windows = {
          url: asset.browser_download_url,
          filename: asset.name,
          size: asset.size,
        };
      }
      
      // macOS: .dmg disk image
      else if (name.endsWith('.dmg')) {
        assets.mac = {
          url: asset.browser_download_url,
          filename: asset.name,
          size: asset.size,
        };
      }
      
      // Linux: .AppImage
      else if (name.endsWith('.appimage')) {
        assets.linux = {
          url: asset.browser_download_url,
          filename: asset.name,
          size: asset.size,
        };
      }
    }

    return {
      version,
      publishedAt: data.published_at,
      assets,
      htmlUrl: data.html_url,
    };
  } catch (error) {
    console.error('Failed to fetch latest release from GitHub:', error);
    throw new Error('Unable to fetch latest release information');
  }
}

/**
 * Format file size in human-readable format
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "45.2 MB")
 */
export function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Get the fallback download URL (GitHub releases page)
 * Use this when API fetch fails or specific platform asset is not available
 */
export function getFallbackDownloadUrl(): string {
  return 'https://github.com/jobelix-dev/jobelix-releases/releases/latest';
}
