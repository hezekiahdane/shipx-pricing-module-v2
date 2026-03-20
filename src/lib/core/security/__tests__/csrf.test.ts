import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateCsrfOrigin } from '../csrf';

function makeRequest(headers: Record<string, string>): Request {
  return new Request('https://myapp.com/api/contact', {
    method: 'POST',
    headers,
  });
}

describe('validateCsrfOrigin()', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://myapp.com';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
  });

  it('allows requests with matching origin', () => {
    const req = makeRequest({ origin: 'https://myapp.com' });
    expect(validateCsrfOrigin(req)).toBe(true);
  });

  it('rejects requests with different origin', () => {
    const req = makeRequest({ origin: 'https://evil.com' });
    expect(validateCsrfOrigin(req)).toBe(false);
  });

  it('allows requests with matching referer', () => {
    const req = makeRequest({ referer: 'https://myapp.com/contact' });
    expect(validateCsrfOrigin(req)).toBe(true);
  });

  it('rejects requests with mismatched referer', () => {
    const req = makeRequest({ referer: 'https://phishing.com/fake' });
    expect(validateCsrfOrigin(req)).toBe(false);
  });

  it('allows requests with no origin or referer (server-to-server)', () => {
    const req = makeRequest({});
    expect(validateCsrfOrigin(req)).toBe(true);
  });

  it('allows all requests in localhost development', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    const req = makeRequest({ origin: 'https://evil.com' });
    expect(validateCsrfOrigin(req)).toBe(true);
  });
});
