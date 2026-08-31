import { apiClient } from "@/lib/api/client";
import type { DashboardDateQueryParams } from "@/lib/dashboard/date-filter";
import type { AuditLog, AvailablePlansResponse, BillRow, RestaurantAdminDashboard, RestaurantNotification, StaffMember, StaffRole, SubscriptionDetails, UserStatus } from "./types";

type ApiList<T> = { data: T[]; meta?: { total?: number; page?: number; limit?: number; unread?: number } };
type ApiOne<T> = { data: T };

export type ListParams = Record<string, string | number | undefined>;

export async function getRestaurantAdminDashboard(params?: DashboardDateQueryParams) {
  const response = await apiClient.get<ApiOne<RestaurantAdminDashboard>>("/restaurant-admin/dashboard", { params });
  return response.data;
}

export async function getRestaurantAdminStaff(params: ListParams) {
  const response = await apiClient.get<ApiList<StaffMember>>("/restaurant-admin/staff", { params });
  return response.data;
}

export async function createRestaurantAdminStaff(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: StaffRole;
  shift?: string;
  assignedSection?: string;
  kitchenStation?: string;
}) {
  const response = await apiClient.post<ApiOne<StaffMember>>("/restaurant-admin/staff", input);
  return response.data;
}

export async function updateRestaurantAdminStaffStatus(id: string, status: UserStatus) {
  const response = await apiClient.patch<ApiOne<StaffMember>>(`/restaurant-admin/staff/${id}/status`, { status });
  return response.data;
}

export async function getRestaurantAdminStaffDetail(id: string) {
  const response = await apiClient.get<ApiOne<StaffMember>>(`/restaurant-admin/staff/${id}`);
  return response.data;
}

export async function updateRestaurantAdminStaff(id: string, input: Record<string, unknown>) {
  const response = await apiClient.patch<ApiOne<StaffMember>>(`/restaurant-admin/staff/${id}`, input);
  return response.data;
}

export async function getRestaurantAdminBills(params: ListParams) {
  const response = await apiClient.get<ApiList<BillRow>>("/restaurant-admin/bills", { params });
  return response.data;
}

export async function getRestaurantAdminSubscription() {
  const response = await apiClient.get<ApiOne<SubscriptionDetails>>("/restaurant-admin/subscription");
  return response.data;
}

export async function getRestaurantAdminAvailablePlans() {
  const response = await apiClient.get<ApiOne<AvailablePlansResponse>>("/restaurant-admin/plans");
  return response.data;
}

export async function renewRestaurantAdminSubscription(input: { planId: string; billingCycle: "MONTHLY" | "YEARLY" }) {
  const response = await apiClient.post("/restaurant-admin/subscription/renew", input);
  return response.data;
}

export async function getRestaurantAdminAuditLogs(params: ListParams) {
  const response = await apiClient.get<ApiList<AuditLog>>("/restaurant-admin/audit-logs", { params });
  return response.data;
}

export async function getRestaurantAdminNotifications(params: ListParams) {
  const response = await apiClient.get<ApiList<RestaurantNotification>>("/restaurant-admin/notifications", { params });
  return response.data;
}

export async function markRestaurantAdminNotificationRead(id: string) {
  const response = await apiClient.patch(`/restaurant-admin/notifications/${id}/read`);
  return response.data;
}

export async function markAllRestaurantAdminNotificationsRead() {
  const response = await apiClient.patch("/restaurant-admin/notifications/read-all");
  return response.data;
}
