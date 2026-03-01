import "server-only";

import { createHmac, timingSafeEqual } from 'crypto';

// Secret for signing/verifying unsubscribe tokens.
// Must be dedicated (do not reuse provider API keys for token signing).
const UNSUBSCRIBE_SECRET = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim() || '';
const TOKEN_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function getUnsubscribeSecret(): string {
  if (!UNSUBSCRIBE_SECRET) {
    throw new Error('Newsletter unsubscribe secret is not configured');
  }

  return UNSUBSCRIBE_SECRET;
}

export function assertUnsubscribeSecretConfigured(): void {
  getUnsubscribeSecret();
}

export function generateUnsubscribeToken(email: string, issuedAtMs: number = Date.now()): string {
  const issuedAtSeconds = Math.floor(issuedAtMs / 1000);
  const payload = `${email.toLowerCase()}:${issuedAtSeconds}`;
  const sig = createHmac('sha256', getUnsubscribeSecret()).update(payload).digest('hex');

  return `${issuedAtSeconds}.${sig}`;
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!token.includes('.')) return false;

  const [issuedAt, signature] = token.split('.', 2);
  if (!issuedAt || !signature || !/^\d+$/.test(issuedAt) || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const issuedAtMs = Number(issuedAt) * 1000;
  if (!Number.isFinite(issuedAtMs)) return false;

  const now = Date.now();
  // Reject expired tokens and tokens too far in the future.
  if (now - issuedAtMs > TOKEN_MAX_AGE_MS || issuedAtMs - now > 5 * 60 * 1000) {
    return false;
  }

  const payload = `${email.toLowerCase()}:${issuedAt}`;
  const expectedToken = createHmac('sha256', getUnsubscribeSecret()).update(payload).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedToken, 'hex'));
  } catch {
    return false;
  }
}

export function generateUnsubscribeUrl(
  email: string,
  baseUrl: string = 'https://www.jobelix.fr',
  issuedAtMs?: number,
): string {
  const token = generateUnsubscribeToken(email, issuedAtMs);

  return `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
