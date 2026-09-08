import type { Context } from "hono";
import { AppError } from "../../common/errors/app-error.js";
import { successResponse } from "../../common/responses/success-response.js";
import { validateJson, validateQuery } from "../../common/validation/validation.helper.js";
import { InventoryService } from "./inventory.service.js";
import {
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

type UserContext = {
  id?: string;
  role?: string;
  organizationId?: string;
  restaurantIds?: string[];
};

export class InventoryController {
  private readonly service = new InventoryService();

  overview(c: Context) {
    return this.withData(c, () => this.service.overview(this.tenant(c)), "Inventory overview loaded");
  }

  categories(c: Context) {
    return this.withData(c, () => this.service.listCategories(this.tenant(c)), "Inventory categories loaded");
  }

  async createCategory(c: Context) {
    const input = await validateJson(c, inventoryCategoryInputSchema);
    return c.json(successResponse(await this.service.createCategory(this.tenant(c), input), "Inventory category created"), 201);
  }

  async updateCategory(c: Context) {
    const input = await validateJson(c, inventoryCategoryUpdateSchema);
    return c.json(successResponse(await this.service.updateCategory(this.tenant(c), this.id(c), input), "Inventory category updated"));
  }

  async deleteCategory(c: Context) {
    return c.json(successResponse(await this.service.deleteCategory(this.tenant(c), this.id(c)), "Inventory category deleted"));
  }

  async items(c: Context) {
    const query = validateQuery(c, inventoryListQuerySchema);
    const data = await this.service.listItems(this.tenant(c), query);
    return c.json(successResponse(data.rows, "Inventory items loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async createItem(c: Context) {
    const input = await validateJson(c, inventoryItemInputSchema);
    return c.json(successResponse(await this.service.createItem(this.tenant(c), input), "Inventory item created"), 201);
  }

  async updateItem(c: Context) {
    const input = await validateJson(c, inventoryItemUpdateSchema);
    return c.json(successResponse(await this.service.updateItem(this.tenant(c), this.id(c), input), "Inventory item updated"));
  }

  async deleteItem(c: Context) {
    const result = await this.service.deleteItem(this.tenant(c), this.id(c));
    return c.json(successResponse(result, result.deactivated ? "Inventory item deactivated" : "Inventory item deleted"));
  }

  async adjustStock(c: Context) {
    const input = await validateJson(c, stockAdjustmentSchema);
    return c.json(successResponse(await this.service.adjustStock(this.tenant(c), this.id(c), input), "Stock adjusted"));
  }

  async movements(c: Context) {
    const query = validateQuery(c, stockMovementQuerySchema);
    const data = await this.service.listMovements(this.tenant(c), query);
    return c.json(successResponse(data.rows, "Stock movements loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  recipes(c: Context) {
    return this.withData(c, () => this.service.listRecipes(this.tenant(c)), "Recipes loaded");
  }

  recipe(c: Context) {
    return this.withData(c, () => this.service.getRecipe(this.tenant(c), this.id(c)), "Recipe loaded");
  }

  async createRecipe(c: Context) {
    const input = await validateJson(c, recipeInputSchema);
    return c.json(successResponse(await this.service.createRecipe(this.tenant(c), input), "Recipe created"), 201);
  }

  async updateRecipe(c: Context) {
    const input = await validateJson(c, recipeUpdateSchema);
    return c.json(successResponse(await this.service.updateRecipe(this.tenant(c), this.id(c), input), "Recipe updated"));
  }

  menuCategories(c: Context) {
    return this.withData(c, () => this.service.menuCategories(this.tenant(c)), "Menu categories loaded");
  }

  menuItems(c: Context) {
    const categoryId = new URL(c.req.url).searchParams.get("categoryId") ?? undefined;
    return this.withData(c, () => this.service.menuItems(this.tenant(c), categoryId), "Menu items loaded");
  }

  private tenant(c: Context) {
    const user = c.get("user") as UserContext | undefined;
    const organization = c.get("organization") as { id?: string } | undefined;
    const restaurant = c.get("restaurant") as { id?: string } | undefined;
    const organizationId = organization?.id ?? user?.organizationId;
    const restaurantId = restaurant?.id ?? user?.restaurantIds?.[0];
    if (!organizationId || !restaurantId) throw new AppError("Tenant context missing", 403, "TENANT_CONTEXT_MISSING");
    return { organizationId, restaurantId, userId: user?.id, role: user?.role };
  }

  private id(c: Context) {
    const id = c.req.param("id");
    if (!id) throw new AppError("Id is required", 400, "ID_REQUIRED");
    return id;
  }

  private async withData<T>(c: Context, load: () => Promise<T>, message: string) {
    return c.json(successResponse(await load(), message));
  }
}
