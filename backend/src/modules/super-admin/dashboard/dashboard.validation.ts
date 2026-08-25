import { z } from "zod";

export const dashboardDateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
