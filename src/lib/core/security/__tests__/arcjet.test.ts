import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @arcjet/next before imports
vi.mock('@arcjet/next', () => {
  const mockProtect = vi.fn().mockResolvedValue({
    isDenied: () => false,
    reason: { type: 'ALLOWED' },
  });
  const mockWithRule = vi.fn().mockReturnValue({ protect: mockProtect });
  const mockArcjet = vi.fn().mockReturnValue({
    withRule: mockWithRule,
    protect: mockProtect,
  });
  return {
    default: mockArcjet,
    shield: vi.fn().mockReturnValue({}),
    detectBot: vi.fn().mockReturnValue({}),
    tokenBucket: vi.fn().mockReturnValue({}),
    validateEmail: vi.fn().mockReturnValue({}),
  };
});

describe('Arcjet client', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns allow when ARCJET_KEY is missing', async () => {
    vi.stubEnv('ARCJET_KEY', '');
    const { checkRateLimit } = await import('../arcjet');
    const result = await checkRateLimit('test-ip', 'api');
    expect(result.allowed).toBe(true);
  });

  it('exports rate limit presets', async () => {
    const { rateLimitPresets } = await import('../arcjet');
    expect(rateLimitPresets.contact).toBeDefined();
    expect(rateLimitPresets.api).toBeDefined();
    expect(rateLimitPresets.auth).toBeDefined();
    expect(rateLimitPresets.strict).toBeDefined();
  });

  it('calls Arcjet protect and returns denied when rate limited', async () => {
    vi.stubEnv('ARCJET_KEY', 'test-key-123');
    const { default: arcjetMock } = await import('@arcjet/next');
    const mockProtect = vi.fn().mockResolvedValue({
      isDenied: () => true,
      reason: { type: 'RATE_LIMIT' },
    });
    (arcjetMock as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      withRule: vi.fn().mockReturnValue({ protect: mockProtect }),
      protect: mockProtect,
    });

    const { checkRateLimit } = await import('../arcjet');
    const result = await checkRateLimit('1.2.3.4', 'strict');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('RATE_LIMIT');
  });

  it('returns allow when Arcjet throws an error', async () => {
    vi.stubEnv('ARCJET_KEY', 'test-key-123');
    const { default: arcjetMock } = await import('@arcjet/next');
    const mockProtect = vi.fn().mockRejectedValue(new Error('network error'));
    (arcjetMock as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      withRule: vi.fn().mockReturnValue({ protect: mockProtect }),
      protect: mockProtect,
    });

    const { checkRateLimit } = await import('../arcjet');
    const result = await checkRateLimit('1.2.3.4', 'api');
    expect(result.allowed).toBe(true);
  });
});
