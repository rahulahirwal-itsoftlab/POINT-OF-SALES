"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { AuditTable } from "@/features/super-admin/audit-logs/components/audit-table";
import { useAuditLogFilters, useAuditLogs } from "@/features/super-admin/audit-logs/hooks/use-audit-logs";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ErrorState } from "@/components/common/error-state";
import { FilterCard, FilterSearchInput, FilterSelect, type ActiveFilterChip } from "@/components/common/filters";

export default function SuperAdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const { data, isLoading, isError } = useAuditLogs({
    page,
    limit: 15,
    search: search || undefined,
    action: action || undefined,
    module: module || undefined,
  });
  const filters = useAuditLogFilters();
  const chips: ActiveFilterChip[] = [
    search ? { key: "search", label: "Search", value: search, onRemove: () => { setSearch(""); setPage(1); } } : undefined,
    action ? { key: "action", label: "Action", value: action, onRemove: () => { setAction(""); setPage(1); } } : undefined,
    module ? { key: "module", label: "Module", value: module, onRemove: () => { setModule(""); setPage(1); } } : undefined,
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip));

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Track all critical actions across the platform." />
      <FilterCard
        title="Audit Filters"
        activeCount={chips.length}
        chips={chips}
        onClear={() => { setSearch(""); setAction(""); setModule(""); setPage(1); }}
      >
        <FilterSearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search action, request ID, description..." />
        <FilterSelect
          value={action}
          onChange={(value) => { setAction(value); setPage(1); }}
          label="Action"
          options={[{ value: "", label: "All actions" }, ...(filters.data?.data.actions ?? []).map((filterAction) => ({ value: filterAction, label: filterAction }))]}
        />
        <FilterSelect
          value={module}
          onChange={(value) => { setModule(value); setPage(1); }}
          label="Module"
          options={[{ value: "", label: "All modules" }, ...(filters.data?.data.modules ?? []).map((filterModule) => ({ value: filterModule, label: filterModule }))]}
        />
      </FilterCard>
      {isLoading ? <LoadingSkeleton /> : isError ? <ErrorState message="Unable to load audit logs." /> : <AuditTable rows={data?.data ?? []} />}
      {data?.meta && data.meta.total > data.meta.limit ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Page {data.meta.page} of {Math.ceil(data.meta.total / data.meta.limit)}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-50">Previous</button>
            <button disabled={page * data.meta.limit >= data.meta.total} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
