import { z } from "zod";

export const tableIdParamSchema = z.object({ id: z.string().uuid() });
