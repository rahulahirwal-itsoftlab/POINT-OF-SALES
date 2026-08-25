import { z } from "zod";
import { paginationSchema } from "../../../common/pagination/pagination.schema.js";

export const listLoginActivitySchema = paginationSchema.extend({
  status: z.enum(["SUCCESS", "FAILED", "BLOCKED", "LOGOUT"]).optional(),
  superAdminId: z.string().uuid().optional(),
  adminId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  restaurantId: z.string().uuid().optional(),
});
