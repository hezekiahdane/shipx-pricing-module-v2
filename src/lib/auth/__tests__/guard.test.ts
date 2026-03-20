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
});
