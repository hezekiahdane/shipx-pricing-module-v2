'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/database';
import { rateCards, tierThresholds } from '@/lib/database/schema';
import { discountUpdateSchema, thresholdUpdateSchema } from '@/lib/validators';

export async function updateRateCardDiscounts(
  code: string,
  discounts: {
    discountPublic: number;
    discountTier1: number;
    discountTier2: number;
    discountTier3: number;
    discountTier4: number;
    discountTier5: number;
  },
): Promise<{ error?: string }> {
  const parsed = discountUpdateSchema.safeParse({ code, discounts });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const db = getDb();
    const result = await db
      .update(rateCards)
      .set({
        discountPublic: String(parsed.data.discounts.discountPublic),
        discountTier1: String(parsed.data.discounts.discountTier1),
        discountTier2: String(parsed.data.discounts.discountTier2),
        discountTier3: String(parsed.data.discounts.discountTier3),
        discountTier4: String(parsed.data.discounts.discountTier4),
        discountTier5: String(parsed.data.discounts.discountTier5),
      })
      .where(eq(rateCards.code, parsed.data.code))
      .returning({ code: rateCards.code });
    if (result.length === 0) {
      return { error: 'Rate card not found.' };
    }
    revalidatePath('/admin');
    return {};
  } catch {
    return { error: 'Failed to save discounts. Please try again.' };
  }
}

export async function updateTierThresholds(
  updates: { tierKey: string; thresholdMinVnd: number }[],
): Promise<{ error?: string }> {
  const parsed = thresholdUpdateSchema.safeParse(updates);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const results = await Promise.all(
        parsed.data.map((u) =>
          tx
            .update(tierThresholds)
            .set({ thresholdMinVnd: String(u.thresholdMinVnd) })
            .where(eq(tierThresholds.tierKey, u.tierKey))
            .returning({ tierKey: tierThresholds.tierKey }),
        ),
      );
      const notFound = parsed.data
        .filter((_, i) => results[i].length === 0)
        .map((u) => u.tierKey);
      if (notFound.length > 0) {
        throw new Error(`Tier key(s) not found: ${notFound.join(', ')}`);
      }
    });
    revalidatePath('/admin');
    return {};
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to save thresholds. Please try again.';
    return { error: message };
  }
}
