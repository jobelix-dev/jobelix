/**
 * Download Button Component
 * 
 * Client-side component that detects user's OS and CPU architecture,
 * then displays the appropriate download button for Jobelix desktop app.
 * Handles platform detection, loading states, and download tracking.
 * 
 * Supports:
 * - Windows (x64, arm64)
 * - macOS (Intel x64, Apple Silicon arm64)
 * - Linux Ubuntu/Debian (x64, arm64)
 * - Linux Arch (x64)
 */

'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, ChevronDown } from 'lucide-react';
import type { ReleaseInfo, Platform, AssetInfo } from '@/lib/client/github-api';
import { formatFileSize, getFallbackDownloadUrl } from '@/lib/client/github-api';
import { getPlatformDisplayName, PLATFORM_OPTIONS } from '@/lib/client/platformDetection';
import { useIsClient, usePlatform } from '@/app/hooks/useClientSide';

interface DownloadButtonProps {
  releaseInfo?: ReleaseInfo;
  loading?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
}

/**
 * Placeholder analytics function for tracking downloads
 */
function trackDownload(platform: Platform, version?: string) {
  console.log(`[Analytics] Download clicked - Platform: ${platform}, Version: ${version || 'unknown'}`);
  // TODO: Integrate with analytics service
}

/**
 * Get all available platforms for dropdown
 */
function getAvailablePlatforms(releaseInfo: ReleaseInfo): { platform: Platform; name: string; asset: AssetInfo }[] {
  const platforms: { platform: Platform; name: string; asset: AssetInfo }[] = [];
  
  for (const { key, name } of PLATFORM_OPTIONS) {
    const asset = releaseInfo.assets[key];
    if (asset) {
      platforms.push({ platform: key, name, asset });
    }
  }
  
  return platforms;
}

export default function DownloadButton({
  releaseInfo,
  loading = false,
  className = '',
  variant = 'primary',
}: DownloadButtonProps) {
  const isClient = useIsClient();
  const platform = usePlatform();
  const [showDropdown, setShowDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    
    const handleClickOutside = () => setShowDropdown(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

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
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors bg-border text-muted cursor-not-allowed ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading release info...</span>
      </button>
    );
  }

  const platformName = getPlatformDisplayName(platform);
  const detectedAsset = platform !== 'unknown' && platform !== 'unsupported' 
    ? releaseInfo.assets[platform] 
    : null;
  const availablePlatforms = getAvailablePlatforms(releaseInfo);

  if (platform === 'unsupported') {
    return (
      <div className="space-y-2 text-center">
        <button
          disabled
          className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors bg-border text-muted cursor-not-allowed ${className}`}
        >
          <Download className="w-5 h-5" />
          <span>Desktop app not available for this device</span>
        </button>
        <p className="text-xs text-muted">
          Use Windows, macOS, or Linux.{' '}
          <a href={getFallbackDownloadUrl()} className="underline hover:text-warning">View all releases</a>
        </p>
      </div>
    );
  }

  // Handle main download click
  const handleDownload = (targetPlatform: Platform, url: string) => {
    trackDownload(targetPlatform, releaseInfo.version);
    window.location.href = url;
  };

  // Define button styles based on variant
  const baseStyles = 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg';
  const variantStyles = variant === 'primary'
    ? 'bg-primary hover:bg-primary-hover text-white'
    : 'bg-surface hover:bg-primary-subtle text-default border-2 border-primary-subtle';

  return (
    <div className="space-y-2">
      <div className="relative inline-flex">
        {/* Main download button */}
        <button
          onClick={() => detectedAsset 
            ? handleDownload(platform, detectedAsset.url) 
            : setShowDropdown(!showDropdown)
          }
          className={`${baseStyles} ${variantStyles} ${detectedAsset ? 'rounded-r-none border-r border-white/20' : ''} ${className}`}
        >
          <Download className="w-5 h-5" />
          <span>Download for {platformName}</span>
        </button>
        
        {/* Dropdown toggle for other platforms */}
        {availablePlatforms.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
            className={`${baseStyles} ${variantStyles} rounded-l-none px-3 border-l-0`}
            aria-label="Show all platforms"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        )}
        
        {/* Platform dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="py-1">
              <p className="px-4 py-2 text-xs text-muted font-medium uppercase tracking-wide border-b border-border">
                All Platforms
              </p>
              {availablePlatforms.map(({ platform: p, name, asset }) => (
                <button
                  key={p}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(p, asset.url);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-subtle transition-colors flex items-center justify-between ${
                    p === platform ? 'bg-primary-subtle/50 font-medium' : ''
                  }`}
                >
                  <span>{name}</span>
                  <span className="text-xs text-muted">{formatFileSize(asset.size)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Show version and file size info */}
      {detectedAsset && (
        <p className="text-xs text-muted text-center">
          Version {releaseInfo.version} • {formatFileSize(detectedAsset.size)}
        </p>
      )}
      
      {/* Show fallback link if no platform-specific download available */}
      {!detectedAsset && platform !== 'unknown' && (
        <p className="text-xs text-warning text-center">
          {platformName} build coming soon.{' '}
          <a href={getFallbackDownloadUrl()} className="underline hover:text-warning">
            View all releases
          </a>
        </p>
      )}
      
      {/* Show manual selection for unknown platforms */}
      {platform === 'unknown' && availablePlatforms.length > 0 && (
        <p className="text-xs text-muted text-center">
          Click to select your platform
        </p>
      )}
    </div>
  );
}
