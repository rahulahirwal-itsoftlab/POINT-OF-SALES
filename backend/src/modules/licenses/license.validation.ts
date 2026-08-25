import { z } from "zod";

export const licenseIdParamSchema = z.object({ id: z.string().uuid() });
