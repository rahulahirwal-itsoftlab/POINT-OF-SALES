import { z } from "zod";

export const dashboardRangePresets = [
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

export type DashboardRangePreset = (typeof dashboardRangePresets)[number];
export type DashboardGrouping = "hourly" | "daily" | "weekly" | "monthly";

export type DashboardDateRange = {
  preset: DashboardRangePreset;
  startDate: Date;
  endDate: Date;
  endExclusive: Date;
  timezone: string;
  grouping: DashboardGrouping;
};

export const dashboardDateRangeQuerySchema = z.object({
  range: z.enum(dashboardRangePresets).optional().default("today"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
}).superRefine((query, context) => {
  if (query.range === "custom") {
    if (!query.startDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Start date is required" });
    if (!query.endDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date is required" });
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Start date cannot be after end date" });
    }
  }
});

type DashboardDateRangeQuery = z.infer<typeof dashboardDateRangeQuerySchema>;

const dayMs = 86_400_000;

function datePart(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.get("year")),
    month: Number(byType.get("month")),
    day: Number(byType.get("day")),
  };
}

function zonedDateToUtc(year: number, month: number, day: number, timezone: string) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess);
  const byType = new Map(formatted.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(byType.get("year")),
    Number(byType.get("month")) - 1,
    Number(byType.get("day")),
    Number(byType.get("hour")),
    Number(byType.get("minute")),
    Number(byType.get("second")),
  );
  return new Date(utcGuess.getTime() - (asUtc - utcGuess.getTime()));
}

function addDays(date: { year: number; month: number; day: number }, days: number) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function toUtcDate(date: { year: number; month: number; day: number }, timezone: string) {
  return zonedDateToUtc(date.year, date.month, date.day, timezone);
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function rangeLengthDays(startDate: Date, endExclusive: Date) {
  return Math.max(1, Math.round((endExclusive.getTime() - startDate.getTime()) / dayMs));
}

function groupingFor(preset: DashboardRangePreset, days: number): DashboardGrouping {
  if (preset === "today" || preset === "yesterday") return "hourly";
  if (preset === "this_year" || preset === "last_year") return "monthly";
  if (days > 120) return "monthly";
  if (days > 45) return "weekly";
  return "daily";
}

export function buildDashboardDateRange(query: DashboardDateRangeQuery, timezone = "Asia/Kolkata"): DashboardDateRange {
  const preset = query.range;
  const today = datePart(new Date(), timezone);
  let start = today;
  let endExclusive = addDays(today, 1);

  if (preset === "yesterday") {
    start = addDays(today, -1);
    endExclusive = today;
  } else if (preset === "this_week") {
    const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    start = addDays(today, -weekday);
  } else if (preset === "last_week") {
    const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    endExclusive = addDays(today, -weekday);
    start = addDays(endExclusive, -7);
  } else if (preset === "this_month") {
    start = { year: today.year, month: today.month, day: 1 };
  } else if (preset === "last_month") {
    const firstThisMonth = { year: today.year, month: today.month, day: 1 };
    endExclusive = firstThisMonth;
    const previous = new Date(Date.UTC(today.year, today.month - 2, 1));
    start = { year: previous.getUTCFullYear(), month: previous.getUTCMonth() + 1, day: 1 };
  } else if (preset === "this_year") {
    start = { year: today.year, month: 1, day: 1 };
  } else if (preset === "last_year") {
    start = { year: today.year - 1, month: 1, day: 1 };
    endExclusive = { year: today.year, month: 1, day: 1 };
  } else if (preset === "custom") {
    start = parseDateOnly(query.startDate!);
    endExclusive = addDays(parseDateOnly(query.endDate!), 1);
  }

  const startDate = toUtcDate(start, timezone);
  const endDate = toUtcDate(addDays(endExclusive, -1), timezone);
  const endExclusiveDate = toUtcDate(endExclusive, timezone);
  const days = rangeLengthDays(startDate, endExclusiveDate);

  return {
    preset,
    startDate,
    endDate,
    endExclusive: endExclusiveDate,
    timezone,
    grouping: groupingFor(preset, days),
  };
}

export function serializeDashboardDateRange(range: DashboardDateRange) {
  return {
    preset: range.preset,
    startDate: range.startDate.toISOString(),
    endDate: range.endDate.toISOString(),
    timezone: range.timezone,
    grouping: range.grouping,
  };
}

export function createDateSeries(range: DashboardDateRange) {
  if (range.grouping === "hourly") {
    return Array.from({ length: 24 }, (_, hour) => ({ key: String(hour).padStart(2, "0"), label: `${String(hour).padStart(2, "0")}:00` }));
  }

  if (range.grouping === "monthly") {
    const start = datePart(range.startDate, range.timezone);
    const end = datePart(range.endExclusive, range.timezone);
    const rows: Array<{ key: string; label: string }> = [];
    for (let year = start.year, month = start.month; year < end.year || (year === end.year && month <= end.month); month += 1) {
      if (month > 12) {
        year += 1;
        month = 1;
      }
      rows.push({ key: `${year}-${String(month).padStart(2, "0")}`, label: `${year}-${String(month).padStart(2, "0")}` });
    }
    return rows.slice(0, Math.max(1, rows.length - 1));
  }

  const rows: Array<{ key: string; label: string }> = [];
  for (let cursor = range.startDate.getTime(); cursor < range.endExclusive.getTime(); cursor += dayMs * (range.grouping === "weekly" ? 7 : 1)) {
    const local = datePart(new Date(cursor), range.timezone);
    const key = `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
    rows.push({ key, label: key });
  }
  return rows;
}
