"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DashboardDateQueryParams } from "@/lib/dashboard/date-filter";
import {
  addOrderItems,
  assignTable,
  createCategory,
  createMenuItem,
  createOrder,
  createTable,
  deleteTable,
  deleteMenuItem,
  getCategories,
  getKitchenOrders,
  getMenu,
  getOrderDetail,
  getStaffBillDetail,
  getStaffBills,
  getStaffDashboard,
  getStaffNotifications,
  getStaffOrders,
  getTableDetail,
  getTables,
  payBill,
  readAllStaffNotifications,
  readStaffNotification,
  sendOrderToBilling,
  serveOrder,
  updateKitchenOrderStatus,
  updateMenuItem,
  updateTable,
  uploadMenuImage,
} from "./api";

export function useStaffDashboard(params?: DashboardDateQueryParams) {
  return useQuery({ queryKey: ["staff-pos", "dashboard", params], queryFn: () => getStaffDashboard(params), refetchInterval: 15_000 });
}

export function useStaffOrders(params?: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: ["staff-pos", "orders", params], queryFn: () => getStaffOrders(params), refetchInterval: 10_000 });
}

export function useTables() {
  return useQuery({ queryKey: ["staff-pos", "tables"], queryFn: getTables, refetchInterval: 10_000 });
}

export function useTableDetail(id?: string) {
  return useQuery({ queryKey: ["staff-pos", "tables", id], queryFn: () => getTableDetail(id!), enabled: Boolean(id), refetchInterval: 10_000 });
}

function invalidateOps(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["staff-pos", "tables"] });
  queryClient.invalidateQueries({ queryKey: ["staff-pos", "orders"] });
  queryClient.invalidateQueries({ queryKey: ["staff-pos", "kitchen-orders"] });
  queryClient.invalidateQueries({ queryKey: ["staff-pos", "bills"] });
  queryClient.invalidateQueries({ queryKey: ["staff-pos", "dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["staff-pos", "notifications"] });
}

export function useAssignTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, input }: { tableId: string; input: Parameters<typeof assignTable>[1] }) => assignTable(tableId, input),
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTable,
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateTable>[1] }) => updateTable(id, input),
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTable,
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useOrderDetail(id?: string) {
  return useQuery({ queryKey: ["staff-pos", "orders", id], queryFn: () => getOrderDetail(id!), enabled: Boolean(id), refetchInterval: 10_000 });
}

export function useAddOrderItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof addOrderItems>[1] }) => addOrderItems(id, input),
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useServeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: serveOrder,
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useSendOrderToBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendOrderToBilling,
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useKitchenOrders() {
  return useQuery({ queryKey: ["staff-pos", "kitchen-orders"], queryFn: getKitchenOrders, refetchInterval: 5_000 });
}

export function useUpdateKitchenOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateKitchenOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "dashboard"] });
    },
  });
}

export function useStaffBills(params?: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: ["staff-pos", "bills", params], queryFn: () => getStaffBills(params), refetchInterval: 10_000 });
}

export function useStaffBillDetail(id?: string) {
  return useQuery({ queryKey: ["staff-pos", "bills", id], queryFn: () => getStaffBillDetail(id!), enabled: Boolean(id), refetchInterval: 10_000 });
}

export function useStaffNotifications(params?: Record<string, string | number | undefined>) {
  return useQuery({ queryKey: ["staff-pos", "notifications", params], queryFn: () => getStaffNotifications(params), refetchInterval: 5_000 });
}

export function useReadStaffNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: readStaffNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "notifications"] });
    },
  });
}

export function useReadAllStaffNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: readAllStaffNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "notifications"] });
    },
  });
}

export function usePayBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof payBill>[1] }) => payBill(id, input),
    onSuccess: () => invalidateOps(queryClient),
  });
}

export function useCategories() {
  return useQuery({ queryKey: ["staff-pos", "categories"], queryFn: getCategories });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "categories"] });
    },
  });
}

export function useMenu() {
  return useQuery({ queryKey: ["staff-pos", "menu"], queryFn: getMenu });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "menu"] });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateMenuItem>[1] }) => updateMenuItem(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "menu"] });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "menu"] });
    },
  });
}

export function useUploadMenuImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMenuImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-pos", "menu"] });
    },
  });
}
