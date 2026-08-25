import { z } from "zod";
import { paginationSchema } from "../../common/pagination/pagination.schema.js";
import {
  indianPhoneSchema,
  nullableImageUrlSchema,
  optionalDescriptionSchema,
  optionalEmailSchema,
  optionalNotesSchema,
  percentageSchema,
  positiveMoneySchema,
  quantitySchema,
  requiredNameSchema,
} from "../../common/validation/common-schemas.js";

export const createCategorySchema = z.object({
  name: requiredNameSchema,
  description: optionalDescriptionSchema,
  isActive: z.boolean().optional(),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: requiredNameSchema,
  description: optionalDescriptionSchema.nullable().optional(),
  price: positiveMoneySchema,
  taxRate: percentageSchema.optional(),
  imageUrl: nullableImageUrlSchema,
  imagePublicId: z.string().trim().min(1).max(255).nullable().optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  tableId: z.string().uuid().optional(),
  notes: optionalNotesSchema,
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: quantitySchema,
    notes: optionalNotesSchema,
  })).min(1),
});

export const assignTableSchema = z.object({
  customerName: requiredNameSchema,
  customerPhone: indianPhoneSchema,
  customerEmail: optionalEmailSchema,
});

export const tableStatusSchema = z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "OUT_OF_SERVICE"]);

export const createTableSchema = z.object({
  tableNumber: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, "Table number contains unsupported characters"),
  capacity: z.coerce.number().int().min(1).max(100),
});

export const updateTableSchema = createTableSchema.partial();

export const updateTableStatusSchema = z.object({
  status: tableStatusSchema,
});

export const addOrderItemsSchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: quantitySchema,
    notes: optionalNotesSchema,
  })).min(1),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PLACED", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]),
});

export const paymentSchema = z.object({
  amount: positiveMoneySchema,
  method: z.enum(["CASH", "UPI", "CARD", "NET_BANKING", "OTHER"]),
});

export const listOrdersSchema = paginationSchema.extend({
  status: z.enum(["DRAFT", "PLACED", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIALLY_PAID"]).optional(),
  search: z.string().optional(),
});
