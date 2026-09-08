import { Hono } from "hono";
import { requireRole } from "../../middleware/role.middleware.js";
import { InventoryController } from "./inventory.controller.js";

export const inventoryRoutes = new Hono();
const controller = new InventoryController();

inventoryRoutes.get("/overview", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.overview(c));

inventoryRoutes.get("/categories", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.categories(c));
inventoryRoutes.post("/categories", requireRole("RESTAURANT_ADMIN"), (c) => controller.createCategory(c));
inventoryRoutes.patch("/categories/:id", requireRole("RESTAURANT_ADMIN"), (c) => controller.updateCategory(c));
inventoryRoutes.delete("/categories/:id", requireRole("RESTAURANT_ADMIN"), (c) => controller.deleteCategory(c));

inventoryRoutes.get("/items", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.items(c));
inventoryRoutes.post("/items", requireRole("RESTAURANT_ADMIN"), (c) => controller.createItem(c));
inventoryRoutes.patch("/items/:id", requireRole("RESTAURANT_ADMIN"), (c) => controller.updateItem(c));
inventoryRoutes.delete("/items/:id", requireRole("RESTAURANT_ADMIN"), (c) => controller.deleteItem(c));
inventoryRoutes.post("/items/:id/adjust-stock", requireRole("RESTAURANT_ADMIN"), (c) => controller.adjustStock(c));

inventoryRoutes.get("/stock-movements", requireRole("RESTAURANT_ADMIN"), (c) => controller.movements(c));

inventoryRoutes.get("/recipes", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.recipes(c));
inventoryRoutes.post("/recipes", requireRole("RESTAURANT_ADMIN"), (c) => controller.createRecipe(c));
inventoryRoutes.get("/recipes/:id", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.recipe(c));
inventoryRoutes.patch("/recipes/:id", requireRole("RESTAURANT_ADMIN"), (c) => controller.updateRecipe(c));

inventoryRoutes.get("/menu-categories", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.menuCategories(c));
inventoryRoutes.get("/menu-items", requireRole("RESTAURANT_ADMIN", "KITCHEN"), (c) => controller.menuItems(c));
