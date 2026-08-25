"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  dashboardDateFilterToApiParams,
  defaultDashboardDateFilter,
  getDefaultCustomDateRange,
  isDashboardDatePreset,
  normalizeDashboardDateFilter,
  type DashboardDateFilterState,
} from "@/lib/dashboard/date-filter";

export function useDashboardDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo<DashboardDateFilterState>(() => {
    const preset = searchParams.get("range");
    if (!isDashboardDatePreset(preset)) return defaultDashboardDateFilter;

    if (preset !== "custom") return { preset };

    return normalizeDashboardDateFilter({
      preset,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });
  }, [searchParams]);

  const apiParams = useMemo(() => dashboardDateFilterToApiParams(filter), [filter]);

  function setFilter(nextFilter: DashboardDateFilterState) {
    const normalized = normalizeDashboardDateFilter(nextFilter);
    const params = new URLSearchParams(searchParams.toString());

    params.set("range", normalized.preset);
    if (normalized.preset === "custom") {
      const fallback = getDefaultCustomDateRange();
      params.set("startDate", normalized.startDate ?? fallback.startDate);
      params.set("endDate", normalized.endDate ?? fallback.endDate);
    } else {
      params.delete("startDate");
      params.delete("endDate");
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function resetFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("range");
    params.delete("startDate");
    params.delete("endDate");
    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  return { filter, apiParams, setFilter, resetFilter };
}
