import arcjet, {
  shield,
  detectBot,
  tokenBucket,
  validateEmail,
} from '@arcjet/next';

export const rateLimitPresets = {
  contact: { refillRate: 5, interval: '1m', capacity: 5 },
  api: { refillRate: 60, interval: '1m', capacity: 60 },
  auth: { refillRate: 10, interval: '5m', capacity: 10 },
  strict: { refillRate: 3, interval: '1m', capacity: 3 },
} as const;

export type RateLimitPreset = keyof typeof rateLimitPresets;

let warnedOnce = false;

function isArcjetConfigured(): boolean {
  const configured = !!process.env.ARCJET_KEY;
  if (!configured && !warnedOnce) {
    console.warn(
      'ARCJET_KEY not set — security protections disabled (rate limiting, WAF, bot detection)',
    );
    warnedOnce = true;
  }
  return configured;
}

const aj = arcjet({
  key: process.env.ARCJET_KEY ?? 'dummy-key-for-init',
  characteristics: ['ip.src'],
  rules: [
    shield({ mode: 'LIVE' }),
    detectBot({ mode: 'LIVE', allow: ['CATEGORY:SEARCH_ENGINE'] }),
  ],
});

interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

export async function checkRateLimit(
  ip: string,
  preset: RateLimitPreset,
): Promise<RateLimitResult> {
  if (!isArcjetConfigured()) {
    return { allowed: true };
  }

  try {
    const config = rateLimitPresets[preset];

    const ajWithRate = aj.withRule(
      tokenBucket({
        mode: 'LIVE',
        refillRate: config.refillRate,
        interval: config.interval,
        capacity: config.capacity,
      }),
    );

    const decision = await ajWithRate.protect(
      { ip, headers: new Headers() } as Parameters<
        typeof ajWithRate.protect
      >[0],
      { requested: 1 },
    );

    return {
      allowed: !decision.isDenied(),
      reason: decision.isDenied() ? decision.reason.type : undefined,
    };
  } catch (error) {
    console.error('Arcjet error (allowing request):', error);
    return { allowed: true };
  }
}

export async function checkEmail(email: string): Promise<boolean> {
  if (!isArcjetConfigured()) {
    return true;
  }

  try {
    const ajWithEmail = aj.withRule(
      validateEmail({
        mode: 'LIVE',
        deny: ['DISPOSABLE', 'INVALID', 'NO_MX_RECORDS'],
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decision = await (ajWithEmail.protect as any)({
      ip: '127.0.0.1',
      headers: new Headers(),
      email,
    });

    return !decision.isDenied();
  } catch (error) {
    console.error('Arcjet email validation error (allowing):', error);
    return true;
  }
}
