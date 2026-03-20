import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';
import { generateCspNonce, buildCspHeader } from '@/lib/core/security/csp';

const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(request: NextRequest) {
  // 1. i18n routing
  const response = intlMiddleware(request);

  // 2. CSP nonce generation
  const nonce = generateCspNonce();
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', buildCspHeader(nonce));

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
