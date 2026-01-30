/**
 * Platform Detection Utilities
 * 
 * Client-side utilities for detecting user's operating system and CPU architecture.
 * Used for determining the correct download asset for the Jobelix desktop app.
 */

import type { Platform } from '@/lib/client/github-api';

/** Platforms that have actual download assets (excludes 'unknown' and 'unsupported') */
export type DownloadablePlatform = Exclude<Platform, 'unknown' | 'unsupported'>;

/**
 * Detect Apple Silicon via WebGL renderer
 * Apple Silicon Macs report "Apple M1/M2/M3" or "Apple GPU" in WebGL renderer
 */
export function detectAppleSilicon(): boolean {
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
 * Check if the device is ARM-based
 */
function isArmArchitecture(userAgent: string, uaPlatform: string): boolean {
  // Explicit ARM indicators in user agent
  const isArmUserAgent = 
    userAgent.includes('arm64') || 
    userAgent.includes('aarch64') ||
    userAgent.includes('arm;') ||
    // Windows on ARM specific
    (userAgent.includes('windows nt') && userAgent.includes('arm'));
  
  // macOS Apple Silicon detection
  const isMacArm = 
    (uaPlatform.includes('mac') || userAgent.includes('macintosh')) && (
      // Check WebGL renderer for Apple GPU (M1/M2/M3)
      detectAppleSilicon() ||
      // Some browsers expose ARM in userAgentData
      uaPlatform.includes('arm')
    );
  
  return isArmUserAgent || isMacArm;
}

/**
 * Check if the device is running an Arch-based Linux distro
 */
function isArchBasedDistro(userAgent: string): boolean {
  const archDistros = [
    'arch',
    'manjaro',
    'endeavouros',
    'garuda',
    'arco',
    'artix',
    'cachyos',
    'parabola',
    'blackarch',
    'rebornos',
  ];
  
  return archDistros.some(distro => userAgent.includes(distro));
}

/**
 * Detect user's operating system and architecture from browser APIs
 * Uses navigator.userAgentData when available (modern browsers) for better accuracy
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent.toLowerCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uaData = (navigator as any).userAgentData;
  const uaPlatform = (uaData?.platform || navigator.platform || '').toLowerCase();
  
  // Check for mobile/unsupported platforms
  const isMobile = /android|iphone|ipad|ipod|ios/.test(userAgent) || /android|ios/.test(uaPlatform);
  const isChromeOs = /cros/.test(userAgent);
  if (isMobile || isChromeOs) return 'unsupported';

  const isArm = isArmArchitecture(userAgent, uaPlatform);

  // Detect OS
  if (uaPlatform.includes('win') || userAgent.includes('win')) {
    return isArm ? 'windows-arm64' : 'windows-x64';
  }
  
  if (uaPlatform.includes('mac') || (userAgent.includes('mac') && !userAgent.includes('iphone') && !userAgent.includes('ipad'))) {
    return isArm ? 'mac-arm64' : 'mac-x64';
  }
  
  if (uaPlatform.includes('linux') || userAgent.includes('linux')) {
    if (isArchBasedDistro(userAgent)) return 'linux-arch';
    return isArm ? 'linux-arm64' : 'linux-x64';
  }
  
  return 'unknown';
}

/**
 * Get platform-specific display name
 */
export function getPlatformDisplayName(platform: Platform): string {
  const displayNames: Record<Platform, string> = {
    'windows-x64': 'Windows',
    'windows-arm64': 'Windows (ARM)',
    'mac-x64': 'macOS (Intel)',
    'mac-arm64': 'macOS (Apple Silicon)',
    'linux-x64': 'Linux',
    'linux-arm64': 'Linux (ARM)',
    'linux-arch': 'Arch Linux',
    'unsupported': 'Unsupported Device',
    'unknown': 'Your Platform',
  };
  
  return displayNames[platform] || 'Your Platform';
}

/**
 * Platform metadata for dropdown display
 */
export interface PlatformOption {
  key: DownloadablePlatform;
  name: string;
}

/**
 * All available platform options for manual selection
 */
export const PLATFORM_OPTIONS: PlatformOption[] = [
  { key: 'windows-x64', name: 'Windows (64-bit)' },
  { key: 'windows-arm64', name: 'Windows (ARM)' },
  { key: 'mac-arm64', name: 'macOS (Apple Silicon)' },
  { key: 'mac-x64', name: 'macOS (Intel)' },
  { key: 'linux-x64', name: 'Linux (Ubuntu/Debian)' },
  { key: 'linux-arm64', name: 'Linux ARM64' },
  { key: 'linux-arch', name: 'Arch Linux' },
];
