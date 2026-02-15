/**
 * Next.js Configuration
 * 
 * Configuration for Next.js framework settings.
 * Used by: Next.js build and runtime systems
 * Can configure: Image optimization, redirects, headers, etc.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist v5 is a large ESM library (32K+ lines) that crashes when webpack
  // bundles it for the RSC layer ("Object.defineProperty called on non-object").
  // Externalizing it lets Node.js load it natively via ESM import, which works fine.
  serverExternalPackages: ['pdfjs-dist'],
  // Tree-shake barrel exports for heavy icon/component libraries
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'libphonenumber-js',
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com https://js.hcaptcha.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              `connect-src 'self' https://api.stripe.com https://api.github.com https://api.openai.com ws://127.0.0.1:54321 wss://127.0.0.1:54321 http://127.0.0.1:54321 https://vitals.vercel-insights.com https://va.vercel-scripts.com https://hcaptcha.com https://*.hcaptcha.com ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://*.supabase.co wss://*.supabase.co`,
              "frame-src 'self' https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ],
      },
      {
        // Cache Next.js static assets with shorter TTL for Electron compatibility
        // Long immutable caching (max-age=31536000) causes Electron to serve stale chunks
        // even after rebuilds. Use shorter TTL with must-revalidate to prevent this.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development' 
              ? 'no-cache, no-store, must-revalidate'
              : 'public, max-age=3600, must-revalidate'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
