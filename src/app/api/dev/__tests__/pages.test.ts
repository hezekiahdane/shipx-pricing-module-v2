import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
}));

describe('GET /api/dev/pages', () => {
  // Reset module cache between tests so NODE_ENV changes take effect
  const originalNodeEnv = process.env.NODE_ENV;
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  });

  it('returns discovered pages in development', async () => {
    process.env.NODE_ENV = 'development';
    const { readdirSync } = await import('node:fs');
    vi.mocked(readdirSync).mockImplementation((dir: unknown) => {
      const path = dir as string;
      if (path.endsWith('[locale]')) {
        return [
          { name: 'page.tsx', isDirectory: () => false },
          { name: 'about', isDirectory: () => true },
          // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
        ] as any;
      }
      if (path.endsWith('about')) {
        // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
        return [{ name: 'page.tsx', isDirectory: () => false }] as any;
      }
      // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
      return [] as any;
    });

    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/dev/pages');
    // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.pages).toEqual(
      expect.arrayContaining([
        { path: '/', label: 'Home' },
        { path: '/about', label: 'About' },
      ]),
    );
  });

  it('throws NotFoundError in production', async () => {
    process.env.NODE_ENV = 'production';
    // Remove preview flag so env.NEXT_PUBLIC_VERCEL_ENV is undefined.
    // vi.resetModules() ensures the env module re-initializes from process.env on
    // each dynamic import, so this mutation is visible to the freshly imported route.
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    const { GET } = await import('../route');
    const req = new Request('http://localhost/api/dev/pages');
    // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
    const res = await GET(req as any);

    expect(res.status).toBe(404);
  });
});
