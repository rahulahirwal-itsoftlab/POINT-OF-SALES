import { z } from "zod";

export const menuItemIdParamSchema = z.object({ id: z.string().uuid() });
