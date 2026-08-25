import { z } from "zod";
import { paginationSchema } from "../../../common/pagination/pagination.schema.js";

export const listAuditLogsSchema = paginationSchema.extend({
  action: z.string().optional(),
  module: z.string().optional(),
  entityType: z.string().optional(),
  actorRole: z.string().optional(),
  restaurantId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  requestId: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
