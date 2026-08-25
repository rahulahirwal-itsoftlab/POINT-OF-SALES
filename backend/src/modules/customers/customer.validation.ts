import { z } from "zod";

export const customerIdParamSchema = z.object({ id: z.string().uuid() });
