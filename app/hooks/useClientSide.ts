/**
 * Hydration-safe hooks for client-side detection
 * 
 * These hooks use useSyncExternalStore to properly handle SSR/hydration.
 * Server renders with the server snapshot, client hydrates with the same value,
 * then updates to the actual client value after hydration.
 */

import { useSyncExternalStore } from 'react';
import { detectPlatform, type Platform } from '@/lib/client/platformDetection';

// No-op subscribe - these values don't change after initial load
const subscribeNoop = () => () => {};

// Client detection
const getIsClient = () => true;
const getIsClientServer = () => false;

// Electron detection  
const getIsElectron = () => typeof window !== 'undefined' && window.electronAPI !== undefined;
const getIsElectronServer = () => false;

// Platform detection
const getPlatform = (): Platform => detectPlatform();
const getPlatformServer = (): Platform => 'unknown';

/**
 * Hook to detect if code is running on the client
 * Returns false during SSR, true after hydration
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);
}

/**
 * Hook to detect if running in Electron environment
 * Returns false during SSR and in browser, true in Electron
 */
export function useIsElectron(): boolean {
  return useSyncExternalStore(subscribeNoop, getIsElectron, getIsElectronServer);
}

/**
 * Hook to detect the current platform
 * Returns 'unknown' during SSR, actual platform after hydration
 */
export function usePlatform(): Platform {
  return useSyncExternalStore(subscribeNoop, getPlatform, getPlatformServer);
}
