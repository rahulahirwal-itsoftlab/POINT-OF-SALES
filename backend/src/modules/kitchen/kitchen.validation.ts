import { z } from "zod";

export const kitchenOrderIdParamSchema = z.object({ id: z.string().uuid() });
