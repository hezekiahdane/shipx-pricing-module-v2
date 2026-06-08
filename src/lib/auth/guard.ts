import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Exact-match public paths (startsWith would make '/' match everything)
const PUBLIC_EXACT = ['/'];
// Prefix-match public paths
const PUBLIC_PREFIX = ['/login', '/api/auth'];

export function authGuard(
  request: NextRequest,
  response: NextResponse,
  hasSession: boolean,
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';

  const isPublic =
    PUBLIC_EXACT.includes(pathWithoutLocale) ||
    PUBLIC_PREFIX.some((route) => pathWithoutLocale.startsWith(route));

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
