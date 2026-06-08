import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import { authGuard } from '../guard';

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'));
}

describe('authGuard', () => {
  it('allows access to non-protected routes without session', () => {
    const req = makeRequest('/en');
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    expect(result.headers.get('location')).toBeNull();
  });

  it('redirects to login for protected route without session', () => {
    const req = makeRequest('/en/dashboard');
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    expect(result.status).toBe(307);
    expect(result.headers.get('location')).toContain('/login');
  });

  it('allows access to protected route with session', () => {
    const req = makeRequest('/en/dashboard');
    const res = NextResponse.next();
    const result = authGuard(req, res, true);
    expect(result.headers.get('location')).toBeNull();
  });

  it('includes redirect param in login URL', () => {
    const req = makeRequest('/en/settings');
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    const location = result.headers.get('location') ?? '';
    expect(location).toContain('redirect=');
    expect(location).toContain('settings');
  });

  it('does not set redirect param for protocol-relative URL //evil.com', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    // Simulate a manipulated pathname that starts with //
    Object.defineProperty(req.nextUrl, 'pathname', { value: '//evil.com' });
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    const location = result.headers.get('location') ?? '';
    expect(location).not.toContain('evil.com');
    expect(location).not.toContain('redirect=');
  });

  it('does not set redirect param for absolute URL http://evil.com/', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    Object.defineProperty(req.nextUrl, 'pathname', {
      value: 'http://evil.com/',
    });
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    const location = result.headers.get('location') ?? '';
    expect(location).not.toContain('evil.com');
    expect(location).not.toContain('redirect=');
  });

  it('does not set redirect param for absolute URL https://phishing.site', () => {
    const req = new NextRequest(new URL('http://localhost:3000/en/dashboard'));
    Object.defineProperty(req.nextUrl, 'pathname', {
      value: 'https://phishing.site',
    });
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    const location = result.headers.get('location') ?? '';
    expect(location).not.toContain('phishing.site');
    expect(location).not.toContain('redirect=');
  });

  it('sets redirect param for valid relative path /dashboard', () => {
    const req = makeRequest('/en/dashboard');
    const res = NextResponse.next();
    const result = authGuard(req, res, false);
    const location = result.headers.get('location') ?? '';
    expect(location).toContain('redirect=');
    expect(location).toContain('dashboard');
  });

  // Task 5: /cards route protection
  it('allows unauthenticated access to /login', () => {
    const result = authGuard(
      new NextRequest('http://localhost:3000/en/login'),
      NextResponse.next(),
      false,
    );
    expect(result.status).toBe(200);
  });

  it('redirects unauthenticated access to /cards/* routes', () => {
    const result = authGuard(
      new NextRequest('http://localhost:3000/en/cards/QSM'),
      NextResponse.next(),
      false,
    );
    expect(result.status).toBe(307);
    expect(result.headers.get('location')).toContain('/login');
  });

  it('allows authenticated access to /cards/* routes', () => {
    const result = authGuard(
      new NextRequest('http://localhost:3000/en/cards/QSM'),
      NextResponse.next(),
      true,
    );
    expect(result.status).toBe(200);
  });

  it('does not redirect unauthenticated access to /en/ (home guarded by layout)', () => {
    const result = authGuard(
      new NextRequest('http://localhost:3000/en/'),
      NextResponse.next(),
      false,
    );
    expect(result.status).toBe(200);
  });
});
