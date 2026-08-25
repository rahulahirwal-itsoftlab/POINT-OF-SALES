"use client";

import { Calendar, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
};

export type ActiveFilterChip = {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
};

export function FilterCard({
  title = "Filters",
  activeCount = 0,
  chips = [],
  onClear,
  children,
  className,
}: {
  title?: string;
  activeCount?: number;
  chips?: ActiveFilterChip[];
  onClear?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const hasActiveFilters = activeCount > 0 || chips.length > 0;

  return (
    <section className={cn("rounded-2xl border p-4 shadow-sm transition sm:p-5", className)} style={{ borderColor: "var(--border-soft)", background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border" style={{ borderColor: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" }}>
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>{title}</h2>
          {hasActiveFilters ? (
            <span className="rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" }}>
              {activeCount || chips.length} active
            </span>
          ) : null}
        </div>
        {hasActiveFilters && onClear ? (
          <button type="button" onClick={onClear} className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition hover:bg-blue-50 hover:text-blue-700" style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}>
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">{children}</div>

      {chips.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              type="button"
              key={chip.key}
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition hover:bg-blue-50"
              style={{ borderColor: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" }}
              aria-label={`Remove ${chip.label} filter`}
            >
              {chip.label}: {chip.value}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function FilterSearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  label = "Search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0 flex-1 text-xs font-bold uppercase tracking-wide md:min-w-64", className)} style={{ color: "var(--muted)" }}>
      <span>{label}</span>
      <span className="relative mt-1 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="heritage-input h-11 w-full rounded-xl pl-9 pr-9 text-sm font-normal normal-case transition hover:border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {value ? (
          <button type="button" onClick={onClear ?? (() => onChange(""))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" aria-label="Clear search">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </span>
    </label>
  );
}

export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: FilterOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("block text-xs font-bold uppercase tracking-wide", className)} style={{ color: "var(--muted)" }}>
      <span>{label}</span>
      <span className="relative mt-1 block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="heritage-input h-11 w-full appearance-none rounded-xl px-3 pr-9 text-sm font-normal normal-case transition hover:border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-48"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

export type DatePreset = "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";

export function DateRangeFilter({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onDateChange,
  label = "Date Range",
  className,
}: {
  preset: DatePreset;
  startDate?: string;
  endDate?: string;
  onPresetChange: (preset: DatePreset) => void;
  onDateChange?: (range: { startDate: string; endDate: string }) => void;
  label?: string;
  className?: string;
}) {
  const dateError = startDate && endDate && startDate > endDate ? "Start date cannot be after end date" : null;

  const presetOptions: FilterOption<DatePreset>[] = [
    { value: "TODAY", label: "Today" },
    { value: "YESTERDAY", label: "Yesterday" },
    { value: "THIS_WEEK", label: "This Week" },
    { value: "THIS_MONTH", label: "This Month" },
    { value: "LAST_MONTH", label: "Last Month" },
    { value: "CUSTOM", label: "Custom Range" },
  ];

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <FilterSelect
        value={preset}
        onChange={onPresetChange}
        options={presetOptions}
        label={label}
      />

      {preset === "CUSTOM" && onDateChange ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            <span>Start Date</span>
            <span className="relative mt-1 block">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
              type="date"
              value={startDate ?? ""}
              onChange={(e) => {
                const newStart = e.target.value;
                if (!endDate || newStart <= endDate) {
                  onDateChange({ startDate: newStart, endDate: endDate ?? newStart });
                }
              }}
                className="heritage-input h-11 rounded-xl px-3 pl-9 text-sm font-normal normal-case transition hover:border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </span>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            <span>End Date</span>
            <span className="relative mt-1 block">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
              type="date"
              value={endDate ?? ""}
              onChange={(e) => {
                const newEnd = e.target.value;
                if (!startDate || startDate <= newEnd) {
                  onDateChange({ startDate: startDate ?? newEnd, endDate: newEnd });
                }
              }}
                className="heritage-input h-11 rounded-xl px-3 pl-9 text-sm font-normal normal-case transition hover:border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </span>
          </label>
          {dateError ? (
            <p className="w-full text-xs font-semibold text-red-600">{dateError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const CommonFilterBar = FilterCard;
export const SearchFilter = FilterSearchInput;
export const StatusFilter = FilterSelect;
export const ClearFiltersButton = ({ onClear }: { onClear: () => void }) => (
  <button
    type="button"
    onClick={onClear}
    className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition hover:bg-blue-50"
    style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
  >
    <X className="h-3.5 w-3.5" />
    Clear Filters
  </button>
);
