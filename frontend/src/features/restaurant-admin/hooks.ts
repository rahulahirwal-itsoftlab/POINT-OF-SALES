"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import type { DashboardDateQueryParams } from "@/lib/dashboard/date-filter";
import {
  createRestaurantAdminStaff,
  getRestaurantAdminAuditLogs,
  getRestaurantAdminBills,
  getRestaurantAdminDashboard,
  getRestaurantAdminNotifications,
  getRestaurantAdminStaff,
  getRestaurantAdminStaffDetail,
  getRestaurantAdminSubscription,
  markAllRestaurantAdminNotificationsRead,
  markRestaurantAdminNotificationRead,
  updateRestaurantAdminStaff,
  updateRestaurantAdminStaffStatus,
  type ListParams,
} from "./api";
import type { UserStatus } from "./types";

export function useRestaurantAdminDashboard(params?: DashboardDateQueryParams) {
  return useQuery({ queryKey: queryKeys.restaurantAdminDashboard(params), queryFn: () => getRestaurantAdminDashboard(params) });
}

export function useRestaurantAdminStaff(params: ListParams) {
  return useQuery({ queryKey: queryKeys.restaurantAdminStaff(params), queryFn: () => getRestaurantAdminStaff(params) });
}

export function useCreateRestaurantAdminStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRestaurantAdminStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "audit-logs"] });
    },
  });
}

export function useUpdateRestaurantAdminStaffStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => updateRestaurantAdminStaffStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "audit-logs"] });
    },
  });
}

export function useRestaurantAdminStaffDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.restaurantAdminStaffDetail(id ?? ""),
    queryFn: () => getRestaurantAdminStaffDetail(id!),
    enabled: Boolean(id),
  });
}

export function useUpdateRestaurantAdminStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateRestaurantAdminStaff(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "audit-logs"] });
    },
  });
}

export function useRestaurantAdminBills(params: ListParams) {
  return useQuery({ queryKey: queryKeys.restaurantAdminBills(params), queryFn: () => getRestaurantAdminBills(params) });
}

export function useRestaurantAdminSubscription() {
  return useQuery({ queryKey: queryKeys.restaurantAdminSubscription, queryFn: getRestaurantAdminSubscription });
}

export function useRestaurantAdminAuditLogs(params: ListParams) {
  return useQuery({ queryKey: queryKeys.restaurantAdminAuditLogs(params), queryFn: () => getRestaurantAdminAuditLogs(params) });
}

export function useRestaurantAdminNotifications(params: ListParams) {
  return useQuery({ queryKey: queryKeys.restaurantAdminNotifications(params), queryFn: () => getRestaurantAdminNotifications(params) });
}

export function useReadRestaurantAdminNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRestaurantAdminNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "notifications"] }),
  });
}

export function useReadAllRestaurantAdminNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRestaurantAdminNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["restaurant-admin", "notifications"] }),
  });
}
