"use client";

import { AlertTriangle, Bell, RefreshCw, ShieldAlert } from "lucide-react";
import { useFranchiseNotifications } from "@/features/franchise-admin/hooks";

export default function FranchiseNotificationsPage() {
  const { data: notifications = [], isLoading, isError, refetch } = useFranchiseNotifications();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Franchise Notifications
          </h1>
          <p className="text-xs text-slate-500">
            Audit alerts, license expiry warnings, and administrative notifications.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-amber-600" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
            <span>Loading notifications...</span>
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="text-lg font-bold">Failed to load notifications</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center">
          <div className="rounded-full bg-slate-50 p-4 text-slate-400">
            <Bell className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">No Notifications</h3>
          <p className="mt-1 text-xs text-slate-500">
            There are no active notifications for your franchise account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isWarning = n.type.includes("EXPIRING") || n.type.includes("EXPIRED");
            return (
              <div
                key={n.id}
                className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isWarning ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {isWarning ? <ShieldAlert className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
