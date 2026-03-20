import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { successResponse } from '../response';
import { withApi } from '../with-api';

// Mock Arcjet to always allow
vi.mock('@/lib/core/security/arcjet', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitPresets: {
    contact: { refillRate: 5, interval: '1m', capacity: 5 },
    api: { refillRate: 60, interval: '1m', capacity: 60 },
    auth: { refillRate: 10, interval: '5m', capacity: 10 },
    strict: { refillRate: 3, interval: '1m', capacity: 3 },
  },
}));

const testSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('withApi', () => {
  it('validates input and passes typed data to handler', async () => {
    const handler = withApi(
      { schema: testSchema, csrf: false },
      async ({ data }) => successResponse(data),
    );

    const req = makeRequest({ name: 'Test', email: 'test@test.com' });
    const res = await handler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Test');
  });

  it('returns 422 for invalid input', async () => {
    const handler = withApi(
      { schema: testSchema, csrf: false },
      async ({ data }) => successResponse(data),
    );

    const req = makeRequest({ name: '', email: 'invalid' });
    const res = await handler(req);

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('works without a schema', async () => {
    const handler = withApi({ csrf: false }, async () =>
      successResponse({ ok: true }),
    );

    const req = makeRequest({});
    const res = await handler(req);

    expect(res.status).toBe(200);
  });

  it('catches AppError and returns correct status', async () => {
    const { NotFoundError } = await import('../errors');
    const handler = withApi({ csrf: false }, async () => {
      throw new NotFoundError('Item not found');
    });

    const req = makeRequest({});
    const res = await handler(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Item not found');
  });

  it('returns 500 for unknown errors', async () => {
    const handler = withApi({ csrf: false }, async () => {
      throw new Error('unexpected');
    });

    const req = makeRequest({});
    const res = await handler(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});
