/**
 * Runtime and host detection utilities for shared web/desktop UI.
 *
 * This module centralizes runtime decisions so components and API clients
 * don't duplicate Electron vs browser checks.
 */

export type HostRuntime = 'web' | 'electron';

const DEFAULT_DESKTOP_API_ORIGIN = 'https://www.jobelix.fr';

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isTrustedJobelixHost(hostname: string): boolean {
  return hostname === 'jobelix.fr' || hostname === 'www.jobelix.fr' || hostname.endsWith('.jobelix.fr');
}

function isLocalDesktopOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
}

function parseOrigin(origin: string): URL | null {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function isSafeDesktopBackendOrigin(url: URL): boolean {
  if (url.protocol === 'https:' && isTrustedJobelixHost(url.hostname)) return true;
  if (url.protocol === 'http:' && isLocalhost(url.hostname)) return true;
  return false;
}

function sanitizeDesktopBackendOrigin(origin: string): string {
  const parsed = parseOrigin(origin.trim());
  if (!parsed) return DEFAULT_DESKTOP_API_ORIGIN;
  if (!isSafeDesktopBackendOrigin(parsed)) return DEFAULT_DESKTOP_API_ORIGIN;
  return normalizeOrigin(parsed.origin);
}

export function isElectronRuntime(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

export function getElectronAPI() {
  if (typeof window === 'undefined') return undefined;
  return window.electronAPI;
}

export function getHostRuntime(): HostRuntime {
  return isElectronRuntime() ? 'electron' : 'web';
}

/**
 * Backend origin used by desktop-hosted UI.
 *
 * Web keeps same-origin API calls (`/api/*`), while desktop can resolve
 * to a configurable backend origin.
 */
export function getDesktopBackendOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_DESKTOP_API_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    '';

  if (configured.trim()) {
    return sanitizeDesktopBackendOrigin(configured);
  }

  return DEFAULT_DESKTOP_API_ORIGIN;
}

/**
 * Resolve an API path based on current host runtime.
 *
 * - Web: keep relative path (`/api/*`)
 * - Electron: prepend configured backend origin
 */
export function resolveApiPath(path: string): string {
  if (!path.startsWith('/')) return path;
  if (getHostRuntime() !== 'electron') return path;
  if (typeof window !== 'undefined' && isLocalDesktopOrigin(window.location.origin)) return path;
  return `${getDesktopBackendOrigin()}${path}`;
}

/**
 * Allow API requests only to same-origin (web) or same-origin + configured backend (Electron).
 */
export function isAllowedApiOrigin(url: URL): boolean {
  if (typeof window === 'undefined') return true;

  const targetOrigin = normalizeOrigin(url.origin);
  const currentOrigin = normalizeOrigin(window.location.origin);
  if (targetOrigin === currentOrigin) return true;

  if (getHostRuntime() !== 'electron') return false;
  return targetOrigin === normalizeOrigin(getDesktopBackendOrigin());
}
