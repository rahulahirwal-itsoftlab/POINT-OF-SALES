import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { AppError } from "../../common/errors/app-error.js";
import { db } from "../../config/database.js";
import {
  auditLogs,
  inventoryCategories,
  inventoryItems,
  menuCategories,
  menuItems,
  notifications,
  orderItemInventoryConsumptions,
  orderItems,
  recipeIngredients,
  recipes,
  stockMovements,
} from "../../db/schema/index.js";
import type { z } from "zod";
import type {
  inventoryCategoryInputSchema,
  inventoryCategoryUpdateSchema,
  inventoryItemInputSchema,
  inventoryItemUpdateSchema,
  inventoryListQuerySchema,
  recipeInputSchema,
  recipeUpdateSchema,
  stockAdjustmentSchema,
  stockMovementQuerySchema,
} from "./inventory.validation.js";

type Tenant = { organizationId: string; restaurantId: string; userId?: string; role?: string };
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type AuditActorRole = "SUPER_ADMIN" | "ADMIN" | "RESTAURANT_ADMIN" | "WAITER" | "KITCHEN" | "RECEPTION";
type CategoryInput = z.infer<typeof inventoryCategoryInputSchema>;
type CategoryUpdate = z.infer<typeof inventoryCategoryUpdateSchema>;
type ItemInput = z.infer<typeof inventoryItemInputSchema>;
type ItemUpdate = z.infer<typeof inventoryItemUpdateSchema>;
type ListQuery = z.infer<typeof inventoryListQuerySchema>;
type MovementQuery = z.infer<typeof stockMovementQuerySchema>;
type AdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
type RecipeInput = z.infer<typeof recipeInputSchema>;
type RecipeUpdate = z.infer<typeof recipeUpdateSchema>;

const compatibleUnits: Record<string, Record<string, number>> = {
  kg: { kg: 1, g: 1000 },
  g: { g: 1, kg: 0.001 },
  litre: { litre: 1, ml: 1000 },
  ml: { ml: 1, litre: 0.001 },
  pcs: { pcs: 1 },
  packet: { packet: 1 },
  bottle: { bottle: 1 },
  box: { box: 1 },
  dozen: { dozen: 1 },
};

function page(query: { page?: number; limit?: number }) {
  const pageNumber = query.page ?? 1;
  const limit = query.limit ?? 20;
  return { page: pageNumber, limit, offset: (pageNumber - 1) * limit };
}

function num(value: unknown) {
  return Number(value ?? 0);
}

function stockStatus(current: unknown, minimum: unknown) {
  const currentValue = num(current);
  if (currentValue <= 0) return "OUT_OF_STOCK";
  if (currentValue <= num(minimum)) return "LOW_STOCK";
  return "IN_STOCK";
}

function convertQuantity(quantity: number, fromUnit: string, toUnit: string) {
  const factor = compatibleUnits[toUnit]?.[fromUnit];
  if (!factor) {
    throw new AppError(`Cannot convert ${fromUnit} to ${toUnit}`, 422, "INCOMPATIBLE_UNITS", { fromUnit, toUnit });
  }
  return quantity / factor;
}

export class InventoryRepository {
  async overview(tenant: Tenant) {
    const [categories] = await db.select({ value: count() }).from(inventoryCategories).where(this.tenantWhere(inventoryCategories, tenant));
    const [items] = await db.select({
      total: count(),
      low: sql<number>`count(*) filter (where ${inventoryItems.currentQuantity} > 0 and ${inventoryItems.currentQuantity} <= ${inventoryItems.minimumQuantity})`,
      out: sql<number>`count(*) filter (where ${inventoryItems.currentQuantity} <= 0)`,
    }).from(inventoryItems).where(and(this.tenantWhere(inventoryItems, tenant), eq(inventoryItems.isActive, true)));
    const [recipeCount] = await db.select({ value: count() }).from(recipes).where(this.tenantWhere(recipes, tenant));
    const latestMovements = await this.listMovements(tenant, { page: 1, limit: 6 });
    return {
      categories: categories.value,
      items: items.total,
      lowStockItems: Number(items.low ?? 0),
      outOfStockItems: Number(items.out ?? 0),
      recipes: recipeCount.value,
      latestMovements: latestMovements.rows,
    };
  }

  async listCategories(tenant: Tenant) {
    const rows = await db.select({
      id: inventoryCategories.id,
      name: inventoryCategories.name,
      description: inventoryCategories.description,
      isActive: inventoryCategories.isActive,
      createdAt: inventoryCategories.createdAt,
      updatedAt: inventoryCategories.updatedAt,
      itemCount: count(inventoryItems.id),
    }).from(inventoryCategories)
      .leftJoin(inventoryItems, and(eq(inventoryItems.categoryId, inventoryCategories.id), eq(inventoryItems.isActive, true)))
      .where(this.tenantWhere(inventoryCategories, tenant))
      .groupBy(inventoryCategories.id)
      .orderBy(desc(inventoryCategories.createdAt));
    return rows;
  }

  async createCategory(tenant: Tenant, input: CategoryInput) {
    await this.assertCategoryNameAvailable(tenant, input.name);
    const [row] = await db.insert(inventoryCategories).values({
      organizationId: tenant.organizationId,
      restaurantId: tenant.restaurantId,
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
    }).returning();
    await this.audit(tenant, "INVENTORY_CATEGORY_CREATED", "INVENTORY", "inventory_category", row.id, row.name);
    return row;
  }

  async updateCategory(tenant: Tenant, id: string, input: CategoryUpdate) {
    const [existing] = await db.select().from(inventoryCategories).where(and(eq(inventoryCategories.id, id), this.tenantWhere(inventoryCategories, tenant))).limit(1);
    if (!existing) throw new AppError("Inventory category not found", 404, "INVENTORY_CATEGORY_NOT_FOUND");
    if (input.name && input.name !== existing.name) await this.assertCategoryNameAvailable(tenant, input.name, id);
    const [row] = await db.update(inventoryCategories).set({ ...input, updatedAt: new Date() }).where(eq(inventoryCategories.id, id)).returning();
    await this.audit(tenant, "INVENTORY_CATEGORY_UPDATED", "INVENTORY", "inventory_category", row.id, row.name);
    return row;
  }

  async deleteCategory(tenant: Tenant, id: string) {
    const [existing] = await db.select().from(inventoryCategories).where(and(eq(inventoryCategories.id, id), this.tenantWhere(inventoryCategories, tenant))).limit(1);
    if (!existing) throw new AppError("Inventory category not found", 404, "INVENTORY_CATEGORY_NOT_FOUND");
    const [itemUsage] = await db.select({ value: count() }).from(inventoryItems).where(and(eq(inventoryItems.categoryId, id), this.tenantWhere(inventoryItems, tenant)));
    if (itemUsage.value > 0) {
      throw new AppError("This category cannot be deleted because inventory items are using it.", 409, "INVENTORY_CATEGORY_IN_USE", { itemCount: itemUsage.value });
    }
    await db.delete(inventoryCategories).where(and(eq(inventoryCategories.id, id), this.tenantWhere(inventoryCategories, tenant)));
    await this.audit(tenant, "INVENTORY_CATEGORY_DELETED", "INVENTORY", "inventory_category", existing.id, existing.name);
    return { id: existing.id, deleted: true };
  }

  async listItems(tenant: Tenant, query: ListQuery) {
    const p = page(query);
    const filters = [
      this.tenantWhere(inventoryItems, tenant),
      eq(inventoryItems.isActive, true),
      query.categoryId ? eq(inventoryItems.categoryId, query.categoryId) : undefined,
      query.search ? or(ilike(inventoryItems.name, `%${query.search}%`), ilike(inventoryItems.sku, `%${query.search}%`), ilike(inventoryCategories.name, `%${query.search}%`)) : undefined,
      query.status === "OUT_OF_STOCK" ? sql`${inventoryItems.currentQuantity} <= 0` : undefined,
      query.status === "LOW_STOCK" ? sql`${inventoryItems.currentQuantity} > 0 and ${inventoryItems.currentQuantity} <= ${inventoryItems.minimumQuantity}` : undefined,
      query.status === "IN_STOCK" ? sql`${inventoryItems.currentQuantity} > ${inventoryItems.minimumQuantity}` : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = and(...filters);
    const rows = await db.select({
      id: inventoryItems.id,
      categoryId: inventoryItems.categoryId,
      categoryName: sql<string>`coalesce(${inventoryCategories.name}, 'Uncategorized')`,
      name: inventoryItems.name,
      sku: inventoryItems.sku,
      unit: inventoryItems.unit,
      currentQuantity: inventoryItems.currentQuantity,
      minimumQuantity: inventoryItems.minimumQuantity,
      description: inventoryItems.description,
      isActive: inventoryItems.isActive,
      createdAt: inventoryItems.createdAt,
      updatedAt: inventoryItems.updatedAt,
    }).from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
      .where(where)
      .orderBy(desc(inventoryItems.updatedAt))
      .limit(p.limit)
      .offset(p.offset);
    const [total] = await db.select({ value: count() }).from(inventoryItems).leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id)).where(where);
    return { rows: rows.map((row) => ({ ...row, currentQuantity: num(row.currentQuantity), minimumQuantity: num(row.minimumQuantity), stockStatus: stockStatus(row.currentQuantity, row.minimumQuantity) })), total: total.value, page: p.page, limit: p.limit };
  }

  async createItem(tenant: Tenant, input: ItemInput) {
    await this.assertCategory(tenant, input.categoryId);
    await this.assertItemNameAvailable(tenant, input.name);
    if (input.sku) await this.assertSkuAvailable(tenant, input.sku);
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(inventoryItems).values({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        categoryId: input.categoryId,
        name: input.name,
        sku: input.sku,
        unit: input.unit,
        currentQuantity: input.currentQuantity.toFixed(4),
        minimumQuantity: input.minimumQuantity.toFixed(4),
        description: input.description,
        isActive: input.isActive ?? true,
      }).returning();
      if (input.currentQuantity > 0) {
        await this.recordMovement(tx, tenant, row.id, "STOCK_IN", input.currentQuantity, input.unit, 0, input.currentQuantity, "Opening stock", "INVENTORY_ITEM", row.id);
      }
      await tx.insert(auditLogs).values(this.auditValues(tenant, "INVENTORY_ITEM_CREATED", "INVENTORY", "inventory_item", row.id, row.name));
      return row;
    });
  }

  async updateItem(tenant: Tenant, id: string, input: ItemUpdate) {
    const [existing] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), this.tenantWhere(inventoryItems, tenant))).limit(1);
    if (!existing) throw new AppError("Inventory item not found", 404, "INVENTORY_ITEM_NOT_FOUND");
    if (input.categoryId) await this.assertCategory(tenant, input.categoryId);
    if (input.name && input.name !== existing.name) await this.assertItemNameAvailable(tenant, input.name, id);
    if (input.sku && input.sku !== existing.sku) await this.assertSkuAvailable(tenant, input.sku, id);
    if (input.unit && input.unit !== existing.unit) {
      const [recipeUsage] = await db.select({ value: count() }).from(recipeIngredients).where(and(eq(recipeIngredients.inventoryItemId, id), eq(recipeIngredients.organizationId, tenant.organizationId), eq(recipeIngredients.restaurantId, tenant.restaurantId)));
      const [movementUsage] = await db.select({ value: count() }).from(stockMovements).where(and(eq(stockMovements.inventoryItemId, id), this.tenantWhere(stockMovements, tenant)));
      if (recipeUsage.value > 0 || movementUsage.value > 0) {
        throw new AppError("Inventory item unit cannot be changed because recipes or stock movements already use this item.", 409, "INVENTORY_ITEM_UNIT_LOCKED", { recipeIngredientCount: recipeUsage.value, stockMovementCount: movementUsage.value });
      }
    }
    const [row] = await db.update(inventoryItems).set({
      ...input,
      minimumQuantity: input.minimumQuantity === undefined ? undefined : input.minimumQuantity.toFixed(4),
      updatedAt: new Date(),
    }).where(eq(inventoryItems.id, id)).returning();
    await this.audit(tenant, "INVENTORY_ITEM_UPDATED", "INVENTORY", "inventory_item", row.id, row.name);
    return row;
  }

  async deleteItem(tenant: Tenant, id: string) {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), this.tenantWhere(inventoryItems, tenant))).limit(1);
      if (!existing) throw new AppError("Inventory item not found", 404, "INVENTORY_ITEM_NOT_FOUND");

      const [recipeUsage] = await tx.select({ value: count() }).from(recipeIngredients).where(and(eq(recipeIngredients.inventoryItemId, id), eq(recipeIngredients.organizationId, tenant.organizationId), eq(recipeIngredients.restaurantId, tenant.restaurantId)));
      const [movementUsage] = await tx.select({ value: count() }).from(stockMovements).where(and(eq(stockMovements.inventoryItemId, id), this.tenantWhere(stockMovements, tenant)));

      if (recipeUsage.value > 0 || movementUsage.value > 0) {
        const [row] = await tx.update(inventoryItems).set({ isActive: false, updatedAt: new Date() }).where(and(eq(inventoryItems.id, id), this.tenantWhere(inventoryItems, tenant))).returning();
        await tx.insert(auditLogs).values(this.auditValues(tenant, "INVENTORY_ITEM_DEACTIVATED", "INVENTORY", "inventory_item", existing.id, existing.name, { recipeIngredientCount: recipeUsage.value, stockMovementCount: movementUsage.value }));
        return { id: row.id, deleted: false, deactivated: true, reason: "Inventory item has recipe or stock movement history." };
      }

      await tx.delete(inventoryItems).where(and(eq(inventoryItems.id, id), this.tenantWhere(inventoryItems, tenant)));
      await tx.insert(auditLogs).values(this.auditValues(tenant, "INVENTORY_ITEM_DELETED", "INVENTORY", "inventory_item", existing.id, existing.name));
      return { id: existing.id, deleted: true, deactivated: false };
    });
  }

  async adjustStock(tenant: Tenant, id: string, input: AdjustmentInput) {
    return db.transaction(async (tx) => {
      const [item] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), this.tenantWhere(inventoryItems, tenant))).limit(1);
      if (!item) throw new AppError("Inventory item not found", 404, "INVENTORY_ITEM_NOT_FOUND");
      const converted = convertQuantity(input.quantity, input.unit, item.unit);
      const previous = num(item.currentQuantity);
      const next = input.type === "IN" ? previous + converted : previous - converted;
      if (next < 0) throw new AppError(`Insufficient stock for ${item.name}. Required: ${input.quantity} ${input.unit}, Available: ${previous} ${item.unit}.`, 409, "INSUFFICIENT_STOCK");
      const [updated] = await tx.update(inventoryItems).set({ currentQuantity: next.toFixed(4), updatedAt: new Date() }).where(eq(inventoryItems.id, item.id)).returning();
      await this.recordMovement(tx, tenant, item.id, input.type === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT", input.quantity, input.unit, previous, next, input.reason, "MANUAL_ADJUSTMENT", item.id);
      await tx.insert(auditLogs).values(this.auditValues(tenant, "STOCK_ADJUSTED", "INVENTORY", "inventory_item", item.id, item.name, { type: input.type, quantity: input.quantity, unit: input.unit }));
      return { ...updated, currentQuantity: num(updated.currentQuantity), stockStatus: stockStatus(updated.currentQuantity, updated.minimumQuantity) };
    });
  }

  async listMovements(tenant: Tenant, query: MovementQuery) {
    const p = page(query);
    const where = and(
      this.tenantWhere(stockMovements, tenant),
      query.inventoryItemId ? eq(stockMovements.inventoryItemId, query.inventoryItemId) : undefined,
      query.movementType ? eq(stockMovements.movementType, query.movementType) : undefined,
    );
    const rows = await db.select({
      id: stockMovements.id,
      inventoryItemId: stockMovements.inventoryItemId,
      inventoryItemName: inventoryItems.name,
      movementType: stockMovements.movementType,
      quantity: stockMovements.quantity,
      unit: stockMovements.unit,
      previousQuantity: stockMovements.previousQuantity,
      newQuantity: stockMovements.newQuantity,
      reason: stockMovements.reason,
      referenceType: stockMovements.referenceType,
      referenceId: stockMovements.referenceId,
      orderId: stockMovements.orderId,
      orderItemId: stockMovements.orderItemId,
      performedBy: sql<string>`coalesce(${auditLogs.actorRole}::text, 'SYSTEM')`,
      createdAt: stockMovements.createdAt,
    }).from(stockMovements)
      .innerJoin(inventoryItems, eq(stockMovements.inventoryItemId, inventoryItems.id))
      .leftJoin(auditLogs, and(eq(auditLogs.entityId, stockMovements.id), eq(auditLogs.action, "STOCK_MOVEMENT_RECORDED")))
      .where(where)
      .orderBy(desc(stockMovements.createdAt))
      .limit(p.limit)
      .offset(p.offset);
    const [total] = await db.select({ value: count() }).from(stockMovements).where(where);
    return { rows: rows.map((row) => ({ ...row, quantity: num(row.quantity), previousQuantity: num(row.previousQuantity), newQuantity: num(row.newQuantity) })), total: total.value, page: p.page, limit: p.limit };
  }

  async listRecipes(tenant: Tenant) {
    const rows = await db.select({
      id: recipes.id,
      menuItemId: recipes.menuItemId,
      menuItemName: menuItems.name,
      menuCategoryName: menuCategories.name,
      servingQuantity: recipes.servingQuantity,
      servingUnit: recipes.servingUnit,
      isActive: recipes.isActive,
      updatedAt: recipes.updatedAt,
      ingredientCount: count(recipeIngredients.id),
      estimatedCost: sql<string>`coalesce(sum((${recipeIngredients.quantity}::numeric / case when ${recipeIngredients.unit} = ${inventoryItems.unit} then 1 when ${recipeIngredients.unit} = 'g' and ${inventoryItems.unit} = 'kg' then 1000 when ${recipeIngredients.unit} = 'ml' and ${inventoryItems.unit} = 'litre' then 1000 when ${recipeIngredients.unit} = 'kg' and ${inventoryItems.unit} = 'g' then 0.001 when ${recipeIngredients.unit} = 'litre' and ${inventoryItems.unit} = 'ml' then 0.001 else null end) * coalesce(${inventoryItems.costPerUnit}, 0)), 0)`,
    }).from(recipes)
      .innerJoin(menuItems, eq(recipes.menuItemId, menuItems.id))
      .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .leftJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
      .leftJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
      .where(this.tenantWhere(recipes, tenant))
      .groupBy(recipes.id, menuItems.name, menuCategories.name)
      .orderBy(desc(recipes.updatedAt));
    return rows.map((row) => ({ ...row, servingQuantity: num(row.servingQuantity), ingredientCount: Number(row.ingredientCount ?? 0), estimatedCost: num(row.estimatedCost) }));
  }

  async getRecipe(tenant: Tenant, id: string) {
    return db.transaction((tx) => this.getRecipeDetail(tx, tenant, id));
  }

  async createRecipe(tenant: Tenant, input: RecipeInput) {
    return db.transaction(async (tx) => {
      await this.assertMenuItem(tx, tenant, input.menuItemId, input.menuCategoryId);
      await this.assertRecipeAvailable(tx, tenant, input.menuItemId);
      await this.assertRecipeIngredients(tx, tenant, input.ingredients);
      const [recipe] = await tx.insert(recipes).values({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        menuItemId: input.menuItemId,
        servingQuantity: input.servingQuantity.toFixed(4),
        servingUnit: input.servingUnit,
        isActive: input.isActive ?? true,
        createdByAdminId: tenant.role === "RESTAURANT_ADMIN" ? tenant.userId : undefined,
        updatedByAdminId: tenant.role === "RESTAURANT_ADMIN" ? tenant.userId : undefined,
      }).returning();
      await tx.insert(recipeIngredients).values(input.ingredients.map((ingredient) => ({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        recipeId: recipe.id,
        inventoryItemId: ingredient.inventoryItemId,
        quantity: ingredient.quantity.toFixed(4),
        unit: ingredient.unit,
      })));
      await tx.insert(auditLogs).values(this.auditValues(tenant, "RECIPE_CREATED", "RECIPE", "recipe", recipe.id, recipe.id));
      return this.getRecipeDetail(tx, tenant, recipe.id);
    });
  }

  async updateRecipe(tenant: Tenant, id: string, input: RecipeUpdate) {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(recipes).where(and(eq(recipes.id, id), this.tenantWhere(recipes, tenant))).limit(1);
      if (!existing) throw new AppError("Recipe not found", 404, "RECIPE_NOT_FOUND");
      if (input.menuItemId && input.menuItemId !== existing.menuItemId) {
        await this.assertMenuItem(tx, tenant, input.menuItemId, input.menuCategoryId);
        await this.assertRecipeAvailable(tx, tenant, input.menuItemId, id);
      } else if (input.menuItemId && input.menuCategoryId) {
        await this.assertMenuItem(tx, tenant, input.menuItemId, input.menuCategoryId);
      }
      if (input.ingredients) await this.assertRecipeIngredients(tx, tenant, input.ingredients);
      await tx.update(recipes).set({
        menuItemId: input.menuItemId,
        servingQuantity: input.servingQuantity === undefined ? undefined : input.servingQuantity.toFixed(4),
        servingUnit: input.servingUnit,
        isActive: input.isActive,
        updatedByAdminId: tenant.role === "RESTAURANT_ADMIN" ? tenant.userId : undefined,
        updatedAt: new Date(),
      }).where(eq(recipes.id, existing.id));
      if (input.ingredients) {
        await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, existing.id));
        await tx.insert(recipeIngredients).values(input.ingredients.map((ingredient) => ({
          organizationId: tenant.organizationId,
          restaurantId: tenant.restaurantId,
          recipeId: existing.id,
          inventoryItemId: ingredient.inventoryItemId,
          quantity: ingredient.quantity.toFixed(4),
          unit: ingredient.unit,
        })));
      }
      await tx.insert(auditLogs).values(this.auditValues(tenant, "RECIPE_UPDATED", "RECIPE", "recipe", existing.id, existing.id));
      return this.getRecipeDetail(tx, tenant, existing.id);
    });
  }

  async menuCategories(tenant: Tenant) {
    return db.select().from(menuCategories).where(and(eq(menuCategories.organizationId, tenant.organizationId), eq(menuCategories.restaurantId, tenant.restaurantId), eq(menuCategories.isActive, true))).orderBy(desc(menuCategories.createdAt));
  }

  async menuItems(tenant: Tenant, categoryId?: string) {
    return db.select({ item: menuItems, category: menuCategories }).from(menuItems)
      .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(and(eq(menuItems.organizationId, tenant.organizationId), eq(menuItems.restaurantId, tenant.restaurantId), eq(menuItems.isActive, true), categoryId ? eq(menuItems.categoryId, categoryId) : undefined))
      .orderBy(desc(menuItems.createdAt));
  }

  async consumeOrderForReady(tx: DbTx, tenant: Tenant, orderId: string) {
    const items = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, orderId), eq(orderItems.organizationId, tenant.organizationId), eq(orderItems.restaurantId, tenant.restaurantId)));
    for (const orderItem of items) {
      const [alreadyProcessed] = await tx.select({ id: orderItemInventoryConsumptions.id }).from(orderItemInventoryConsumptions).where(eq(orderItemInventoryConsumptions.orderItemId, orderItem.id)).limit(1);
      if (alreadyProcessed) continue;
      const [recipe] = await tx.select().from(recipes).where(and(eq(recipes.menuItemId, orderItem.menuItemId), eq(recipes.organizationId, tenant.organizationId), eq(recipes.restaurantId, tenant.restaurantId), eq(recipes.isActive, true))).limit(1);
      if (!recipe) {
        await tx.insert(notifications).values({
          scope: "RESTAURANT",
          organizationId: tenant.organizationId,
          restaurantId: tenant.restaurantId,
          recipientRole: "RESTAURANT_ADMIN",
          type: "RECIPE_MISSING",
          title: "Recipe missing for ready order",
          message: `No recipe configured for ${orderItem.itemNameSnapshot}. Inventory was not deducted.`,
          entityType: "order",
          entityId: orderId,
          dedupeKey: `recipe-missing:${orderItem.id}`,
        }).onConflictDoNothing();
        await tx.insert(orderItemInventoryConsumptions).values({ organizationId: tenant.organizationId, restaurantId: tenant.restaurantId, orderId, orderItemId: orderItem.id });
        continue;
      }
      const ingredients = await tx.select({
        inventoryItemId: recipeIngredients.inventoryItemId,
        quantity: recipeIngredients.quantity,
        unit: recipeIngredients.unit,
        itemName: inventoryItems.name,
        inventoryUnit: inventoryItems.unit,
        currentQuantity: inventoryItems.currentQuantity,
      }).from(recipeIngredients)
        .innerJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
        .where(eq(recipeIngredients.recipeId, recipe.id));
      for (const ingredient of ingredients) {
        const required = convertQuantity(num(ingredient.quantity) * orderItem.quantity, ingredient.unit, ingredient.inventoryUnit);
        const available = num(ingredient.currentQuantity);
        if (available < required) {
          throw new AppError(`Insufficient stock for ${ingredient.itemName}. Required: ${(num(ingredient.quantity) * orderItem.quantity).toFixed(4)} ${ingredient.unit}, Available: ${available.toFixed(4)} ${ingredient.inventoryUnit}.`, 409, "INSUFFICIENT_STOCK");
        }
      }
      for (const ingredient of ingredients) {
        const movementQuantity = num(ingredient.quantity) * orderItem.quantity;
        const required = convertQuantity(movementQuantity, ingredient.unit, ingredient.inventoryUnit);
        const previous = num(ingredient.currentQuantity);
        const next = previous - required;
        await tx.update(inventoryItems).set({ currentQuantity: next.toFixed(4), updatedAt: new Date() }).where(and(eq(inventoryItems.id, ingredient.inventoryItemId), eq(inventoryItems.restaurantId, tenant.restaurantId)));
        await this.recordMovement(tx, tenant, ingredient.inventoryItemId, "RECIPE_CONSUMPTION", movementQuantity, ingredient.unit, previous, next, `Consumed for ${orderItem.itemNameSnapshot} x ${orderItem.quantity}`, "ORDER_ITEM", orderItem.id, orderId, orderItem.id);
      }
      await tx.insert(orderItemInventoryConsumptions).values({ organizationId: tenant.organizationId, restaurantId: tenant.restaurantId, orderId, orderItemId: orderItem.id, recipeId: recipe.id });
    }
  }

  private async recordMovement(tx: DbTx, tenant: Tenant, itemId: string, movementType: string, quantity: number, unit: string, previous: number, next: number, reason?: string, referenceType?: string, referenceId?: string, orderId?: string, orderItemId?: string) {
    const [movement] = await tx.insert(stockMovements).values({
      organizationId: tenant.organizationId,
      restaurantId: tenant.restaurantId,
      inventoryItemId: itemId,
      movementType,
      quantity: quantity.toFixed(4),
      unit,
      previousQuantity: previous.toFixed(4),
      newQuantity: next.toFixed(4),
      reason,
      referenceType,
      referenceId,
      orderId,
      orderItemId,
      performedByAdminId: tenant.role === "RESTAURANT_ADMIN" ? tenant.userId : undefined,
      performedByEmployeeId: tenant.role !== "RESTAURANT_ADMIN" ? tenant.userId : undefined,
    }).returning();
    await tx.insert(auditLogs).values(this.auditValues(tenant, "STOCK_MOVEMENT_RECORDED", "INVENTORY", "stock_movement", movement.id, movement.id, { movementType, itemId }));
    return movement;
  }

  private tenantWhere(table: typeof inventoryCategories | typeof inventoryItems | typeof recipes | typeof stockMovements, tenant: Tenant) {
    return and(eq(table.organizationId, tenant.organizationId), eq(table.restaurantId, tenant.restaurantId));
  }

  private async assertCategory(tenant: Tenant, id: string) {
    const [row] = await db.select({ id: inventoryCategories.id }).from(inventoryCategories).where(and(eq(inventoryCategories.id, id), this.tenantWhere(inventoryCategories, tenant))).limit(1);
    if (!row) throw new AppError("Inventory category not found", 404, "INVENTORY_CATEGORY_NOT_FOUND");
  }

  private async assertCategoryNameAvailable(tenant: Tenant, name: string, ignoreId?: string) {
    const rows = await db.select({ id: inventoryCategories.id }).from(inventoryCategories).where(and(this.tenantWhere(inventoryCategories, tenant), ilike(inventoryCategories.name, name))).limit(2);
    if (rows.some((row) => row.id !== ignoreId)) throw new AppError("Inventory category name already exists", 409, "INVENTORY_CATEGORY_EXISTS");
  }

  private async assertItemNameAvailable(tenant: Tenant, name: string, ignoreId?: string) {
    const rows = await db.select({ id: inventoryItems.id }).from(inventoryItems).where(and(this.tenantWhere(inventoryItems, tenant), ilike(inventoryItems.name, name))).limit(2);
    if (rows.some((row) => row.id !== ignoreId)) throw new AppError("Inventory item name already exists", 409, "INVENTORY_ITEM_EXISTS");
  }

  private async assertSkuAvailable(tenant: Tenant, sku: string, ignoreId?: string) {
    const rows = await db.select({ id: inventoryItems.id }).from(inventoryItems).where(and(this.tenantWhere(inventoryItems, tenant), eq(inventoryItems.sku, sku))).limit(2);
    if (rows.some((row) => row.id !== ignoreId)) throw new AppError("Inventory SKU already exists", 409, "INVENTORY_SKU_EXISTS");
  }

  private async getRecipeDetail(tx: DbTx, tenant: Tenant, id: string) {
    const [recipe] = await tx.select({
      id: recipes.id,
      menuItemId: recipes.menuItemId,
      menuItemName: menuItems.name,
      menuCategoryId: menuCategories.id,
      menuCategoryName: menuCategories.name,
      servingQuantity: recipes.servingQuantity,
      servingUnit: recipes.servingUnit,
      isActive: recipes.isActive,
      createdAt: recipes.createdAt,
      updatedAt: recipes.updatedAt,
    }).from(recipes)
      .innerJoin(menuItems, eq(recipes.menuItemId, menuItems.id))
      .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(and(eq(recipes.id, id), this.tenantWhere(recipes, tenant)))
      .limit(1);
    if (!recipe) throw new AppError("Recipe not found", 404, "RECIPE_NOT_FOUND");
    const ingredients = await tx.select({
      id: recipeIngredients.id,
      inventoryItemId: recipeIngredients.inventoryItemId,
      inventoryItemName: inventoryItems.name,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      inventoryUnit: inventoryItems.unit,
    }).from(recipeIngredients)
      .innerJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
      .where(and(eq(recipeIngredients.recipeId, recipe.id), eq(recipeIngredients.organizationId, tenant.organizationId), eq(recipeIngredients.restaurantId, tenant.restaurantId)));
    return {
      ...recipe,
      servingQuantity: num(recipe.servingQuantity),
      ingredients: ingredients.map((ingredient) => ({ ...ingredient, quantity: num(ingredient.quantity) })),
    };
  }

  private async assertMenuItem(tx: DbTx, tenant: Tenant, id: string, categoryId?: string) {
    const [row] = await tx.select({ id: menuItems.id }).from(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.organizationId, tenant.organizationId), eq(menuItems.restaurantId, tenant.restaurantId), eq(menuItems.isActive, true), categoryId ? eq(menuItems.categoryId, categoryId) : undefined)).limit(1);
    if (!row) throw new AppError("Menu item not found", 404, "MENU_ITEM_NOT_FOUND");
  }

  private async assertRecipeAvailable(tx: DbTx, tenant: Tenant, menuItemId: string, ignoreRecipeId?: string) {
    const rows = await tx.select({ id: recipes.id }).from(recipes).where(and(eq(recipes.menuItemId, menuItemId), eq(recipes.organizationId, tenant.organizationId), eq(recipes.restaurantId, tenant.restaurantId), eq(recipes.isActive, true))).limit(2);
    if (rows.some((row) => row.id !== ignoreRecipeId)) throw new AppError("This menu item already has an active recipe", 409, "ACTIVE_RECIPE_EXISTS");
  }

  private async assertRecipeIngredients(tx: DbTx, tenant: Tenant, ingredients: RecipeInput["ingredients"]) {
    const ids = ingredients.map((ingredient) => ingredient.inventoryItemId);
    const rows = await tx.select({ id: inventoryItems.id, unit: inventoryItems.unit }).from(inventoryItems).where(and(eq(inventoryItems.organizationId, tenant.organizationId), eq(inventoryItems.restaurantId, tenant.restaurantId), inArray(inventoryItems.id, ids)));
    if (rows.length !== ids.length) throw new AppError("One or more inventory items are invalid", 422, "RECIPE_INVENTORY_ITEM_INVALID");
    const unitById = new Map(rows.map((row) => [row.id, row.unit]));
    for (const ingredient of ingredients) {
      convertQuantity(ingredient.quantity, ingredient.unit, unitById.get(ingredient.inventoryItemId)!);
    }
  }

  private auditValues(tenant: Tenant, action: string, module: string, entityType: string, entityId: string, entityPublicId?: string, metadata?: Record<string, unknown>) {
    const actorRole: AuditActorRole = tenant.role === "RESTAURANT_ADMIN"
      ? "RESTAURANT_ADMIN"
      : tenant.role === "KITCHEN"
        ? "KITCHEN"
        : "ADMIN";
    return {
      organizationId: tenant.organizationId,
      restaurantId: tenant.restaurantId,
      actorAdminId: tenant.role === "RESTAURANT_ADMIN" ? tenant.userId : undefined,
      actorEmployeeId: tenant.role !== "RESTAURANT_ADMIN" ? tenant.userId : undefined,
      actorRole,
      module,
      action,
      entityType,
      entityId,
      entityPublicId,
      metadata,
    };
  }

  private async audit(tenant: Tenant, action: string, module: string, entityType: string, entityId: string, entityPublicId?: string) {
    await db.insert(auditLogs).values(this.auditValues(tenant, action, module, entityType, entityId, entityPublicId));
  }
}
