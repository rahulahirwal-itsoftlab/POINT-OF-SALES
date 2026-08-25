import { z } from "zod";
import { paginationSchema } from "../../../common/pagination/pagination.schema.js";

export const listLicensesSchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "EXPIRED", "SUSPENDED", "BLOCKED", "CANCELLED", "REVOKED"]).optional(),
  subscriptionStatus: z.enum(["ACTIVE", "TRIAL", "EXPIRED", "CANCELLED", "SUSPENDED", "PENDING"]).optional(),
  restaurantId: z.string().uuid().optional(),
  expiresInDays: z.string().optional(),
  search: z.string().optional(),
});

const customRenewalPlanSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  waiterLimit: z.coerce.number().int().min(0),
  kitchenLimit: z.coerce.number().int().min(0),
  receptionistLimit: z.coerce.number().int().min(0),
  basePrice: z.coerce.number().min(0),
  gstPercentage: z.coerce.number().min(0).max(100).default(18),
  features: z.array(z.string().min(1).max(120)).default([]),
});

export const renewLicenseSchema = z
  .object({
    renewalType: z.enum(["PREDEFINED", "CUSTOMIZED"]),
    planId: z.string().uuid().optional(),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]),
    durationMonths: z.coerce.number().int().min(1).max(120).optional(),
    startDate: z.coerce.date().optional(),
    customPlan: customRenewalPlanSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.renewalType === "PREDEFINED" && !value.planId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["planId"], message: "Select a predefined plan" });
    }
    if (value.renewalType === "CUSTOMIZED" && !value.customPlan) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customPlan"], message: "Custom plan details are required" });
    }
  });
