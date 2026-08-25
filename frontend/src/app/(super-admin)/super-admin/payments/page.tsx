"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { PaymentTable } from "@/features/super-admin/payments/components/payment-table";
import { usePayments } from "@/features/super-admin/payments/hooks/use-payments";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ErrorState } from "@/components/common/error-state";
import { FilterCard, FilterSearchInput, FilterSelect, type ActiveFilterChip } from "@/components/common/filters";

export default function SuperAdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [method, setMethod] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError } = usePayments({
    page,
    limit: 15,
    status: status || undefined,
    method: method || undefined,
    search: search || undefined,
  });
  const chips: ActiveFilterChip[] = [
    search ? { key: "search", label: "Search", value: search, onRemove: () => { setSearch(""); setSearchInput(""); setPage(1); } } : undefined,
    status ? { key: "status", label: "Status", value: status, onRemove: () => { setStatus(""); setPage(1); } } : undefined,
    method ? { key: "method", label: "Method", value: method, onRemove: () => { setMethod(""); setPage(1); } } : undefined,
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Payment Management" 
        description="View and filter platform SaaS subscription payments."
      />

      <FilterCard
        title="Payment Filters"
        activeCount={chips.length}
        chips={chips}
        onClear={() => { setSearch(""); setSearchInput(""); setStatus(""); setMethod(""); setPage(1); }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            className="min-w-0 flex-1"
          >
            <FilterSearchInput value={searchInput} onChange={setSearchInput} placeholder="Search reference or restaurant..." />
          </div>
          <button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            className="heritage-button-primary h-10 rounded-xl px-4 text-sm font-bold"
          >
            Search
          </button>
        </div>

        <FilterSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} label="Status" options={[{ value: "", label: "All statuses" }, { value: "SUCCESS", label: "Success" }, { value: "PENDING", label: "Pending" }, { value: "FAILED", label: "Failed" }, { value: "REFUNDED", label: "Refunded" }]} />
        <FilterSelect value={method} onChange={(value) => { setMethod(value); setPage(1); }} label="Method" options={[{ value: "", label: "All methods" }, { value: "CARD", label: "Card" }, { value: "UPI", label: "UPI" }, { value: "NET_BANKING", label: "Net Banking" }, { value: "CASH", label: "Cash" }]} />
      </FilterCard>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState message="Unable to load payments." />
      ) : (
        <div className="space-y-4">
          <PaymentTable rows={data?.data || []} />
          
          {/* Pagination Controls */}
          {data?.meta && data.meta.total > data.meta.limit && (
            <div className="flex items-center justify-between px-2 text-sm text-slate-500">
              <div>
                Showing {(page - 1) * data.meta.limit + 1} to {Math.min(page * data.meta.limit, data.meta.total)} of {data.meta.total} payments
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded px-3 py-1 font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page * data.meta.limit >= data.meta.total}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded px-3 py-1 font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
