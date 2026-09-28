import { z } from "zod";

export const superAdminInputSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(160),
  email: z.string().email("Invalid email format").max(160),
  phone: z.string().max(32).optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional().default("ACTIVE"),
});

export const superAdminUpdateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  phone: z.string().max(32).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
});

export const superAdminStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]),
});

export const licenseRenewalSchema = z.object({
  durationMonths: z.number().int().min(1).max(60).default(12),
});
