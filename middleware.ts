import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { buildCspHeader, generateCspNonce } from './src/lib/core/security/csp';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Maintenance mode — rewrite all traffic to /maintenance.
  // Use rewrite (not redirect): a redirect lets intlMiddleware re-prefix the path
  // (/maintenance → /en/maintenance → triggers check again → infinite loop).
  // Enable: set MAINTENANCE_MODE=true in Vercel env vars, then redeploy.
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

  // Both env reads use process.env directly — middleware.ts runs before the
  // Next.js module graph, so @/lib/core/env (Zod-validated) is not available
  // here. NODE_ENV is the standard Next.js static analysis exception; reading
  // NEXT_PUBLIC_VERCEL_ENV directly is intentional and acceptable in middleware.
  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

  const nonce = generateCspNonce();
  const csp = buildCspHeader(nonce);

  if (isDev) {
    const { pathname } = request.nextUrl;
    const rawBlocked = request.cookies.get('devpanel_blocked')?.value ?? '[]';
    let blocked: string[] = [];
    try {
      blocked = JSON.parse(rawBlocked) as string[];
    } catch {
      blocked = [];
    }

    if (blocked.length > 0) {
      const localePrefix = routing.locales.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      );
      const strippedPath = localePrefix
        ? pathname.slice(`/${localePrefix}`.length) || '/'
        : pathname;

      if (blocked.includes(strippedPath)) {
        const locale = localePrefix ?? routing.defaultLocale;
        const rewriteResponse = NextResponse.rewrite(
          new URL(`/${locale}/not-found`, request.url),
        );
        rewriteResponse.headers.set('Content-Security-Policy', csp);
        rewriteResponse.headers.set('x-nonce', nonce);
        return rewriteResponse;
      }
    }
  }

  const response = intlMiddleware(request);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  // Match the root and all locale-prefixed paths, excluding Next.js internals and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
