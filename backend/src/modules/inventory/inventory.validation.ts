import { z } from "zod";
import { paginationSchema } from "../../common/pagination/pagination.schema.js";

export const inventoryUnitSchema = z.enum(["kg", "g", "litre", "ml", "pcs", "packet", "bottle", "box", "dozen"]);

export const inventoryCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const inventoryCategoryUpdateSchema = inventoryCategoryInputSchema.partial();

export const inventoryItemInputSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(80).optional().nullable(),
  unit: inventoryUnitSchema,
  currentQuantity: z.coerce.number().min(0).max(999999999).default(0),
  minimumQuantity: z.coerce.number().min(0).max(999999999).default(0),
  description: z.string().trim().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const inventoryItemUpdateSchema = inventoryItemInputSchema.omit({ currentQuantity: true }).partial();

export const stockAdjustmentSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  quantity: z.coerce.number().positive().max(999999999),
  unit: inventoryUnitSchema,
  reason: z.string().trim().min(2).max(500),
});

export const stockMovementQuerySchema = paginationSchema.extend({
  inventoryItemId: z.string().uuid().optional(),
  movementType: z.string().trim().max(40).optional(),
});

export const recipeIngredientInputSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.coerce.number().positive().max(999999999),
  unit: inventoryUnitSchema,
});

const recipeBaseSchema = z.object({
  menuCategoryId: z.string().uuid().optional(),
  menuItemId: z.string().uuid(),
  servingQuantity: z.coerce.number().positive().max(999999).default(1),
  servingUnit: z.string().trim().min(1).max(40).default("plate"),
  isActive: z.boolean().optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1),
});

function validateDuplicateIngredients(input: { ingredients?: Array<{ inventoryItemId: string }> }, ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  input.ingredients?.forEach((ingredient, index) => {
    if (seen.has(ingredient.inventoryItemId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ingredients", index, "inventoryItemId"],
        message: "Duplicate ingredients are not allowed",
      });
    }
    seen.add(ingredient.inventoryItemId);
  });
}

export const recipeInputSchema = recipeBaseSchema.superRefine(validateDuplicateIngredients);

export const recipeUpdateSchema = recipeBaseSchema.partial().superRefine(validateDuplicateIngredients);

export const inventoryListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
});
