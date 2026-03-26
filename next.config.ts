import path from 'node:path';
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Use modern CSP instead of legacy XSS filter
  { key: 'X-XSS-Protection', value: '0' },
  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser feature access
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  // Force HTTPS for 2 years (enable once deployed to production with HTTPS)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy
  // For nonce-based CSP, see src/lib/core/security/csp.ts (requires deeper Next.js integration)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // PPR (cacheComponents: true) is available but requires <Suspense> boundaries
  // around all dynamic data access. Enable once Suspense boundaries are in place.
  // cacheComponents: true,

  // Fix Turbopack workspace root detection when running inside a git worktree.
  // Without this, Turbopack detects the parent project's lockfile and treats it
  // as the workspace root, causing it to compile sibling worktree files as
  // additional app routes — which fails because those files may use Node.js APIs.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Disable the "Powered by Next.js" header
  poweredByHeader: false,

  // Enable gzip compression
  compress: true,

  // Strict React mode catches potential issues early
  reactStrictMode: true,

  // Image optimization config
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Prevent browsers from serving stale HTML after a deploy.
        // Static assets (_next/static) are excluded — they use content-hashed
        // filenames and are safe to cache indefinitely.
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default withAnalyzer(withNextIntl(nextConfig));
