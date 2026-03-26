import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Both env reads use process.env directly — middleware.ts runs before the
  // Next.js module graph, so @/lib/core/env (Zod-validated) is not available
  // here. NODE_ENV is the standard Next.js static analysis exception; reading
  // NEXT_PUBLIC_VERCEL_ENV directly is intentional and acceptable in middleware.
  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

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
        return NextResponse.rewrite(
          new URL(`/${locale}/not-found`, request.url),
        );
      }
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match the root and all locale-prefixed paths, excluding Next.js internals and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
