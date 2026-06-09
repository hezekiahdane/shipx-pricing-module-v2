import { describe, expect, it } from 'vitest';
import {
  discountUpdateSchema,
  thresholdUpdateSchema,
} from '../rate-cards.schema';

// ── discountUpdateSchema ──────────────────────────────────────────────────────

const validDiscountPayload = {
  code: 'CARD-001',
  discounts: {
    discountPublic: 0,
    discountTier1: 5,
    discountTier2: 10,
    discountTier3: 15,
    discountTier4: 20,
    discountTier5: 25,
  },
};

describe('discountUpdateSchema', () => {
  it('accepts a valid payload', () => {
    const result = discountUpdateSchema.safeParse(validDiscountPayload);
    expect(result.success).toBe(true);
  });

  it('accepts boundary values (0 and 100)', () => {
    const result = discountUpdateSchema.safeParse({
      code: 'CARD-001',
      discounts: {
        discountPublic: 0,
        discountTier1: 100,
        discountTier2: 0,
        discountTier3: 100,
        discountTier4: 0,
        discountTier5: 100,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a value above 100', () => {
    const result = discountUpdateSchema.safeParse({
      ...validDiscountPayload,
      discounts: { ...validDiscountPayload.discounts, discountTier1: 100.01 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a value below 0', () => {
    const result = discountUpdateSchema.safeParse({
      ...validDiscountPayload,
      discounts: { ...validDiscountPayload.discounts, discountPublic: -0.01 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing discount field', () => {
    const { discountTier5: _omitted, ...incompleteDiscounts } =
      validDiscountPayload.discounts;
    const result = discountUpdateSchema.safeParse({
      code: 'CARD-001',
      discounts: incompleteDiscounts,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty code', () => {
    const result = discountUpdateSchema.safeParse({
      ...validDiscountPayload,
      code: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing code', () => {
    const { code: _omitted, ...rest } = validDiscountPayload;
    const result = discountUpdateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// ── thresholdUpdateSchema ─────────────────────────────────────────────────────

const validThresholds = [
  { tierKey: 'tier1', thresholdMinVnd: 20_000_000 },
  { tierKey: 'tier2', thresholdMinVnd: 50_000_000 },
  { tierKey: 'tier3', thresholdMinVnd: 100_000_000 },
];

describe('thresholdUpdateSchema', () => {
  it('accepts a valid strictly ascending array', () => {
    const result = thresholdUpdateSchema.safeParse(validThresholds);
    expect(result.success).toBe(true);
  });

  it('accepts a single-element array', () => {
    const result = thresholdUpdateSchema.safeParse([
      { tierKey: 'tier1', thresholdMinVnd: 20_000_000 },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects a non-ascending array with "strictly ascending" message', () => {
    const result = thresholdUpdateSchema.safeParse([
      { tierKey: 'tier1', thresholdMinVnd: 50_000_000 },
      { tierKey: 'tier2', thresholdMinVnd: 20_000_000 },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('strictly ascending'))).toBe(true);
    }
  });

  it('rejects equal consecutive values (not strictly ascending)', () => {
    const result = thresholdUpdateSchema.safeParse([
      { tierKey: 'tier1', thresholdMinVnd: 20_000_000 },
      { tierKey: 'tier2', thresholdMinVnd: 20_000_000 },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('strictly ascending'))).toBe(true);
    }
  });

  it('rejects an empty array', () => {
    const result = thresholdUpdateSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer thresholdMinVnd', () => {
    const result = thresholdUpdateSchema.safeParse([
      { tierKey: 'tier1', thresholdMinVnd: 20_000_000.5 },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects a negative thresholdMinVnd', () => {
    const result = thresholdUpdateSchema.safeParse([
      { tierKey: 'tier1', thresholdMinVnd: -1 },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects zero thresholdMinVnd (must be positive)', () => {
    const result = thresholdUpdateSchema.safeParse([
      { tierKey: 'tier1', thresholdMinVnd: 0 },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects an empty tierKey', () => {
    const result = thresholdUpdateSchema.safeParse([
      { tierKey: '', thresholdMinVnd: 20_000_000 },
    ]);
    expect(result.success).toBe(false);
  });
});
