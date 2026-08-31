"use client";

import React from "react";
import { StatusBadge } from "@/components/common/status-badge";

type DetailSectionProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
};

export function DetailSection({ title, icon, children, columns = 2, className = "" }: DetailSectionProps) {
  const gridColsClass = columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2";

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition dark:border-slate-800 dark:bg-slate-900/80 ${className}`}>
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
      </div>
      <div className={`grid gap-4 ${gridColsClass}`}>{children}</div>
    </div>
  );
}

type DetailFieldProps = {
  label: string;
  value?: React.ReactNode;
  isMono?: boolean;
  statusBadge?: string;
  className?: string;
};

export function DetailField({ label, value, isMono = false, statusBadge, className = "" }: DetailFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      {statusBadge ? (
        <div>
          <StatusBadge status={statusBadge} />
        </div>
      ) : (
        <div
          className={`text-sm font-semibold text-slate-900 dark:text-slate-100 break-words leading-relaxed ${
            isMono ? "font-mono font-bold text-xs text-slate-800 dark:text-slate-200" : ""
          }`}
        >
          {value ?? "-"}
        </div>
      )}
    </div>
  );
}
