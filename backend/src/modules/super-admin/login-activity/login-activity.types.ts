import type { z } from "zod";
import type { listLoginActivitySchema } from "./login-activity.validation.js";

export type ListLoginActivityQuery = z.infer<typeof listLoginActivitySchema>;
