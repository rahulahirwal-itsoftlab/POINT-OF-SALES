import { z } from "zod";

export const subscriptionIdParamSchema = z.object({ id: z.string().uuid() });
