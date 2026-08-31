import { z } from "zod";
import { paginationSchema } from "../../common/pagination/pagination.schema.js";
import {
  optionalIndianPhoneSchema,
  requiredNameSchema,
} from "../../common/validation/common-schemas.js";

export const restaurantAdminListStaffSchema = paginationSchema.extend({
  role: z.enum(["WAITER", "RECEPTION", "KITCHEN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "ARCHIVED"]).optional(),
});

const restaurantAdminStaffBaseSchema = z.object({
  fullName: requiredNameSchema,
  email: z.string().trim().toLowerCase().email().max(254),
  phone: optionalIndianPhoneSchema,
  role: z.enum(["WAITER", "RECEPTION", "KITCHEN"]),
  employeeCode: z.string().trim().min(2).max(64).optional(),
  shift: z.string().trim().max(80).optional(),
  assignedSection: z.string().trim().max(80).optional(),
  kitchenStation: z.string().trim().max(80).optional(),
});

function validateRoleFields(input: z.infer<typeof restaurantAdminStaffBaseSchema>, context: z.RefinementCtx) {
  if (input.role === "WAITER" && !input.assignedSection) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["assignedSection"], message: "Assigned section is required for waiters" });
  }
  if (input.role === "KITCHEN" && !input.kitchenStation) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["kitchenStation"], message: "Kitchen station is required for kitchen admins" });
  }
}

export const restaurantAdminCreateStaffSchema = restaurantAdminStaffBaseSchema
  .extend({ password: z.string().min(8).max(128) })
  .superRefine(validateRoleFields);

export const restaurantAdminUpdateStaffSchema = restaurantAdminCreateStaffSchema
  .innerType()
  .omit({ password: true })
  .partial();

export const restaurantAdminStaffStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]),
});

export const restaurantAdminBillsSchema = paginationSchema.extend({
  paymentStatus: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIALLY_PAID"]).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "NET_BANKING", "OTHER"]).optional(),
  status: z.enum(["DRAFT", "PLACED", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]).optional(),
  tableId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const restaurantAdminAuditSchema = paginationSchema.extend({
  module: z.string().trim().optional(),
  action: z.string().trim().optional(),
});

export const restaurantAdminNotificationsSchema = paginationSchema.extend({
  status: z.enum(["unread", "read", "all"]).optional(),
});

export const restaurantAdminRenewSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});
