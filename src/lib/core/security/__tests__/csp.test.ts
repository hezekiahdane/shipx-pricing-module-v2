import { describe, expect, it } from 'vitest';
import { buildCspHeader, generateCspNonce } from '../csp';

describe('generateCspNonce', () => {
  it('returns a base64 string', () => {
    const nonce = generateCspNonce();
    expect(() => Buffer.from(nonce, 'base64')).not.toThrow();
  });

  it('returns a string of expected length (16 bytes = 22-24 base64 chars)', () => {
    const nonce = generateCspNonce();
    expect(nonce.length).toBeGreaterThanOrEqual(22);
    expect(nonce.length).toBeLessThanOrEqual(24);
  });

  it('generates unique nonces on each call', () => {
    const nonce1 = generateCspNonce();
    const nonce2 = generateCspNonce();
    expect(nonce1).not.toBe(nonce2);
  });
});

describe('buildCspHeader', () => {
  it('includes the nonce in script-src', () => {
    const nonce = 'test-nonce-123';
    const header = buildCspHeader(nonce);
    expect(header).toContain("'nonce-test-nonce-123'");
  });

  it('includes strict-dynamic', () => {
    const header = buildCspHeader('test');
    expect(header).toContain("'strict-dynamic'");
  });

  it('includes frame-ancestors none', () => {
    const header = buildCspHeader('test');
    expect(header).toContain("frame-ancestors 'none'");
  });
});
