import { apiClient } from "@/lib/api/client";
import type { RevenueChartItem, RevenueOverview } from "../types/revenue.types";

export async function getRevenueOverview(params?: { from?: string; to?: string }): Promise<{ data: RevenueOverview }> {
  const response = await apiClient.get("/super-admin/revenue", { params });
  return response.data;
}

export async function getMonthlyRevenue(params?: { from?: string; to?: string }): Promise<{ data: RevenueChartItem[] }> {
  const response = await apiClient.get("/super-admin/revenue/monthly", { params });
  return response.data;
}

export async function getYearlyRevenue(params?: { from?: string; to?: string }): Promise<{ data: RevenueChartItem[] }> {
  const response = await apiClient.get("/super-admin/revenue/yearly", { params });
  return response.data;
}
