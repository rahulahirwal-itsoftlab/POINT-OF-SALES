import { z } from "zod";
import { paginationSchema } from "../../../common/pagination/pagination.schema.js";

export const listPaymentsSchema = paginationSchema.extend({
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIALLY_PAID"]).optional(),
  method: z.enum(["CASH", "UPI", "CARD", "NET_BANKING", "OTHER"]).optional(),
  restaurantId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
