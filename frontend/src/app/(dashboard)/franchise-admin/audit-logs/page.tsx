"use client";

import { AlertTriangle, ClipboardList, RefreshCw, Shield } from "lucide-react";
import { useFranchiseAuditLogs } from "@/features/franchise-admin/hooks";

export default function FranchiseAuditLogsPage() {
  const { data: auditLogs = [], isLoading, isError, refetch } = useFranchiseAuditLogs();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Franchise Audit Logs
          </h1>
          <p className="text-xs text-slate-500">
            Record of administrative actions, Super Admin creations/updates, and license events.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-amber-600" : ""}`} />
          Refresh Logs
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
            <span>Loading audit logs...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-lg font-bold">Failed to load audit logs</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center">
          <div className="rounded-full bg-slate-50 p-4 text-slate-400">
            <ClipboardList className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">No Audit Logs</h3>
          <p className="mt-1 text-xs text-slate-500">
            No administrative audit actions recorded yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/50 uppercase tracking-wider font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Entity</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                        <Shield className="h-3.5 w-3.5 text-amber-600" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {log.entityType} {log.entityId ? `(${log.entityId.slice(0, 8)}...)` : ""}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {log.ipAddress || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
