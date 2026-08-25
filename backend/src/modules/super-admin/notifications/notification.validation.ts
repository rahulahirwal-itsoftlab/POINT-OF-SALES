import { z } from "zod";
import { paginationSchema } from "../../../common/pagination/pagination.schema.js";

export const listNotificationsSchema = paginationSchema.extend({
  scope: z.enum(["SYSTEM", "RESTAURANT", "USER"]).optional(),
  isRead: z.coerce.boolean().optional(),
  recipientSuperAdminId: z.string().uuid().optional(),
  recipientAdminId: z.string().uuid().optional(),
  recipientEmployeeId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  restaurantId: z.string().uuid().optional(),
});
