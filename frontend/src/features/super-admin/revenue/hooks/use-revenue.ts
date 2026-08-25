import { useQuery } from "@tanstack/react-query";
import { getMonthlyRevenue, getRevenueOverview, getYearlyRevenue } from "../api/revenue-api";

export function useRevenueOverview(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["super-admin-revenue-overview", params],
    queryFn: () => getRevenueOverview(params),
  });
}

export function useMonthlyRevenue(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["super-admin-revenue-monthly", params],
    queryFn: () => getMonthlyRevenue(params),
  });
}

export function useYearlyRevenue(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["super-admin-revenue-yearly", params],
    queryFn: () => getYearlyRevenue(params),
  });
}
