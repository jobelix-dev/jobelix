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

interface DownloadButtonProps {
  releaseInfo?: ReleaseInfo;
  loading?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
}

/**
 * Detect user's operating system and architecture from browser APIs
 * Uses navigator.userAgentData when available (modern browsers) for better accuracy
 */
function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent.toLowerCase();
  const uaData = (navigator as any).userAgentData;
  const uaPlatform = (uaData?.platform || navigator.platform || '').toLowerCase();
  
  // Check for mobile/unsupported platforms
  const isMobile = /android|iphone|ipad|ipod|ios/.test(userAgent) || /android|ios/.test(uaPlatform);
  const isChromeOs = /cros/.test(userAgent);
  if (isMobile || isChromeOs) return 'unsupported';

  // Detect architecture
  // Modern Chrome/Edge expose this via userAgentData
  let isArm = false;
  if (uaData?.getHighEntropyValues) {
    // This is async but we need sync result - check what we can synchronously
    // Fall back to heuristics
  }
  
  // Heuristics for ARM detection:
  // - macOS: Apple Silicon M1/M2/M3 reports as "MacIntel" historically but modern browsers may expose arm
  // - Windows: ARM devices include "ARM" in user agent
  // - Linux: aarch64 in user agent
  const isArmUserAgent = 
    userAgent.includes('arm64') || 
    userAgent.includes('aarch64') ||
    userAgent.includes('arm;') ||
    // Windows on ARM specific
    userAgent.includes('windows nt') && userAgent.includes('arm');
  
  // For macOS, check if it's Apple Silicon via multiple signals
  const isMacArm = 
    (uaPlatform.includes('mac') || userAgent.includes('macintosh')) && (
      // Check WebGL renderer for Apple GPU (M1/M2/M3)
      detectAppleSilicon() ||
      // Some browsers expose ARM in userAgentData
      uaPlatform.includes('arm')
    );
  
  isArm = isArmUserAgent || isMacArm;

  // Detect OS
  if (uaPlatform.includes('win') || userAgent.includes('win')) {
    return isArm ? 'windows-arm64' : 'windows-x64';
  }
  
  if (uaPlatform.includes('mac') || (userAgent.includes('mac') && !userAgent.includes('iphone') && !userAgent.includes('ipad'))) {
    return isArm ? 'mac-arm64' : 'mac-x64';
  }
  
  if (uaPlatform.includes('linux') || userAgent.includes('linux')) {
    // Check for Arch-based distros
    const isArchDistro =
      userAgent.includes('arch') ||
      userAgent.includes('manjaro') ||
      userAgent.includes('endeavouros') ||
      userAgent.includes('garuda') ||
      userAgent.includes('arco') ||
      userAgent.includes('artix') ||
      userAgent.includes('cachyos') ||
      userAgent.includes('parabola') ||
      userAgent.includes('blackarch') ||
      userAgent.includes('rebornos');
    
    if (isArchDistro) return 'linux-arch';
    return isArm ? 'linux-arm64' : 'linux-x64';
  }
  
  return 'unknown';
}

/**
 * Detect Apple Silicon via WebGL renderer
 * Apple Silicon Macs report "Apple M1/M2/M3" or "Apple GPU" in WebGL renderer
 */
function detectAppleSilicon(): boolean {
  if (typeof document === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return false;
    
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    // Apple Silicon GPUs contain "Apple M" or "Apple GPU"
    return /apple (m\d|gpu)/i.test(renderer);
  } catch {
    return false;
  }
}

/**
 * Placeholder analytics function for tracking downloads
 */
function trackDownload(platform: Platform, version?: string) {
  console.log(`[Analytics] Download clicked - Platform: ${platform}, Version: ${version || 'unknown'}`);
  // TODO: Integrate with analytics service
}

/**
 * Get platform-specific display name
 */
function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case 'windows-x64': return 'Windows';
    case 'windows-arm64': return 'Windows (ARM)';
    case 'mac-x64': return 'macOS (Intel)';
    case 'mac-arm64': return 'macOS (Apple Silicon)';
    case 'linux-x64': return 'Linux';
    case 'linux-arm64': return 'Linux (ARM)';
    case 'linux-arch': return 'Arch Linux';
    case 'unsupported': return 'Unsupported Device';
    default: return 'Your Platform';
  }
}

/**
 * Get the download asset for a specific platform
 */
function getPlatformDownload(platform: Platform, releaseInfo: ReleaseInfo): AssetInfo | undefined {
  if (platform === 'unknown' || platform === 'unsupported') return undefined;
  return releaseInfo.assets[platform];
}

/**
 * Get all available platforms for dropdown
 */
function getAvailablePlatforms(releaseInfo: ReleaseInfo): { platform: Platform; name: string; asset: AssetInfo }[] {
  const platforms: { platform: Platform; name: string; asset: AssetInfo }[] = [];
  
  const platformMap: { key: keyof ReleaseInfo['assets']; platform: Platform; name: string }[] = [
    { key: 'windows-x64', platform: 'windows-x64', name: 'Windows (64-bit)' },
    { key: 'windows-arm64', platform: 'windows-arm64', name: 'Windows (ARM)' },
    { key: 'mac-arm64', platform: 'mac-arm64', name: 'macOS (Apple Silicon)' },
    { key: 'mac-x64', platform: 'mac-x64', name: 'macOS (Intel)' },
    { key: 'linux-x64', platform: 'linux-x64', name: 'Linux (Ubuntu/Debian)' },
    { key: 'linux-arm64', platform: 'linux-arm64', name: 'Linux ARM64' },
    { key: 'linux-arch', platform: 'linux-arch', name: 'Arch Linux' },
  ];
  
  for (const { key, platform, name } of platformMap) {
    const asset = releaseInfo.assets[key];
    if (asset) {
      platforms.push({ platform, name, asset });
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
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isClient, setIsClient] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Detect platform on client-side only (avoid SSR hydration mismatch)
  useEffect(() => {
    setIsClient(true);
    setPlatform(detectPlatform());
  }, []);

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
