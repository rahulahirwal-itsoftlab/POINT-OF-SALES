"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjustInventoryStock,
  createInventoryCategory,
  createInventoryItem,
  createRecipe,
  deleteInventoryCategory,
  deleteInventoryItem,
  getAllInventoryItems,
  getInventoryCategories,
  getInventoryItems,
  getInventoryOverview,
  getRecipe,
  getRecipeMenuCategories,
  getRecipeMenuItems,
  getRecipes,
  getStockMovements,
  updateInventoryCategory,
  updateInventoryItem,
  updateRecipe,
} from "./api";

function invalidateInventory(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["inventory"] });
  queryClient.invalidateQueries({ queryKey: ["staff-pos", "kitchen-orders"] });
}

export function useInventoryOverview() {
  return useQuery({ queryKey: ["inventory", "overview"], queryFn: getInventoryOverview });
}

export function useInventoryCategories() {
  return useQuery({ queryKey: ["inventory", "categories"], queryFn: getInventoryCategories });
}

export function useCreateInventoryCategory() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createInventoryCategory, onSuccess: () => invalidateInventory(queryClient) });
}

export function useUpdateInventoryCategory() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateInventoryCategory>[1] }) => updateInventoryCategory(id, input), onSuccess: () => invalidateInventory(queryClient) });
}

export function useDeleteInventoryCategory() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteInventoryCategory, onSuccess: () => invalidateInventory(queryClient) });
}

export function useInventoryItems(params?: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: ["inventory", "items", params], queryFn: () => getInventoryItems(params) });
}

export function useAllInventoryItems() {
  return useQuery({ queryKey: ["inventory", "items", "all"], queryFn: getAllInventoryItems });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createInventoryItem, onSuccess: () => invalidateInventory(queryClient) });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateInventoryItem>[1] }) => updateInventoryItem(id, input), onSuccess: () => invalidateInventory(queryClient) });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: deleteInventoryItem, onSuccess: () => invalidateInventory(queryClient) });
}

export function useAdjustInventoryStock() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof adjustInventoryStock>[1] }) => adjustInventoryStock(id, input), onSuccess: () => invalidateInventory(queryClient) });
}

export function useStockMovements(params?: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: ["inventory", "movements", params], queryFn: () => getStockMovements(params) });
}

export function useRecipes() {
  return useQuery({ queryKey: ["inventory", "recipes"], queryFn: getRecipes });
}

export function useRecipe(id?: string) {
  return useQuery({ queryKey: ["inventory", "recipes", id], queryFn: () => getRecipe(id!), enabled: Boolean(id) });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createRecipe, onSuccess: () => invalidateInventory(queryClient) });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRecipe>[1] }) => updateRecipe(id, input), onSuccess: () => invalidateInventory(queryClient) });
}

export function useRecipeMenuCategories() {
  return useQuery({ queryKey: ["inventory", "menu-categories"], queryFn: getRecipeMenuCategories });
}

export function useRecipeMenuItems(categoryId?: string) {
  return useQuery({ queryKey: ["inventory", "menu-items", categoryId], queryFn: () => getRecipeMenuItems(categoryId), enabled: Boolean(categoryId) });
}
