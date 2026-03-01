/**
 * Bot backend URL safety helpers.
 *
 * Limits outbound bot API calls to trusted hosts and the expected endpoint.
 */

function normalizePathname(pathname) {
  if (!pathname) return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isLocalhost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function isTrustedJobelixHost(hostname) {
  return (
    hostname === 'jobelix.fr' ||
    hostname === 'www.jobelix.fr' ||
    hostname.endsWith('.jobelix.fr')
  );
}

export function isSafeBotApiUrl(parsedUrl) {
  if (parsedUrl.protocol === 'https:' && isTrustedJobelixHost(parsedUrl.hostname)) {
    return true;
  }
  if (parsedUrl.protocol === 'http:' && isLocalhost(parsedUrl.hostname)) {
    return true;
  }
  return false;
}

export function sanitizeBotApiUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  try {
    const parsed = new URL(rawUrl.trim());
    if (!isSafeBotApiUrl(parsed)) {
      return null;
    }

    if (parsed.username || parsed.password) {
      return null;
    }

    const normalizedPath = normalizePathname(parsed.pathname);
    if (normalizedPath !== '/api/autoapply/gpt4') {
      return null;
    }

    parsed.pathname = '/api/autoapply/gpt4';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getDefaultBotApiUrl(isPackaged) {
  if (isPackaged) {
    return 'https://www.jobelix.fr/api/autoapply/gpt4';
  }
  return 'http://localhost:3000/api/autoapply/gpt4';
}
