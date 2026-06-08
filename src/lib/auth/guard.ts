import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/api/auth'];

export function authGuard(
  request: NextRequest,
  response: NextResponse,
  hasSession: boolean,
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  const isPublic = PUBLIC_ROUTES.some((route) =>
    pathWithoutLocale.startsWith(route),
  );

  if (!isPublic && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    const isRelativePath =
      pathname.startsWith('/') && !pathname.startsWith('//');
    if (isRelativePath) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
