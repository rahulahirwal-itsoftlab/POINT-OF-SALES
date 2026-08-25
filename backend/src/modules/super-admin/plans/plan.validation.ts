import { z } from "zod";
import { paginationSchema } from "../../../common/pagination/pagination.schema.js";

export const listPlansSchema = paginationSchema.extend({
  isActive: z.coerce.boolean().optional(),
});

export const createPlanSchema = z.object({
  code: z.string().min(2).max(64).optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  planType: z.enum(["PREDEFINED"]).default("PREDEFINED"),
  monthlyPrice: z.coerce.number().positive(),
  yearlyPrice: z.coerce.number().positive(),
  durationMonths: z.coerce.number().int().positive().max(120).default(1),
  gstPercentage: z.coerce.number().finite().min(0).max(28).default(18),
  features: z.array(z.string()).default([]),
  waiterLimit: z.coerce.number().int().positive().max(500),
  kitchenLimit: z.coerce.number().int().positive().max(500),
  receptionistLimit: z.coerce.number().int().positive().max(500),
  maxUsers: z.coerce.number().int().positive().optional(),
  maxTables: z.coerce.number().int().positive().optional(),
  maxMenuItems: z.coerce.number().int().positive().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const updatePlanSchema = createPlanSchema.partial();

export const planStatusSchema = z.object({
  isActive: z.boolean(),
});
