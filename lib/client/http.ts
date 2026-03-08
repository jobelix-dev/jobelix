import { isElectronRuntime, isAllowedApiOrigin, resolveApiPath, getElectronAPI } from './runtime';

function assertAllowedRequestTarget(rawUrl: string): void {
  if (typeof window === 'undefined') return;

  const parsed = new URL(rawUrl, window.location.origin);
  if (!isAllowedApiOrigin(parsed)) {
    throw new Error(`Blocked API request to disallowed origin: ${parsed.origin}`);
  }
}

async function buildDesktopHeaders(init?: RequestInit): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  // Preserve any caller-provided headers
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => { headers[key] = value; });
  }

  try {
    const session = await getElectronAPI()?.getSession?.();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      headers['X-Client-Type'] = 'desktop';
    }
  } catch {
    // ignore — request proceeds without auth header
  }

  return headers;
}

/**
 * Shared fetch helper for all API requests.
 *
 * - Web: same-origin cookies (credentials: include)
 * - Desktop: Bearer token injected from Electron session storage
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string') {
    const resolved = resolveApiPath(input);
    assertAllowedRequestTarget(resolved);

    if (isElectronRuntime()) {
      const headers = await buildDesktopHeaders(init);
      return fetch(resolved, { ...init, headers, credentials: 'omit' });
    }

    return fetch(resolved, { credentials: 'include', ...init });
  }

  if (input instanceof URL) {
    assertAllowedRequestTarget(input.toString());
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    assertAllowedRequestTarget(input.url);
  }

  return fetch(input, { credentials: 'include', ...init });
}

/**
 * Runtime-aware EventSource helper for SSE API endpoints.
 */
export function apiEventSource(path: string, init?: EventSourceInit): EventSource {
  const resolved = resolveApiPath(path);
  assertAllowedRequestTarget(resolved);
  return new EventSource(resolved, init);
}
