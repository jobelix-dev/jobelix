/**
 * Global proxy middleware.
 *
 * Responsibilities:
 * 1. Supabase auth session refresh (keeps users logged in)
 * 2. IP-based rate limiting for public and auth-sensitive endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  checkDualWindowLimit,
  checkSingleWindowLimit,
  createRateLimitStore,
} from '@/lib/server/proxyRateLimits';
import { PROXY_RATE_LIMIT_POLICIES } from '@/lib/shared/rateLimitPolicies';

const GENERAL_LIMIT = PROXY_RATE_LIMIT_POLICIES.general;
const RESUME_UPLOAD_LIMIT = PROXY_RATE_LIMIT_POLICIES.resumeUpload;
const RESUME_EXTRACT_LIMIT = PROXY_RATE_LIMIT_POLICIES.resumeExtract;
const AUTH_LIMIT = PROXY_RATE_LIMIT_POLICIES.authAttempts;
const NEWSLETTER_LIMIT = PROXY_RATE_LIMIT_POLICIES.newsletter;
const FEEDBACK_LIMIT = PROXY_RATE_LIMIT_POLICIES.feedback;

// In-memory counters (per process)
const requestRateLimitStore = createRateLimitStore();
const resumeRateLimitStore = createRateLimitStore();
const authRateLimitStore = createRateLimitStore();
const newsletterHourlyStore = createRateLimitStore();
const newsletterDailyStore = createRateLimitStore();
const feedbackHourlyStore = createRateLimitStore();
const feedbackDailyStore = createRateLimitStore();

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cfConnecting = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (cfConnecting) return cfConnecting;
  if (real) return real;
  return 'unknown';
}

function checkGeneralRateLimit(ip: string) {
  return checkSingleWindowLimit(
    requestRateLimitStore,
    ip,
    GENERAL_LIMIT.limit,
    GENERAL_LIMIT.windowMs
  );
}

function checkResumeRateLimit(ip: string, route: 'upload' | 'extract') {
  const key = `${ip}:${route}`;
  const policy = route === 'upload' ? RESUME_UPLOAD_LIMIT : RESUME_EXTRACT_LIMIT;
  return checkSingleWindowLimit(resumeRateLimitStore, key, policy.limit, policy.windowMs);
}

function checkAuthRateLimit(ip: string) {
  return checkSingleWindowLimit(authRateLimitStore, ip, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs);
}

function checkNewsletterRateLimit(ip: string) {
  return checkDualWindowLimit(
    newsletterHourlyStore,
    newsletterDailyStore,
    ip,
    NEWSLETTER_LIMIT.hourlyLimit,
    NEWSLETTER_LIMIT.dailyLimit
  );
}

function checkFeedbackRateLimit(ip: string) {
  return checkDualWindowLimit(
    feedbackHourlyStore,
    feedbackDailyStore,
    ip,
    FEEDBACK_LIMIT.hourlyLimit,
    FEEDBACK_LIMIT.dailyLimit
  );
}

/**
 * Refresh Supabase auth session.
 * Required for cookie rotation and session longevity.
 */
async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}

export async function proxy(request: NextRequest) {
  // Desktop local bundle mode: API/auth are proxied remotely via rewrites,
  // so local middleware should stay no-op.
  if (process.env.NEXT_DESKTOP_PROXY_API === '1') {
    return NextResponse.next({ request });
  }

  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;

  if (pathname === '/api/student/resume' && request.method === 'POST') {
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

  if (pathname.startsWith('/api/auth/') && (request.method === 'POST' || request.method === 'PUT')) {
    const authCheck = checkAuthRateLimit(ip);
    if (!authCheck.allowed) {
      const response = NextResponse.json(
        { error: 'Too many authentication attempts. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', authCheck.limit.toString());
      response.headers.set('X-RateLimit-Remaining', authCheck.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(authCheck.reset).toISOString());
      return response;
    }
  }

  if (pathname === '/api/newsletter' && request.method === 'POST') {
    const newsletterCheck = checkNewsletterRateLimit(ip);
    if (!newsletterCheck.allowed) {
      const response = NextResponse.json(
        { error: 'Too many subscription attempts. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Hourly-Limit', NEWSLETTER_LIMIT.hourlyLimit.toString());
      response.headers.set('X-RateLimit-Daily-Limit', NEWSLETTER_LIMIT.dailyLimit.toString());
      response.headers.set('X-RateLimit-Hourly-Remaining', newsletterCheck.hourlyRemaining.toString());
      response.headers.set('X-RateLimit-Daily-Remaining', newsletterCheck.dailyRemaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(newsletterCheck.reset).toISOString());
      return response;
    }
  }

  if (pathname === '/api/feedback' && request.method === 'POST') {
    const feedbackCheck = checkFeedbackRateLimit(ip);
    if (!feedbackCheck.allowed) {
      const response = NextResponse.json(
        { error: 'Too many feedback submissions. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Hourly-Limit', FEEDBACK_LIMIT.hourlyLimit.toString());
      response.headers.set('X-RateLimit-Daily-Limit', FEEDBACK_LIMIT.dailyLimit.toString());
      response.headers.set('X-RateLimit-Hourly-Remaining', feedbackCheck.hourlyRemaining.toString());
      response.headers.set('X-RateLimit-Daily-Remaining', feedbackCheck.dailyRemaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(feedbackCheck.reset).toISOString());
      return response;
    }
  }

  const generalLimit = checkGeneralRateLimit(ip);
  if (!generalLimit.allowed) {
    const response = NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('X-RateLimit-Limit', generalLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', generalLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(generalLimit.reset).toISOString());
    return response;
  }

  const response = await updateSupabaseSession(request);
  response.headers.set('X-RateLimit-Limit', generalLimit.limit.toString());
  response.headers.set('X-RateLimit-Remaining', generalLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(generalLimit.reset).toISOString());
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)',
  ],
};
