import { z } from "zod";
import { paginationSchema } from "../../../common/pagination/pagination.schema.js";

export const listSubscriptionsSchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "TRIAL", "EXPIRED", "CANCELLED", "SUSPENDED", "PENDING"]).optional(),
  paymentStatus: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIALLY_PAID"]).optional(),
  organizationId: z.string().uuid().optional(),
  restaurantId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
  expiresInDays: z.coerce.number().int().positive().max(365).optional(),
  startFrom: z.string().datetime().optional(),
  startTo: z.string().datetime().optional(),
  expiryFrom: z.string().datetime().optional(),
  expiryTo: z.string().datetime().optional(),
});

export const createSubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  restaurantId: z.string().uuid().optional(),
  planId: z.string().uuid(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  price: z.number().min(0).optional(),
  currency: z.string().trim().length(3).default("INR"),
  startDate: z.string().datetime(),
  durationMonths: z.number().int().positive().max(120),
  renewalDate: z.string().datetime().optional(),
  status: z.enum(["ACTIVE", "TRIAL", "PENDING"]).default("ACTIVE"),
});

export const renewSubscriptionSchema = z.object({
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  price: z.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  startDate: z.string().datetime().optional(),
  durationMonths: z.number().int().positive().max(120),
  renewalDate: z.string().datetime().optional(),
});

export const updateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
  price: z.coerce.number().min(0, "Price must be positive").optional(),
  currency: z.string().trim().length(3).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  durationMonths: z.coerce.number().int().positive().max(120).optional(),
  renewalDate: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "TRIAL", "EXPIRED", "CANCELLED", "SUSPENDED", "PENDING"]).optional(),
  reason: z.string().max(255).optional(),
}).superRefine((input, ctx) => {
  if (input.startDate && input.endDate && input.endDate <= input.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be after start date" });
  }
});
