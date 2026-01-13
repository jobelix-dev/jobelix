/**
 * Download Button Component
 * 
 * Client-side component that detects user's OS and displays
 * the appropriate download button for Jobelix desktop app.
 * Handles platform detection, loading states, and download tracking.
 */

'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { ReleaseInfo } from '@/lib/server/github-api';
import { formatFileSize, getFallbackDownloadUrl } from '@/lib/server/github-api';

type Platform = 'windows' | 'mac' | 'linux' | 'unknown';

interface DownloadButtonProps {
  releaseInfo?: ReleaseInfo;
  loading?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
}

/**
 * Detect user's operating system from user agent
 * Runs client-side only to avoid SSR hydration issues
 */
function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'mac';
  if (userAgent.includes('linux')) return 'linux';
  
  return 'unknown';
}

/**
 * Placeholder analytics function for tracking downloads
 * Will be replaced with real analytics integration later
 */
function trackDownload(platform: Platform, version?: string) {
  console.log(`[Analytics] Download clicked - Platform: ${platform}, Version: ${version || 'unknown'}`);
  // TODO: Integrate with analytics service (Google Analytics, Mixpanel, etc.)
}

/**
 * Get platform-specific display name
 */
function getPlatformName(platform: Platform): string {
  switch (platform) {
    case 'windows': return 'Windows';
    case 'mac': return 'macOS';
    case 'linux': return 'Linux';
    default: return 'Your Platform';
  }
}

/**
 * Get platform-specific download URL and metadata
 */
function getPlatformDownload(platform: Platform, releaseInfo?: ReleaseInfo) {
  if (!releaseInfo) return null;
  
  // Filter out 'unknown' platform before accessing assets
  if (platform === 'unknown') return null;
  
  const asset = releaseInfo.assets[platform];
  if (!asset) return null;
  
  return {
    url: asset.url,
    filename: asset.filename,
    size: formatFileSize(asset.size),
  };
}

export default function DownloadButton({
  releaseInfo,
  loading = false,
  className = '',
  variant = 'primary',
}: DownloadButtonProps) {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isClient, setIsClient] = useState(false);

  // Detect platform on client-side only (avoid SSR hydration mismatch)
  useEffect(() => {
    setIsClient(true);
    setPlatform(detectPlatform());
  }, []);

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <button
        disabled
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Detecting platform...</span>
      </button>
    );
  }

  // Show loading state while fetching release info
  if (loading || !releaseInfo) {
    return (
      <button
        disabled
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading release info...</span>
      </button>
    );
  }

  const platformName = getPlatformName(platform);
  const download = getPlatformDownload(platform, releaseInfo);

  // Handle click - track and download
  const handleDownload = () => {
    const downloadUrl = download?.url || getFallbackDownloadUrl();
    trackDownload(platform, releaseInfo.version);
    window.location.href = downloadUrl;
  };

  // Define button styles based on variant
  const baseStyles = 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg';
  const variantStyles = variant === 'primary'
    ? 'bg-purple-600 hover:bg-purple-700 text-white'
    : 'bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-2 border-purple-200 dark:border-purple-800';

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        <Download className="w-5 h-5" />
        <span>Download for {platformName}</span>
      </button>
      
      {/* Show version and file size info */}
      {download && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
          Version {releaseInfo.version} • {download.size}
        </p>
      )}
      
      {/* Show fallback link if no platform-specific download available */}
      {!download && platform !== 'unknown' && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          No installer found for {platformName}. <a href={getFallbackDownloadUrl()} className="underline hover:text-amber-700 dark:hover:text-amber-300">View all releases</a>
        </p>
      )}
      
      {/* Show manual selection for unknown platforms */}
      {platform === 'unknown' && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Choose your platform:</p>
          <div className="flex gap-2">
            {releaseInfo.assets.windows && (
              <a
                href={releaseInfo.assets.windows.url}
                onClick={() => trackDownload('windows', releaseInfo.version)}
                className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Windows
              </a>
            )}
            {releaseInfo.assets.mac && (
              <a
                href={releaseInfo.assets.mac.url}
                onClick={() => trackDownload('mac', releaseInfo.version)}
                className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                macOS
              </a>
            )}
            {releaseInfo.assets.linux && (
              <a
                href={releaseInfo.assets.linux.url}
                onClick={() => trackDownload('linux', releaseInfo.version)}
                className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Linux
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
