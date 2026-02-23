import { isAllowedApiOrigin, resolveApiPath } from './runtime';

function assertAllowedRequestTarget(rawUrl: string): void {
  if (typeof window === 'undefined') return;

  const parsed = new URL(rawUrl, window.location.origin);
  if (!isAllowedApiOrigin(parsed)) {
    throw new Error(`Blocked API request to disallowed origin: ${parsed.origin}`);
  }
}

/**
 * Shared fetch helper for app API requests.
 *
 * Uses runtime-aware URL resolution and includes credentials by default,
 * which keeps session-based auth working across hosts.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string') {
    const resolved = resolveApiPath(input);
    assertAllowedRequestTarget(resolved);
    return fetch(resolved, {
      credentials: 'include',
      ...init,
    });
  }

  if (input instanceof URL) {
    assertAllowedRequestTarget(input.toString());
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    assertAllowedRequestTarget(input.url);
  }

  return fetch(input, {
    credentials: 'include',
    ...init,
  });
}

/**
 * Runtime-aware EventSource helper for SSE API endpoints.
 */
export function apiEventSource(path: string, init?: EventSourceInit): EventSource {
  const resolved = resolveApiPath(path);
  assertAllowedRequestTarget(resolved);
  return new EventSource(resolved, init);
}
