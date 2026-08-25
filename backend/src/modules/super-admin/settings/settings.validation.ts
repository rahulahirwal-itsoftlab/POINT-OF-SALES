import { z } from "zod";

export const updateSettingSchema = z.object({
  platformName: z.string().min(1).max(160).optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().max(32).optional().or(z.literal("")),
  defaultCurrency: z.string().max(10).optional(),
  defaultTimezone: z.string().max(64).optional(),
  licenseWarningDays: z.coerce.number().int().min(1).optional(),
  defaultMonthlyPrice: z.coerce.number().min(0).optional(),
  defaultYearlyPrice: z.coerce.number().min(0).optional(),
  maintenanceMode: z.boolean().optional(),
});
