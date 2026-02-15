/**
 * Request security helpers
 *
 * Shared utilities for:
 * - extracting client IP in a safer way
 * - generating deterministic pseudo-UUID keys for rate limiting
 */

import "server-only";

import type { NextRequest } from 'next/server';

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6_REGEX = /^[0-9a-f:]+$/i;

function normalizeForwardedIp(raw: string): string | null {
  if (!raw) return null;

  // x-forwarded-for may contain multiple values: "client, proxy1, proxy2"
  let candidate = raw.split(',')[0]?.trim() || '';
  if (!candidate) return null;

  // Strip IPv6 bracket notation and optional port ([::1]:1234)
  candidate = candidate.replace(/^\[([^\]]+)\](?::\d+)?$/, '$1');

  // Strip :port for IPv4 "1.2.3.4:5678"
  if (candidate.includes(':') && candidate.includes('.')) {
    const [hostPart] = candidate.split(':');
    candidate = hostPart;
  }

  const isIpv4 = IPV4_REGEX.test(candidate);
  const isIpv6 = candidate.includes(':') && IPV6_REGEX.test(candidate);

  return isIpv4 || isIpv6 ? candidate : null;
}

/**
 * Extract client IP in a defensive way.
 *
 * Priority:
 * 1) Next runtime ip (harder to spoof)
 * 2) x-real-ip
 * 3) x-forwarded-for first hop
 * 4) fallback
 */
export function getClientIp(request: NextRequest, fallback = 'unknown'): string {
  const runtimeIp = normalizeForwardedIp(((request as unknown as { ip?: string }).ip) || '');
  if (runtimeIp) return runtimeIp;

  const realIp = normalizeForwardedIp(request.headers.get('x-real-ip') || '');
  if (realIp) return realIp;

  const forwardedIp = normalizeForwardedIp(request.headers.get('x-forwarded-for') || '');
  if (forwardedIp) return forwardedIp;

  return fallback;
}

/**
 * Convert an arbitrary key into a deterministic pseudo UUID.
 * Useful when existing DB rate-limit RPC expects UUID user IDs.
 */
export async function hashToPseudoUuid(namespace: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${namespace}:${value}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `00000000-0000-0000-0000-${hashHex.slice(0, 12)}`;
}
