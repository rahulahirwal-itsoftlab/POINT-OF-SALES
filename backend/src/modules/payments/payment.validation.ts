import { z } from "zod";

export const paymentIdParamSchema = z.object({ id: z.string().uuid() });
