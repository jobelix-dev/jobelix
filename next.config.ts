import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const isDesktopBundle = process.env.JOBELIX_DESKTOP_BUNDLE === "1";
const desktopBackendOrigin = (process.env.NEXT_DESKTOP_BACKEND_ORIGIN || "https://www.jobelix.fr").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: isDesktopBundle ? "standalone" : undefined,
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    optimizePackageImports: ["lucide-react", "libphonenumber-js"],
  },

  async rewrites() {
    if (!isDesktopBundle) {
      return [];
    }

    // Desktop local bundle: proxy backend/auth endpoints to production backend.
    // This keeps one shared UI codebase while avoiding bundling server secrets.
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${desktopBackendOrigin}/api/:path*`,
        },
        {
          source: "/auth/callback",
          destination: `${desktopBackendOrigin}/auth/callback`,
        },
      ],
    };
  },

  async headers() {
    const securityHeaders = isDev
      ? [
          // In dev: avoid breaking HMR.
          // You can even remove CSP entirely in dev if you want.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com https://js.hcaptcha.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              // ✅ allow Next dev HMR websockets + localhost dev server
              "connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 ws://localhost:3000 ws://127.0.0.1:3000 ws://localhost:* ws://127.0.0.1:* https://api.stripe.com https://api.github.com https://api.openai.com ws://127.0.0.1:54321 wss://127.0.0.1:54321 https://vitals.vercel-insights.com https://va.vercel-scripts.com https://hcaptcha.com https://*.hcaptcha.com " +
                `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} https://*.supabase.co wss://*.supabase.co`,
              "frame-src 'self' https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              // ❌ no upgrade-insecure-requests in dev
            ].join("; "),
          },
        ]
      : [
          // In prod: your full security headers
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com https://js.hcaptcha.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              `connect-src 'self' https://api.stripe.com https://api.github.com https://api.openai.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://hcaptcha.com https://*.hcaptcha.com ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://*.supabase.co wss://*.supabase.co`,
              "frame-src 'self' https://js.stripe.com https://hcaptcha.com https://*.hcaptcha.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: isDev
              ? "no-cache, no-store, must-revalidate"
              : "public, max-age=3600, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
