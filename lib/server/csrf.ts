/**
 * CSRF defenses for cookie-authenticated API routes.
 *
 * Strategy:
 * - Block explicit cross-site browser requests (`sec-fetch-site: cross-site`)
 * - Validate `Origin` when present against trusted app origins
 * - Allow missing Origin to avoid breaking non-browser clients
 */

import "server-only";

import { NextResponse } from 'next/server';

type CsrfRequest = Pick<Request, 'headers' | 'method' | 'url'> & {
  nextUrl?: URL;
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getRequestOrigin(request: CsrfRequest): string | null {
  if (request.nextUrl?.origin) return request.nextUrl.origin;

  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

function getTrustedOrigins(request: CsrfRequest): Set<string> {
  const trusted = new Set<string>();

  const requestOrigin = getRequestOrigin(request);
  if (requestOrigin) {
    trusted.add(requestOrigin);

    try {
      const { protocol, port, hostname } = new URL(requestOrigin);
      if (isLocalHost(hostname)) {
        const portSuffix = port ? `:${port}` : '';
        trusted.add(`${protocol}//localhost${portSuffix}`);
        trusted.add(`${protocol}//127.0.0.1${portSuffix}`);
      }
    } catch {
      // Ignore malformed origin.
    }
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      trusted.add(new URL(configured).origin);
    } catch {
      // Ignore malformed configured URL.
    }
  }

  return trusted;
}

function invalidOriginResponse() {
  return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
}

/**
 * Enforce same-origin policy for unsafe HTTP methods.
 *
 * Returns:
 * - `null` when request passes CSRF checks
 * - `NextResponse` (403) when rejected
 */
export function enforceSameOrigin(request?: CsrfRequest): NextResponse | null {
  if (!request) return null;

  const method = (request.method || 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) return null;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return invalidOriginResponse();
  }

  const originHeader = request.headers.get('origin');
  if (!originHeader) return null;

  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return invalidOriginResponse();
  }

  // In non-production, allow local dev origins for convenience.
  if (process.env.NODE_ENV !== 'production' && isLocalHost(origin.hostname)) {
    return null;
  }

  const trusted = getTrustedOrigins(request);
  if (!trusted.has(origin.origin)) {
    return invalidOriginResponse();
  }

  return null;
}
