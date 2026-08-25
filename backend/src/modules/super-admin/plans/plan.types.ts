import type { z } from "zod";
import type { createPlanSchema, listPlansSchema, updatePlanSchema } from "./plan.validation.js";

export type ListPlansQuery = z.infer<typeof listPlansSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
