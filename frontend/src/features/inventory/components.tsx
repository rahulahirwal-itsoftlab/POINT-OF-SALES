"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Edit3, Eye, Plus, RefreshCw, SlidersHorizontal, Trash2 } from "lucide-react";
import { CommonModal } from "@/components/common/modal";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricStrip } from "@/components/dashboard/analytics-widgets";
import { extractApiError } from "@/lib/api/client";
import {
  useAdjustInventoryStock,
  useAllInventoryItems,
  useCreateInventoryCategory,
  useCreateInventoryItem,
  useCreateRecipe,
  useDeleteInventoryCategory,
  useDeleteInventoryItem,
  useInventoryCategories,
  useInventoryItems,
  useInventoryOverview,
  useRecipe,
  useRecipeMenuCategories,
  useRecipeMenuItems,
  useRecipes,
  useStockMovements,
  useUpdateInventoryCategory,
  useUpdateInventoryItem,
  useUpdateRecipe,
} from "./hooks";
import type { InventoryCategory, InventoryItem, Recipe } from "./api";

const units = ["kg", "g", "litre", "ml", "pcs", "packet", "bottle", "box", "dozen"];

function isAdminPath(pathname: string) {
  return pathname.includes("/restaurant-admin/") || pathname.includes("/admin/");
}

function date(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

function money(value?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export function InventoryOverviewPage() {
  const { data, isLoading, isError, refetch } = useInventoryOverview();
  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState message="Unable to load inventory overview." onRetry={() => refetch()} />;
  const overview = data.data;
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Analytics" description="Live stock, recipe, and movement totals from restaurant inventory." />
      <MetricStrip items={[
        { label: "Categories", value: overview.categories, tone: "blue" },
        { label: "Inventory Items", value: overview.items, tone: "green" },
        { label: "Low Stock", value: overview.lowStockItems, tone: overview.lowStockItems ? "amber" : "green" },
        { label: "Out of Stock", value: overview.outOfStockItems, tone: overview.outOfStockItems ? "red" : "green" },
        { label: "Recipes", value: overview.recipes, tone: "slate" },
      ]} />
      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="border-b bg-slate-50 px-4 py-3 text-sm font-semibold">Latest Stock Movements</div>
        {!overview.latestMovements.length ? <EmptyState title="No stock movements yet" description="Stock history will appear after inventory is created or adjusted." /> : <MovementTable rows={overview.latestMovements} />}
      </section>
    </div>
  );
}

export function InventoryCategoriesPage() {
  const pathname = usePathname();
  const canEdit = isAdminPath(pathname);
  const { data, isLoading, isError, refetch } = useInventoryCategories();
  const createCategory = useCreateInventoryCategory();
  const updateCategory = useUpdateInventoryCategory();
  const deleteCategory = useDeleteInventoryCategory();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryCategory | null>(null);
  const [deleting, setDeleting] = useState<InventoryCategory | null>(null);
  const [form, setForm] = useState({ name: "", description: "", isActive: true });

  function openForm(category?: InventoryCategory) {
    setEditing(category ?? null);
    setForm({ name: category?.name ?? "", description: category?.description ?? "", isActive: category?.isActive ?? true });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, input: { ...form, name: form.name.trim(), description: form.description.trim() || null } });
        toast.success("Inventory category updated.");
      } else {
        await createCategory.mutateAsync({ ...form, name: form.name.trim(), description: form.description.trim() || undefined });
        toast.success("Inventory category created.");
      }
      setOpen(false);
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteCategory.mutateAsync(deleting.id);
      toast.success("Inventory category deleted.");
      setDeleting(null);
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load inventory categories." onRetry={() => refetch()} />;
  const rows = data?.data ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Categories" description="Create and maintain stock grouping for this restaurant." actions={canEdit ? <button onClick={() => openForm()} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add Category</button> : null} />
      {!rows.length ? <EmptyState title="No inventory categories" description="Categories created by admins will appear here." /> : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Category Name</th><th className="p-3">Description</th><th className="p-3">Status</th><th className="p-3">Inventory Items</th><th className="p-3">Created</th>{canEdit ? <th className="p-3 text-right">Actions</th> : null}</tr></thead>
            <tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.description ?? "-"}</td><td className="p-3"><StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} /></td><td className="p-3">{row.itemCount ?? 0}</td><td className="p-3">{date(row.createdAt)}</td>{canEdit ? <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => openForm(row)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"><Edit3 className="h-3.5 w-3.5" /> Edit</button><button onClick={() => setDeleting(row)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div></td> : null}</tr>)}</tbody>
          </table>
        </div>
      )}
      <CommonModal isOpen={open} onClose={() => setOpen(false)} title={editing ? "Edit Category" : "Add Category"} onConfirm={submit} confirmText={editing ? "Save Changes" : "Create Category"} isConfirming={createCategory.isPending || updateCategory.isPending}>
        <div className="space-y-3">
          <TextInput label="Category Name" value={form.name} onChange={(name) => setForm((prev) => ({ ...prev, name }))} />
          <TextArea label="Description" value={form.description} onChange={(description) => setForm((prev) => ({ ...prev, description }))} />
          <CheckInput label="Active" checked={form.isActive} onChange={(isActive) => setForm((prev) => ({ ...prev, isActive }))} />
        </div>
      </CommonModal>
      <CommonModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete Inventory Category" onConfirm={confirmDelete} confirmText="Delete" isConfirming={deleteCategory.isPending}>
        <p className="text-sm text-slate-600">Are you sure you want to delete this inventory category? Categories with inventory items will be blocked by the server.</p>
      </CommonModal>
    </div>
  );
}

export function InventoryItemsPage() {
  const pathname = usePathname();
  const canEdit = isAdminPath(pathname);
  const { data: categoriesData } = useInventoryCategories();
  const [filters, setFilters] = useState({ search: "", categoryId: "", status: "", page: 1 });
  const { data, isLoading, isError, refetch, isFetching } = useInventoryItems({
    page: filters.page,
    limit: 25,
    search: filters.search.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    status: filters.status || undefined,
  });
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const adjustStock = useAdjustInventoryStock();
  const [itemOpen, setItemOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ categoryId: "", name: "", sku: "", unit: "kg", currentQuantity: "0", minimumQuantity: "0", description: "", isActive: true });
  const [adjust, setAdjust] = useState({ type: "IN" as "IN" | "OUT", quantity: "", unit: "kg", reason: "" });
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const total = Number(meta?.total ?? rows.length);
  const page = Number(meta?.page ?? filters.page);
  const limit = Number(meta?.limit ?? 25);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const categories = categoriesData?.data ?? [];

  function openItem(item?: InventoryItem) {
    setEditing(item ?? null);
    setForm({ categoryId: item?.categoryId ?? categories[0]?.id ?? "", name: item?.name ?? "", sku: item?.sku ?? "", unit: item?.unit ?? "kg", currentQuantity: item ? String(item.currentQuantity) : "0", minimumQuantity: item ? String(item.minimumQuantity) : "0", description: item?.description ?? "", isActive: item?.isActive ?? true });
    setItemOpen(true);
  }

  async function submitItem() {
    if (!form.name.trim()) {
      toast.error("Inventory item name is required.");
      return;
    }
    if (!form.categoryId) {
      toast.error("Inventory category is required.");
      return;
    }
    try {
      const input = { categoryId: form.categoryId, name: form.name.trim(), sku: form.sku.trim() || null, unit: form.unit, minimumQuantity: Number(form.minimumQuantity), description: form.description.trim() || null, isActive: form.isActive };
      if (editing) {
        await updateItem.mutateAsync({ id: editing.id, input });
        toast.success("Inventory item updated.");
      } else {
        await createItem.mutateAsync({ ...input, currentQuantity: Number(form.currentQuantity) });
        toast.success("Inventory item created.");
      }
      setEditing(null);
      setItemOpen(false);
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }

  async function submitAdjustment() {
    if (!adjusting) return;
    if (Number(adjust.quantity) <= 0) {
      toast.error("Adjustment quantity must be positive.");
      return;
    }
    if (!adjust.reason.trim()) {
      toast.error("Adjustment reason is required.");
      return;
    }
    try {
      await adjustStock.mutateAsync({ id: adjusting.id, input: { ...adjust, quantity: Number(adjust.quantity), reason: adjust.reason.trim() } });
      toast.success("Stock adjusted.");
      setAdjusting(null);
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const result = await deleteItem.mutateAsync(deleting.id);
      toast.success(result.data.deactivated ? "Inventory item deactivated." : "Inventory item deleted.");
      setDeleting(null);
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load inventory items." onRetry={() => refetch()} />;
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Items / Stock" description="Real-time stock balances and reorder thresholds." actions={canEdit ? <button onClick={() => openItem()} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add Inventory</button> : null} />
      <div className="grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_180px_auto]">
        <TextInput label="Search" value={filters.search} onChange={(search) => setFilters((prev) => ({ ...prev, search, page: 1 }))} />
        <Select label="Category" value={filters.categoryId} onChange={(categoryId) => setFilters((prev) => ({ ...prev, categoryId, page: 1 }))} options={[["", "All categories"], ...categories.map((category) => [category.id, category.name] as [string, string])]} />
        <Select label="Stock Status" value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status, page: 1 }))} options={[["", "All statuses"], ["IN_STOCK", "In stock"], ["LOW_STOCK", "Low stock"], ["OUT_OF_STOCK", "Out of stock"]]} />
        <button onClick={() => refetch()} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
      {!rows.length ? <EmptyState title="No inventory items" description="Inventory created by admins will appear here." /> : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Item Name</th><th className="p-3">Category</th><th className="p-3">Unit</th><th className="p-3">Current Quantity</th><th className="p-3">Minimum Level</th><th className="p-3">Stock Status</th><th className="p-3">Last Updated</th>{canEdit ? <th className="p-3 text-right">Actions</th> : null}</tr></thead>
              <tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.categoryName}</td><td className="p-3">{row.unit}</td><td className="p-3">{row.currentQuantity}</td><td className="p-3">{row.minimumQuantity}</td><td className="p-3"><StatusBadge status={row.stockStatus} /></td><td className="p-3">{date(row.updatedAt)}</td>{canEdit ? <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => openItem(row)} className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold">Edit</button><button onClick={() => { setAdjusting(row); setAdjust({ type: "IN", quantity: "", unit: row.unit, reason: "" }); }} className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white"><SlidersHorizontal className="h-3.5 w-3.5" /> Adjust</button><button onClick={() => setDeleting(row)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div></td> : null}</tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Showing {rows.length} of {total} inventory items</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))} className="rounded-lg border px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))} className="rounded-lg border px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      )}
      <CommonModal isOpen={itemOpen} onClose={() => { setItemOpen(false); setEditing(null); setForm({ categoryId: "", name: "", sku: "", unit: "kg", currentQuantity: "0", minimumQuantity: "0", description: "", isActive: true }); }} title={editing ? "Edit Inventory Item" : "Add Inventory Item"} onConfirm={submitItem} confirmText={editing ? "Save Changes" : "Create Inventory"} isConfirming={createItem.isPending || updateItem.isPending}>
        <ItemForm form={form} setForm={setForm} categories={categories} isEditing={Boolean(editing)} />
      </CommonModal>
      <CommonModal isOpen={Boolean(adjusting)} onClose={() => setAdjusting(null)} title={adjusting ? `Adjust ${adjusting.name}` : "Adjust Stock"} onConfirm={submitAdjustment} confirmText="Record Adjustment" isConfirming={adjustStock.isPending}>
        <div className="space-y-3">
          <Select label="Type" value={adjust.type} onChange={(type) => setAdjust((prev) => ({ ...prev, type: type as "IN" | "OUT" }))} options={[["IN", "Stock In"], ["OUT", "Stock Out"]]} />
          <TextInput label="Quantity" type="number" value={adjust.quantity} onChange={(quantity) => setAdjust((prev) => ({ ...prev, quantity }))} />
          <Select label="Unit" value={adjust.unit} onChange={(unit) => setAdjust((prev) => ({ ...prev, unit }))} options={units.map((unit) => [unit, unit] as [string, string])} />
          <TextArea label="Reason" value={adjust.reason} onChange={(reason) => setAdjust((prev) => ({ ...prev, reason }))} />
        </div>
      </CommonModal>
      <CommonModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete Inventory Item" onConfirm={confirmDelete} confirmText="Delete" isConfirming={deleteItem.isPending}>
        <p className="text-sm text-slate-600">Are you sure you want to delete this inventory item? Items used by recipes or stock movements will be safely deactivated instead of permanently deleted.</p>
      </CommonModal>
    </div>
  );
}

export function StockMovementsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useStockMovements({ limit: 100 });
  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load stock movements." onRetry={() => refetch()} />;
  const rows = data?.data ?? [];
  return <div className="space-y-6"><PageHeader title="Stock Movements Audit" description="Immutable stock-in, stock-out, adjustment, and recipe consumption history." actions={<button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button>} />{!rows.length ? <EmptyState title="No stock movements" description="Movement history will appear after stock changes." /> : <MovementTable rows={rows} />}</div>;
}

export function RecipeBookPage() {
  const pathname = usePathname();
  const canEdit = isAdminPath(pathname);
  const { data, isLoading, isError, refetch } = useRecipes();
  const inventoryQuery = useAllInventoryItems();
  const menuCategoryQuery = useRecipeMenuCategories();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [viewingId, setViewingId] = useState<string | undefined>();
  const [form, setForm] = useState({ menuCategoryId: "", menuItemId: "", servingQuantity: "1", servingUnit: "plate", isActive: true, ingredients: [{ inventoryItemId: "", quantity: "", unit: "kg" }] });
  const menuItems = useRecipeMenuItems(form.menuCategoryId);
  const detail = useRecipe(editing?.id ?? viewingId);
  const recipes = data?.data ?? [];
  const inventoryItems = inventoryQuery.data ?? [];
  const menuCategories = menuCategoryQuery.data?.data ?? [];
  const menuRows = menuItems.data?.data ?? [];

  useEffect(() => {
    if (editing && detail.data?.data) {
      const row = detail.data.data;
      setForm({ menuCategoryId: row.menuCategoryId, menuItemId: row.menuItemId, servingQuantity: String(row.servingQuantity), servingUnit: row.servingUnit, isActive: row.isActive, ingredients: row.ingredients.map((ingredient) => ({ inventoryItemId: ingredient.inventoryItemId, quantity: String(ingredient.quantity), unit: ingredient.unit })) });
    }
  }, [editing, detail.data]);

  function openCreate() {
    setEditing(null);
    setViewingId(undefined);
    setForm({ menuCategoryId: menuCategories[0]?.id ?? "", menuItemId: "", servingQuantity: "1", servingUnit: "plate", isActive: true, ingredients: [{ inventoryItemId: "", quantity: "", unit: inventoryItems[0]?.unit ?? "kg" }] });
    setRecipeOpen(true);
  }

  async function submitRecipe() {
    if (!form.menuItemId) {
      toast.error("Menu item is required.");
      return;
    }
    const ingredients = form.ingredients.map((ingredient) => ({ ...ingredient, quantity: Number(ingredient.quantity) }));
    if (ingredients.some((ingredient) => !ingredient.inventoryItemId || ingredient.quantity <= 0)) {
      toast.error("Each ingredient needs an inventory item and positive quantity.");
      return;
    }
    if (new Set(ingredients.map((ingredient) => ingredient.inventoryItemId)).size !== ingredients.length) {
      toast.error("Duplicate ingredients are not allowed.");
      return;
    }
    try {
      const input = { menuCategoryId: form.menuCategoryId, menuItemId: form.menuItemId, servingQuantity: Number(form.servingQuantity), servingUnit: form.servingUnit, isActive: form.isActive, ingredients };
      if (editing) {
        await updateRecipe.mutateAsync({ id: editing.id, input });
        toast.success("Recipe updated.");
      } else {
        await createRecipe.mutateAsync(input);
        toast.success("Recipe created.");
      }
      setEditing(null);
      setRecipeOpen(false);
      setForm({ menuCategoryId: "", menuItemId: "", servingQuantity: "1", servingUnit: "plate", isActive: true, ingredients: [{ inventoryItemId: "", quantity: "", unit: "kg" }] });
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load recipes." onRetry={() => refetch()} />;
  return (
    <div className="space-y-6">
      <PageHeader title="Recipe Book & Costing" description="Map real menu items to inventory ingredients and per-serving quantities." actions={canEdit ? <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add Recipe</button> : null} />
      {!recipes.length ? <EmptyState title="No recipes configured" description="Recipes created from existing menu items and inventory will appear here." /> : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Menu Item</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Ingredients</th><th className="p-3">Estimated Cost</th><th className="p-3">Updated</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y">{recipes.map((recipe) => <tr key={recipe.id}><td className="p-3 font-semibold">{recipe.menuItemName}</td><td className="p-3">{recipe.menuCategoryName}</td><td className="p-3"><StatusBadge status={recipe.isActive ? "ACTIVE" : "INACTIVE"} /></td><td className="p-3">{recipe.ingredientCount}</td><td className="p-3">{money(recipe.estimatedCost)}</td><td className="p-3">{date(recipe.updatedAt)}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setViewingId(recipe.id)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"><Eye className="h-3.5 w-3.5" /> View</button>{canEdit ? <button onClick={() => { setEditing(recipe); setRecipeOpen(true); }} className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white">Edit</button> : null}</div></td></tr>)}</tbody>
          </table>
        </div>
      )}
      <CommonModal isOpen={recipeOpen} onClose={() => { setRecipeOpen(false); setEditing(null); setForm({ menuCategoryId: "", menuItemId: "", servingQuantity: "1", servingUnit: "plate", isActive: true, ingredients: [{ inventoryItemId: "", quantity: "", unit: "kg" }] }); }} title={editing ? "Edit Recipe" : "Add Recipe"} onConfirm={submitRecipe} confirmText={editing ? "Save Recipe" : "Create Recipe"} isConfirming={createRecipe.isPending || updateRecipe.isPending} size="xl">
        <RecipeForm form={form} setForm={setForm} menuCategories={menuCategories} menuRows={menuRows} inventoryItems={inventoryItems} menuCategoryLoading={menuCategoryQuery.isLoading} menuCategoryError={menuCategoryQuery.isError} menuLoading={menuItems.isLoading} menuError={menuItems.isError} inventoryLoading={inventoryQuery.isLoading} inventoryError={inventoryQuery.isError} onRetryMenuCategories={() => menuCategoryQuery.refetch()} onRetryMenuItems={() => menuItems.refetch()} onRetryInventory={() => inventoryQuery.refetch()} />
      </CommonModal>
      <CommonModal isOpen={Boolean(viewingId)} onClose={() => setViewingId(undefined)} title="Recipe Details" showFooter={false} size="xl">
        {detail.isLoading ? <LoadingSkeleton /> : detail.data?.data ? <div className="space-y-4"><div><h3 className="text-lg font-semibold">{detail.data.data.menuItemName}</h3><p className="text-sm text-slate-500">{detail.data.data.servingQuantity} {detail.data.data.servingUnit}</p></div><div className="overflow-hidden rounded-lg border"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3 text-left">Ingredient</th><th className="p-3 text-left">Quantity / Serving</th><th className="p-3 text-left">Inventory Unit</th></tr></thead><tbody className="divide-y">{detail.data.data.ingredients.map((ingredient) => <tr key={ingredient.id}><td className="p-3 font-medium">{ingredient.inventoryItemName}</td><td className="p-3">{ingredient.quantity} {ingredient.unit}</td><td className="p-3">{ingredient.inventoryUnit}</td></tr>)}</tbody></table></div></div> : <EmptyState title="Recipe not found" description="The selected recipe could not be loaded." />}
      </CommonModal>
    </div>
  );
}

function MovementTable({ rows }: { rows: Array<{ id: string; inventoryItemName: string; movementType: string; quantity: number; unit: string; previousQuantity: number; newQuantity: number; reason?: string | null; referenceType?: string | null; referenceId?: string | null; performedBy?: string | null; createdAt: string }> }) {
  return <div className="overflow-hidden rounded-lg border bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date/Time</th><th className="p-3">Inventory Item</th><th className="p-3">Movement Type</th><th className="p-3">Quantity</th><th className="p-3">Previous</th><th className="p-3">New</th><th className="p-3">Reason</th><th className="p-3">Reference</th><th className="p-3">By</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="p-3">{date(row.createdAt)}</td><td className="p-3 font-semibold">{row.inventoryItemName}</td><td className="p-3"><StatusBadge status={row.movementType} /></td><td className="p-3">{row.quantity} {row.unit}</td><td className="p-3">{row.previousQuantity}</td><td className="p-3">{row.newQuantity}</td><td className="p-3">{row.reason ?? "-"}</td><td className="p-3">{row.referenceType ? `${row.referenceType}: ${row.referenceId ?? "-"}` : "-"}</td><td className="p-3">{row.performedBy ?? "-"}</td></tr>)}</tbody></table></div>;
}

function ItemForm({ form, setForm, categories, isEditing }: { form: { categoryId: string; name: string; sku: string; unit: string; currentQuantity: string; minimumQuantity: string; description: string; isActive: boolean }; setForm: React.Dispatch<React.SetStateAction<{ categoryId: string; name: string; sku: string; unit: string; currentQuantity: string; minimumQuantity: string; description: string; isActive: boolean }>>; categories: InventoryCategory[]; isEditing: boolean }) {
  return <div className="space-y-3">{!categories.length ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No inventory categories available. Create a category first.</p> : null}<div className="grid gap-3 sm:grid-cols-2"><TextInput label="Inventory Item Name" value={form.name} onChange={(name) => setForm((prev) => ({ ...prev, name }))} /><Select label="Inventory Category" value={form.categoryId} onChange={(categoryId) => setForm((prev) => ({ ...prev, categoryId }))} options={[["", "Select category"], ...categories.map((category) => [category.id, category.name] as [string, string])]} /><Select label="Unit" value={form.unit} onChange={(unit) => setForm((prev) => ({ ...prev, unit }))} options={units.map((unit) => [unit, unit] as [string, string])} />{!isEditing ? <TextInput label="Current Quantity" type="number" value={form.currentQuantity} onChange={(currentQuantity) => setForm((prev) => ({ ...prev, currentQuantity }))} /> : null}<TextInput label="Minimum/Low Stock Level" type="number" value={form.minimumQuantity} onChange={(minimumQuantity) => setForm((prev) => ({ ...prev, minimumQuantity }))} /><TextInput label="SKU / Code" value={form.sku} onChange={(sku) => setForm((prev) => ({ ...prev, sku }))} /><div className="sm:col-span-2"><TextArea label="Description" value={form.description} onChange={(description) => setForm((prev) => ({ ...prev, description }))} /></div><CheckInput label="Active" checked={form.isActive} onChange={(isActive) => setForm((prev) => ({ ...prev, isActive }))} /></div></div>;
}

function RecipeForm({
  form,
  setForm,
  menuCategories,
  menuRows,
  inventoryItems,
  menuCategoryLoading,
  menuCategoryError,
  menuLoading,
  menuError,
  inventoryLoading,
  inventoryError,
  onRetryMenuCategories,
  onRetryMenuItems,
  onRetryInventory,
}: {
  form: { menuCategoryId: string; menuItemId: string; servingQuantity: string; servingUnit: string; isActive: boolean; ingredients: Array<{ inventoryItemId: string; quantity: string; unit: string }> };
  setForm: React.Dispatch<React.SetStateAction<{ menuCategoryId: string; menuItemId: string; servingQuantity: string; servingUnit: string; isActive: boolean; ingredients: Array<{ inventoryItemId: string; quantity: string; unit: string }> }>>;
  menuCategories: Array<{ id: string; name: string }>;
  menuRows: Array<{ item: { id: string; name: string }; category: { id: string; name: string } }>;
  inventoryItems: InventoryItem[];
  menuCategoryLoading: boolean;
  menuCategoryError: boolean;
  menuLoading: boolean;
  menuError: boolean;
  inventoryLoading: boolean;
  inventoryError: boolean;
  onRetryMenuCategories: () => void;
  onRetryMenuItems: () => void;
  onRetryInventory: () => void;
}) {
  const [inventorySearch, setInventorySearch] = useState<Record<number, string>>({});
  const selectedIds = new Set(form.ingredients.map((ingredient) => ingredient.inventoryItemId).filter(Boolean));

  function updateIngredient(index: number, value: Partial<{ inventoryItemId: string; quantity: string; unit: string }>) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((row, rowIndex) => rowIndex === index ? { ...row, ...value } : row),
    }));
  }

  function inventoryOptions(ingredient: { inventoryItemId: string }, index: number) {
    const search = (inventorySearch[index] ?? "").trim().toLowerCase();
    return inventoryItems
      .filter((item) => item.id === ingredient.inventoryItemId || !selectedIds.has(item.id))
      .filter((item) => !search || item.name.toLowerCase().includes(search) || item.unit.toLowerCase().includes(search) || item.categoryName.toLowerCase().includes(search))
      .map((item) => [item.id, `${item.name} - ${item.unit}`] as [string, string]);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Menu Category" value={form.menuCategoryId} disabled={menuCategoryLoading || menuCategoryError} onChange={(menuCategoryId) => setForm((prev) => ({ ...prev, menuCategoryId, menuItemId: "" }))} options={[["", menuCategoryLoading ? "Loading menu categories..." : "Select category"], ...menuCategories.map((category) => [category.id, category.name] as [string, string])]} />
        <Select label="Menu Item" value={form.menuItemId} disabled={!form.menuCategoryId || menuLoading || menuError} onChange={(menuItemId) => setForm((prev) => ({ ...prev, menuItemId }))} options={[["", !form.menuCategoryId ? "Select category first" : menuLoading ? "Loading menu items..." : menuRows.length ? "Select menu item" : "No menu items found in this category"], ...menuRows.map((row) => [row.item.id, row.item.name] as [string, string])]} />
        <TextInput label="Base Quantity" type="number" value={form.servingQuantity} onChange={(servingQuantity) => setForm((prev) => ({ ...prev, servingQuantity }))} />
        <TextInput label="Serving Type" value={form.servingUnit} onChange={(servingUnit) => setForm((prev) => ({ ...prev, servingUnit }))} />
      </div>
      {menuCategoryError ? <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><span>Unable to load menu categories.</span><button type="button" onClick={onRetryMenuCategories} className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold">Retry</button></div> : null}
      {!menuCategoryLoading && !menuCategoryError && !menuCategories.length ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No menu categories found.</p> : null}
      {menuError ? <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><span>Unable to load menu items.</span><button type="button" onClick={onRetryMenuItems} className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold">Retry</button></div> : null}
      {form.menuCategoryId && !menuLoading && !menuError && !menuRows.length ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No menu items found in this category.</p> : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Ingredients</h3>
          <button type="button" disabled={inventoryLoading || inventoryError || !inventoryItems.length} onClick={() => setForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, { inventoryItemId: "", quantity: "", unit: inventoryItems[0]?.unit ?? "kg" }] }))} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Add Ingredient</button>
        </div>

        {inventoryLoading ? <p className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-600">Loading inventory items...</p> : null}
        {inventoryError ? <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><span>Unable to load inventory items.</span><button type="button" onClick={onRetryInventory} className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold">Retry</button></div> : null}
        {!inventoryLoading && !inventoryError && !inventoryItems.length ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No inventory items found. Create inventory item first.</p> : null}

        {form.ingredients.map((ingredient, index) => {
          const selectedItem = inventoryItems.find((item) => item.id === ingredient.inventoryItemId);
          return (
            <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px_120px_auto]">
              <div className="space-y-2">
                <TextInput label="Search Inventory Item" value={inventorySearch[index] ?? ""} onChange={(search) => setInventorySearch((prev) => ({ ...prev, [index]: search }))} />
                <Select value={ingredient.inventoryItemId} onChange={(inventoryItemId) => updateIngredient(index, { inventoryItemId, unit: inventoryItems.find((item) => item.id === inventoryItemId)?.unit ?? ingredient.unit })} options={[["", inventoryLoading ? "Loading inventory items..." : "Select inventory item"], ...inventoryOptions(ingredient, index)]} />
              </div>
              <TextInput type="number" label="Quantity" value={ingredient.quantity} onChange={(quantity) => updateIngredient(index, { quantity })} />
              <Select label="Unit" value={ingredient.unit} onChange={(unit) => updateIngredient(index, { unit })} options={units.map((unit) => [unit, unit] as [string, string])} />
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, ingredients: prev.ingredients.filter((_, rowIndex) => rowIndex !== index) }))} className="self-end rounded-lg border px-3 py-2 text-xs font-semibold text-red-600">Remove</button>
              {selectedItem ? <p className="text-xs text-slate-500 sm:col-span-4">Inventory unit: {selectedItem.unit}</p> : null}
            </div>
          );
        })}
      </div>
      <CheckInput label="Active Recipe" checked={form.isActive} onChange={(isActive) => setForm((prev) => ({ ...prev, isActive }))} />
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text" }: { label?: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-semibold uppercase text-slate-500">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm normal-case text-slate-900" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold uppercase text-slate-500">{label}<textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm normal-case text-slate-900" /></label>;
}

function Select({ label, value, onChange, options, disabled = false }: { label?: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; disabled?: boolean }) {
  const control = <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm normal-case text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">{options.map(([optionValue, optionLabel]) => <option key={`${optionValue}-${optionLabel}`} value={optionValue}>{optionLabel}</option>)}</select>;
  return label ? <label className="block text-xs font-semibold uppercase text-slate-500">{label}{control}</label> : control;
}

function CheckInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />{label}</label>;
}
