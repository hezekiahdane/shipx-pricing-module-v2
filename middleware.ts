import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { createMiddlewareClient } from './src/lib/auth/clients/middleware';
import { authGuard } from './src/lib/auth/guard';
import { buildCspHeader, generateCspNonce } from './src/lib/core/security/csp';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

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

  // Refresh Supabase session so server components can read the current user.
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect /cards/* — redirect unauthenticated users to /login.
  const guardResponse = authGuard(request, response, !!session);
  if (guardResponse !== response) {
    guardResponse.headers.set('Content-Security-Policy', csp);
    guardResponse.headers.set('x-nonce', nonce);
    return guardResponse;
  }

  // Apply i18n locale routing (locale prefix, default locale redirect).
  const intlResponse = intlMiddleware(request);
  intlResponse.headers.set('Content-Security-Policy', csp);
  intlResponse.headers.set('x-nonce', nonce);
  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
