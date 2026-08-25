import { z } from "zod";

export const restaurantIdParamSchema = z.object({ id: z.string().uuid() });
