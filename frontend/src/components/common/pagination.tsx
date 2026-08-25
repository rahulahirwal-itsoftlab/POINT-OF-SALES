"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
};

export interface CommonPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

function generatePageNumbers(current: number, total: number): (number | "...")[ ] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }

  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function CommonPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = false,
  disabled = false,
  loading = false,
  className,
}: CommonPaginationProps) {
  if (totalPages <= 1 && !showPageSize && !totalItems) {
    return null;
  }

  const safeCurrent = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  const pageNumbers = generatePageNumbers(safeCurrent, Math.max(1, totalPages));

  const startItem = totalItems ? Math.min((safeCurrent - 1) * pageSize + 1, totalItems) : null;
  const endItem = totalItems ? Math.min(safeCurrent * pageSize, totalItems) : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      style={{
        borderColor: "var(--border-soft)",
        background: "var(--surface)",
      }}
    >
      {/* Left: Item Range & Page Size */}
      <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
        {totalItems && startItem && endItem ? (
          <span className="font-semibold">
            Showing <span className="font-bold text-slate-900" style={{ color: "var(--text)" }}>{startItem}–{endItem}</span> of{" "}
            <span className="font-bold text-slate-950" style={{ color: "var(--text)" }}>{totalItems}</span>
          </span>
        ) : (
          <span className="font-semibold">
            Page <span className="font-bold" style={{ color: "var(--text)" }}>{safeCurrent}</span> of{" "}
            <span className="font-bold" style={{ color: "var(--text)" }}>{Math.max(1, totalPages)}</span>
          </span>
        )}

        {showPageSize && onPageSizeChange ? (
          <label className="flex items-center gap-2 font-semibold">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={disabled || loading}
              className="heritage-input h-8 rounded-lg px-2 text-xs font-bold"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {/* Right: Controls & Page Numbers */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrent - 1)}
          disabled={disabled || loading || safeCurrent <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-bold transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
          style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Desktop Page Numbers */}
        <div className="hidden items-center gap-1 md:flex">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-2 text-xs text-slate-400 font-bold">
                  …
                </span>
              );
            }

            const isActive = p === safeCurrent;

            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={disabled || loading}
                className={cn(
                  "h-9 min-w-9 rounded-lg border px-2.5 text-xs font-bold transition",
                  isActive
                    ? "bg-slate-950 text-white shadow-sm border-slate-950"
                    : "hover:bg-slate-100 text-slate-700 border-slate-200"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Mobile Page Display */}
        <span className="text-xs font-bold md:hidden" style={{ color: "var(--text)" }}>
          {safeCurrent} / {Math.max(1, totalPages)}
        </span>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrent + 1)}
          disabled={disabled || loading || safeCurrent >= totalPages}
          className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-bold transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
          style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
