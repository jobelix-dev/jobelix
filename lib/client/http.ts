import { resolveApiPath } from './runtime';

/**
 * Shared fetch helper for app API requests.
 *
 * Uses runtime-aware URL resolution and includes credentials by default,
 * which keeps session-based auth working across hosts.
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string') {
    return fetch(resolveApiPath(input), {
      credentials: 'include',
      ...init,
    });
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
  return new EventSource(resolveApiPath(path), init);
}
