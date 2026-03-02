import { isAllowedApiOrigin, resolveApiPath } from './runtime';
import { apiClient } from './apiClient';

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
 * Now uses the unified ApiClient which handles:
 * - Web: Cookie-based auth (same-origin)
 * - Desktop: Token-based auth (direct API calls)
 *
 * @deprecated For new code, use apiClient directly for better type safety
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Desktop app: Use token-based ApiClient
  if (apiClient.isDesktop()) {
    if (typeof input === 'string') {
      // Convert to proper API request through ApiClient
      return apiClient.request(input, init).then(data => {
        // Create a Response-like object for backward compatibility
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });
    }
  }
  
  // Web app: Use traditional cookie-based fetch
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
