"use client";

import { useEffect, useMemo, useState } from "react";
import {
  dashboardDatePresetLabels,
  dashboardDatePresets,
  getDefaultCustomDateRange,
  todayDateInputValue,
  type DashboardDateFilterState,
  type DashboardDatePreset,
} from "@/lib/dashboard/date-filter";
import { FilterCard, FilterSelect, type ActiveFilterChip } from "@/components/common/filters";

type DashboardDateFilterProps = {
  value: DashboardDateFilterState;
  onChange: (value: DashboardDateFilterState) => void;
  onReset: () => void;
  isLoading?: boolean;
};

export function DashboardDateFilter({ value, onChange, onReset, isLoading }: DashboardDateFilterProps) {
  const customDefaults = useMemo(() => getDefaultCustomDateRange(), []);
  const [draft, setDraft] = useState({
    startDate: value.startDate ?? customDefaults.startDate,
    endDate: value.endDate ?? customDefaults.endDate,
  });
  const [error, setError] = useState("");
  const maxDate = todayDateInputValue();
  const activeChips: ActiveFilterChip[] = value.preset === "today" ? [] : [
    {
      key: "date",
      label: "Date",
      value: value.preset === "custom" && value.startDate && value.endDate ? `${formatDate(value.startDate)} -> ${formatDate(value.endDate)}` : dashboardDatePresetLabels[value.preset],
      onRemove: onReset,
    },
  ];

  useEffect(() => {
    setDraft({
      startDate: value.startDate ?? customDefaults.startDate,
      endDate: value.endDate ?? customDefaults.endDate,
    });
  }, [customDefaults.endDate, customDefaults.startDate, value.endDate, value.startDate]);

  function selectPreset(preset: DashboardDatePreset) {
    setError("");
    if (preset === "custom") {
      onChange({ preset, ...draft });
      return;
    }
    onChange({ preset });
  }

  function applyCustomRange() {
    if (!draft.startDate || !draft.endDate) {
      setError("Choose both start and end dates.");
      return;
    }

    if (draft.startDate > draft.endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    if (draft.startDate > maxDate || draft.endDate > maxDate) {
      setError("Future dates are not available for historical reports.");
      return;
    }

    setError("");
    onChange({ preset: "custom", startDate: draft.startDate, endDate: draft.endDate });
  }

  return (
    <FilterCard title="Date Filters" activeCount={activeChips.length} chips={activeChips} onClear={onReset} className="w-full md:w-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FilterSelect
          label="Date Range"
          value={value.preset}
          onChange={selectPreset}
          options={dashboardDatePresets.map((preset) => ({ value: preset, label: dashboardDatePresetLabels[preset] }))}
        />
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="heritage-button-secondary h-10 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-60"
        >
          Reset
        </button>
      </div>

      {value.preset === "custom" ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Start Date
            <input
              type="date"
              value={draft.startDate}
              max={maxDate}
              onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
              className="heritage-input mt-1 h-10 w-full rounded-xl px-3 py-2 text-sm font-normal normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            End Date
            <input
              type="date"
              value={draft.endDate}
              max={maxDate}
              onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
              className="heritage-input mt-1 h-10 w-full rounded-xl px-3 py-2 text-sm font-normal normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="button"
            onClick={applyCustomRange}
            disabled={isLoading}
            className="heritage-button-primary h-10 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
          >
            Apply
          </button>
        </div>
      ) : null}

      {error ? <p className="w-full text-xs font-medium text-red-600">{error}</p> : null}
    </FilterCard>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
