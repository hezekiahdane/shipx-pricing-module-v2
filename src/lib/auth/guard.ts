import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/settings', '/admin', '/cards'];

export function authGuard(
  request: NextRequest,
  response: NextResponse,
  hasSession: boolean,
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathWithoutLocale.startsWith(route),
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    // Only set the redirect param for relative paths to prevent open redirect attacks.
    const isRelativePath =
      pathname.startsWith('/') && !pathname.startsWith('//');
    if (isRelativePath) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
