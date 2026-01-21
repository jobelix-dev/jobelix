/**
 * Global Rate Limiting Middleware
 * 
 * Limits requests per IP address across all routes.
 * Uses an in-memory store (suitable for single-instance deployments).
 * For production with multiple instances, consider Redis or Upstash.
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 70; // Max requests per IP per minute

// Per-route rate limits (stricter for expensive operations)
const RESUME_UPLOAD_LIMIT = 5; // Max 5 resume uploads per day
const RESUME_EXTRACT_LIMIT = 5; // Max 5 GPT extractions per day
const RESUME_RATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours (1 day)

// In-memory store for rate limiting
// Map<IP, { count: number, resetTime: number }>
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Separate store for resume operations (longer window)
const resumeRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }
  // Also cleanup resume rate limit store
  for (const [ip, data] of resumeRateLimitStore.entries()) {
    if (data.resetTime < now) {
      resumeRateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function getClientIP(request: NextRequest): string {
  // Try multiple headers to get real IP (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cfConnecting = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (cfConnecting) return cfConnecting;
  if (real) return real;
  
  // Fallback to a default (this shouldn't happen in production)
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const data = rateLimitStore.get(ip);

  if (!data || data.resetTime < now) {
    // No data or window expired - create new window
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    });

    return {
      allowed: true,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      reset: now + RATE_LIMIT_WINDOW_MS
    };
  }

  // Increment counter
  data.count++;

  if (data.count > MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit: MAX_REQUESTS_PER_WINDOW,
      remaining: 0,
      reset: data.resetTime
    };
  }

  // Within limits
  return {
    allowed: true,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: MAX_REQUESTS_PER_WINDOW - data.count,
    reset: data.resetTime
  };
}

function checkResumeRateLimit(ip: string, route: 'upload' | 'extract'): { allowed: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const key = `${ip}:${route}`; // Separate counters for upload and extract
  const data = resumeRateLimitStore.get(key);
  const limit = route === 'upload' ? RESUME_UPLOAD_LIMIT : RESUME_EXTRACT_LIMIT;

  if (!data || data.resetTime < now) {
    // No data or window expired - create new window
    resumeRateLimitStore.set(key, {
      count: 1,
      resetTime: now + RESUME_RATE_WINDOW_MS
    });

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: now + RESUME_RATE_WINDOW_MS
    };
  }

  // Increment counter
  data.count++;

  if (data.count > limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset: data.resetTime
    };
  }

  // Within limits
  return {
    allowed: true,
    limit,
    remaining: limit - data.count,
    reset: data.resetTime
  };
}

export function proxy(request: NextRequest) {
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;

  // Check for resume-specific rate limits first (stricter)
  if (pathname === '/api/student/resume' && request.method === 'POST') {
    // Resume upload endpoint
    const resumeCheck = checkResumeRateLimit(ip, 'upload');
    if (!resumeCheck.allowed) {
      const response = NextResponse.json(
        { error: 'Too many resume uploads. You can upload up to 5 resumes per day. Please try again tomorrow.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', resumeCheck.limit.toString());
      response.headers.set('X-RateLimit-Remaining', resumeCheck.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(resumeCheck.reset).toISOString());
      return response;
    }
  }

  if (pathname === '/api/student/profile/draft/extract' && request.method === 'POST') {
    // Resume extraction endpoint (GPT call)
    const extractCheck = checkResumeRateLimit(ip, 'extract');
    if (!extractCheck.allowed) {
      const response = NextResponse.json(
        { error: 'Too many extraction requests. You can extract data from up to 5 resumes per day. Please try again tomorrow.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', extractCheck.limit.toString());
      response.headers.set('X-RateLimit-Remaining', extractCheck.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(extractCheck.reset).toISOString());
      return response;
    }
  }

  // Apply general rate limit to all requests
  const { allowed, limit, remaining, reset } = checkRateLimit(ip);

  // Create response (either continue or block)
  const response = allowed
    ? NextResponse.next()
    : NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );

  // Add rate limit headers (useful for clients to know their limits)
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());

  return response;
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)',
  ],
};
