import { z } from 'zod';

// Used to update tier discount percentages on a rate card.
// All 6 non-PT discount fields are required (null not allowed).
export const discountUpdateSchema = z.object({
  code: z.string().min(1),
  discounts: z.object({
    discountPublic: z.number().min(0).max(100),
    discountTier1: z.number().min(0).max(100),
    discountTier2: z.number().min(0).max(100),
    discountTier3: z.number().min(0).max(100),
    discountTier4: z.number().min(0).max(100),
    discountTier5: z.number().min(0).max(100),
  }),
});

// Used to update tier revenue thresholds.
// Public tier (thresholdMinVnd = null) is excluded — never sent.
// Items must be provided in sortOrder order. Values must be strictly ascending.
export const thresholdUpdateSchema = z
  .array(
    z.object({
      tierKey: z.string().min(1),
      thresholdMinVnd: z.number().int().positive(),
    }),
  )
  .min(1)
  .superRefine((items, ctx) => {
    for (let i = 1; i < items.length; i++) {
      if (items[i].thresholdMinVnd <= items[i - 1].thresholdMinVnd) {
        ctx.addIssue({
          code: 'custom',
          message: 'Thresholds must be strictly ascending',
        });
      }
    }
  });

export type DiscountUpdate = z.infer<typeof discountUpdateSchema>;
export type ThresholdUpdate = z.infer<typeof thresholdUpdateSchema>;
