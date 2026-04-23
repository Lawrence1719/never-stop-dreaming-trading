import { z } from 'zod';

export const CouponTypeEnum = z.enum(['percentage', 'fixed', 'free_shipping']);
export const CouponStatusEnum = z.enum(['active', 'inactive']);

const BaseCouponSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(32, 'Code must be 32 characters or less')
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z0-9-]+$/.test(val), {
      message: 'Code must only contain uppercase letters, numbers, and hyphens',
    }),
  type: CouponTypeEnum,
  discount_value: z.number().min(0, 'Discount value must be at least 0'),
  min_purchase: z.number().min(0, 'Minimum purchase must be at least 0'),
  usage_limit: z.number().nullable().optional(),
  per_user_limit: z.number().min(1, 'Per user limit must be at least 1').default(1),
  starts_at: z.string().nullable().optional().transform(val => val === '' ? null : val),
  expires_at: z.string().nullable().optional().transform(val => val === '' ? null : val),
  status: CouponStatusEnum.default('active'),
});

export const CouponSchema = BaseCouponSchema.refine((data) => {
  if (data.type === 'free_shipping' && data.discount_value !== 0) {
    return false;
  }
  return true;
}, {
  message: 'Discount value must be 0 for free shipping coupons',
  path: ['discount_value'],
});

export const CouponUpdateSchema = BaseCouponSchema.partial().omit({ code: true });

export const CouponValidateSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  cart_total: z.number().min(0),
});

export type CouponFormValues = z.infer<typeof CouponSchema>;
export type CouponUpdateValues = z.infer<typeof CouponUpdateSchema>;
export type CouponValidateValues = z.infer<typeof CouponValidateSchema>;
