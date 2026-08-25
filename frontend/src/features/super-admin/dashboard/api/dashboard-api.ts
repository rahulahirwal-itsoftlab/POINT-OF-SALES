import { apiClient } from "@/lib/api/client";
import type { DashboardDateQueryParams } from "@/lib/dashboard/date-filter";
import type { SuperAdminDashboard } from "../types/dashboard.types";

export async function getSuperAdminDashboard(params?: DashboardDateQueryParams): Promise<{ data: SuperAdminDashboard }> {
  const response = await apiClient.get("/super-admin/dashboard", { params });
  return response.data;
}
