export const dashboardDatePresets = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "custom",
] as const;

export type DashboardDatePreset = (typeof dashboardDatePresets)[number];

export type DashboardDateFilterState = {
  preset: DashboardDatePreset;
  startDate?: string;
  endDate?: string;
};

export type DashboardDateQueryParams = {
  range: DashboardDatePreset;
  startDate?: string;
  endDate?: string;
};

export const defaultDashboardDateFilter: DashboardDateFilterState = {
  preset: "today",
};

export const dashboardDatePresetLabels: Record<DashboardDatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  last_year: "Last Year",
  custom: "Custom Date Range",
};

export function isDashboardDatePreset(value: string | null): value is DashboardDatePreset {
  return Boolean(value && dashboardDatePresets.includes(value as DashboardDatePreset));
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateInputValue() {
  return toDateInputValue(new Date());
}

export function getDefaultCustomDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(now),
  };
}

export function normalizeDashboardDateFilter(filter: DashboardDateFilterState): DashboardDateFilterState {
  if (filter.preset !== "custom") {
    return { preset: filter.preset };
  }

  const fallback = getDefaultCustomDateRange();
  return {
    preset: "custom",
    startDate: filter.startDate || fallback.startDate,
    endDate: filter.endDate || fallback.endDate,
  };
}

export function dashboardDateFilterToApiParams(filter: DashboardDateFilterState): DashboardDateQueryParams {
  const normalized = normalizeDashboardDateFilter(filter);
  return normalized.preset === "custom"
    ? { range: "custom", startDate: normalized.startDate, endDate: normalized.endDate }
    : { range: normalized.preset };
}
