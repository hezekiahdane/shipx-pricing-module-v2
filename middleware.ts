import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { authGuard } from './src/lib/auth/guard';
import { buildCspHeader, generateCspNonce } from './src/lib/core/security/csp';

export default async function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

  const nonce = generateCspNonce();
  const csp = buildCspHeader(nonce);

  // Check NextAuth JWT to determine authentication status.
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  // Protect /admin/* — redirect unauthenticated users to /login.
  const response = NextResponse.next({ request });
  const guardResponse = authGuard(request, response, !!token);
  if (guardResponse !== response) {
    guardResponse.headers.set('Content-Security-Policy', csp);
    guardResponse.headers.set('x-nonce', nonce);
    return guardResponse;
  }

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
