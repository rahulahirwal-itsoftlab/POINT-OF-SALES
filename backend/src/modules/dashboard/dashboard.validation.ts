import { z } from "zod";

export const dashboardQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
