import { apiClient } from "@/lib/api/client";

export type InventoryCategory = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  sku?: string | null;
  unit: string;
  currentQuantity: number;
  minimumQuantity: number;
  description?: string | null;
  isActive: boolean;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  inventoryItemName: string;
  movementType: string;
  quantity: number;
  unit: string;
  previousQuantity: number;
  newQuantity: number;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  orderId?: string | null;
  orderItemId?: string | null;
  performedBy?: string | null;
  createdAt: string;
};

export type Recipe = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  menuCategoryName: string;
  servingQuantity: number;
  servingUnit: string;
  isActive: boolean;
  ingredientCount: number;
  estimatedCost: number;
  updatedAt: string;
};

export type RecipeDetail = Recipe & {
  menuCategoryId: string;
  ingredients: Array<{
    id: string;
    inventoryItemId: string;
    inventoryItemName: string;
    quantity: number;
    unit: string;
    inventoryUnit: string;
  }>;
};

export type MenuCategory = { id: string; name: string; description?: string | null; isActive: boolean };
export type MenuItemOption = { item: { id: string; name: string; price: string; isActive: boolean; isAvailable: boolean }; category: { id: string; name: string } };
export type ApiList<T> = { data: T[]; meta?: { total?: number; page?: number; limit?: number } };
export type ApiOne<T> = { data: T };
export type InventoryItemInput = {
  categoryId: string;
  name: string;
  sku?: string | null;
  unit: string;
  currentQuantity?: number;
  minimumQuantity?: number;
  description?: string | null;
  isActive?: boolean;
};
export type RecipeInput = {
  menuCategoryId?: string;
  menuItemId: string;
  servingQuantity: number;
  servingUnit: string;
  isActive?: boolean;
  ingredients: Array<{ inventoryItemId: string; quantity: number; unit: string }>;
};

export async function getInventoryOverview() {
  const response = await apiClient.get<ApiOne<{ categories: number; items: number; lowStockItems: number; outOfStockItems: number; recipes: number; latestMovements: StockMovement[] }>>("/inventory/overview");
  return response.data;
}

export async function getInventoryCategories() {
  const response = await apiClient.get<ApiOne<InventoryCategory[]>>("/inventory/categories");
  return response.data;
}

export async function createInventoryCategory(input: { name: string; description?: string; isActive?: boolean }) {
  const response = await apiClient.post<ApiOne<InventoryCategory>>("/inventory/categories", input);
  return response.data;
}

export async function updateInventoryCategory(id: string, input: { name?: string; description?: string | null; isActive?: boolean }) {
  const response = await apiClient.patch<ApiOne<InventoryCategory>>(`/inventory/categories/${id}`, input);
  return response.data;
}

export async function deleteInventoryCategory(id: string) {
  const response = await apiClient.delete<ApiOne<{ id: string; deleted: boolean }>>(`/inventory/categories/${id}`);
  return response.data;
}

export async function getInventoryItems(params?: Record<string, string | number | undefined>) {
  const response = await apiClient.get<ApiList<InventoryItem>>("/inventory/items", { params });
  return response.data;
}

export async function getAllInventoryItems() {
  const limit = 100;
  const firstPage = await getInventoryItems({ page: 1, limit });
  const total = Number(firstPage.meta?.total ?? firstPage.data.length);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages === 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => getInventoryItems({ page: index + 2, limit })),
  );
  return [...firstPage.data, ...remainingPages.flatMap((page) => page.data)];
}

export async function createInventoryItem(input: InventoryItemInput) {
  const response = await apiClient.post<ApiOne<InventoryItem>>("/inventory/items", input);
  return response.data;
}

export async function updateInventoryItem(id: string, input: Omit<Partial<InventoryItemInput>, "currentQuantity">) {
  const response = await apiClient.patch<ApiOne<InventoryItem>>(`/inventory/items/${id}`, input);
  return response.data;
}

export async function deleteInventoryItem(id: string) {
  const response = await apiClient.delete<ApiOne<{ id: string; deleted: boolean; deactivated: boolean; reason?: string }>>(`/inventory/items/${id}`);
  return response.data;
}

export async function adjustInventoryStock(id: string, input: { type: "IN" | "OUT"; quantity: number; unit: string; reason: string }) {
  const response = await apiClient.post<ApiOne<InventoryItem>>(`/inventory/items/${id}/adjust-stock`, input);
  return response.data;
}

export async function getStockMovements(params?: Record<string, string | number | undefined>) {
  const response = await apiClient.get<ApiList<StockMovement>>("/inventory/stock-movements", { params });
  return response.data;
}

export async function getRecipes() {
  const response = await apiClient.get<ApiOne<Recipe[]>>("/inventory/recipes");
  return response.data;
}

export async function getRecipe(id: string) {
  const response = await apiClient.get<ApiOne<RecipeDetail>>(`/inventory/recipes/${id}`);
  return response.data;
}

export async function createRecipe(input: RecipeInput) {
  const response = await apiClient.post<ApiOne<RecipeDetail>>("/inventory/recipes", input);
  return response.data;
}

export async function updateRecipe(id: string, input: Partial<RecipeInput>) {
  const response = await apiClient.patch<ApiOne<RecipeDetail>>(`/inventory/recipes/${id}`, input);
  return response.data;
}

export async function getRecipeMenuCategories() {
  const response = await apiClient.get<ApiOne<MenuCategory[]>>("/inventory/menu-categories");
  return response.data;
}

export async function getRecipeMenuItems(categoryId?: string) {
  const response = await apiClient.get<ApiOne<MenuItemOption[]>>("/inventory/menu-items", { params: { categoryId } });
  return response.data;
}
