"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import type { DashboardDateQueryParams } from "@/lib/dashboard/date-filter";
import { getSuperAdminDashboard } from "../api/dashboard-api";

export function useSuperAdminDashboard(params?: DashboardDateQueryParams) {
  return useQuery({
    queryKey: queryKeys.superAdminDashboard(params),
    queryFn: () => getSuperAdminDashboard(params),
  });
}
