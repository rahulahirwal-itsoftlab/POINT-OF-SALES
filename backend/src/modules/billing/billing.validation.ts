import { z } from "zod";

export const billIdParamSchema = z.object({ id: z.string().uuid() });
