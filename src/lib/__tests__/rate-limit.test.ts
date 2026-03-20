import { beforeEach, describe, expect, it } from 'vitest';
import { createRateLimiter } from '../rate-limit';

describe('createRateLimiter()', () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
  });

  it('allows requests within the limit', () => {
    expect(limiter.check('user-1').success).toBe(true);
    expect(limiter.check('user-1').success).toBe(true);
    expect(limiter.check('user-1').success).toBe(true);
  });

  it('blocks requests that exceed the limit', () => {
    limiter.check('user-2');
    limiter.check('user-2');
    limiter.check('user-2');
    const result = limiter.check('user-2');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    limiter.check('user-3');
    limiter.check('user-3');
    limiter.check('user-3');
    // user-4 should still be within limit
    expect(limiter.check('user-4').success).toBe(true);
  });

  it('returns correct remaining count', () => {
    const first = limiter.check('user-5');
    expect(first.remaining).toBe(2);
    const second = limiter.check('user-5');
    expect(second.remaining).toBe(1);
  });
});
