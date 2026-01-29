/**
 * GitHub API Utilities (Client)
 * 
 * Client-side utilities for fetching Jobelix desktop app releases from GitHub.
 * Used by: Download page and components that need release information.
 * Implements 1-hour caching to avoid hitting GitHub API rate limits.
 */

// GitHub release asset information
export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

// Asset metadata for download
export interface AssetInfo {
  url: string;
  filename: string;
  size: number;
}

// Parsed release information with platform-specific download URLs
export interface ReleaseInfo {
  version: string;
  publishedAt: string;
  assets: {
    // Windows
    'windows-x64'?: AssetInfo;
    'windows-arm64'?: AssetInfo;
    // macOS
    'mac-x64'?: AssetInfo;      // Intel
    'mac-arm64'?: AssetInfo;    // Apple Silicon
    // Linux
    'linux-x64'?: AssetInfo;    // Ubuntu/Debian x64
    'linux-arm64'?: AssetInfo;  // Ubuntu/Debian ARM
    'linux-arch'?: AssetInfo;   // Arch Linux
  };
  htmlUrl: string;
}

// Platform types for download detection
export type Platform = 
  | 'windows-x64' | 'windows-arm64'
  | 'mac-x64' | 'mac-arm64'
  | 'linux-x64' | 'linux-arm64' | 'linux-arch'
  | 'unknown' | 'unsupported';

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

    /**
     * Asset naming patterns (from electron-builder config):
     * - Windows: Jobelix-{ver}-windows-{arch}-setup.exe
     * - macOS: Jobelix-{ver}-macos-{arch}.dmg
     * - Linux Ubuntu: Jobelix-{ver}-ubuntu-22.04.AppImage (or ubuntu-22.04-arm)
     * - Linux Arch: Jobelix-{ver}-arch.AppImage
     */
    
    const isArchLinuxAsset = (name: string) => {
      const lower = name.toLowerCase();
      // Exclude ARM64 assets from arch detection
      if (lower.includes('arm64') || lower.includes('aarch64')) return false;
      // Check for arch-specific markers
      return lower.includes('-arch.') || lower.includes('-arch-') || lower.includes('archlinux');
    };

    const isArmAsset = (name: string) => {
      const lower = name.toLowerCase();
      return lower.includes('arm64') || lower.includes('aarch64') || lower.includes('-arm.');
    };

    for (const asset of data.assets) {
      const name = asset.name.toLowerCase();
      const assetInfo: AssetInfo = {
        url: asset.browser_download_url,
        filename: asset.name,
        size: asset.size,
      };
      
      // Windows: .exe installer
      if (name.endsWith('.exe') && name.includes('setup')) {
        if (isArmAsset(name)) {
          assets['windows-arm64'] = assetInfo;
        } else {
          assets['windows-x64'] = assetInfo;
        }
      }
      
      // macOS: .dmg disk image
      else if (name.endsWith('.dmg')) {
        if (isArmAsset(name)) {
          assets['mac-arm64'] = assetInfo;
        } else {
          assets['mac-x64'] = assetInfo;
        }
      }
      
      // Linux: .AppImage
      else if (name.endsWith('.appimage')) {
        if (isArchLinuxAsset(name)) {
          assets['linux-arch'] = assetInfo;
        } else if (isArmAsset(name)) {
          assets['linux-arm64'] = assetInfo;
        } else {
          // Default to x64 Ubuntu/Debian
          assets['linux-x64'] = assetInfo;
        }
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
