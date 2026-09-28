"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useFranchiseDashboard } from "@/features/franchise-admin/hooks";

export default function FranchiseStewardDashboardPage() {
  const { data, isLoading, isError, refetch } = useFranchiseDashboard();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading franchise metrics...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-bold">Failed to load dashboard</h3>
        </div>
        <p className="mt-2 text-sm">Unable to retrieve franchise status from server.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const { franchise, metrics } = data;
  const isExpired = franchise.licenseStatus === "EXPIRED" || franchise.remainingDays <= 0;
  const isExpiringSoon = franchise.licenseStatus === "EXPIRING_SOON" || (franchise.remainingDays <= 30 && !isExpired);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-700 via-yellow-700 to-amber-900 p-8 text-amber-50 shadow-xl">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200 backdrop-blur-md">
              <Building2 className="h-3.5 w-3.5" />
              {franchise.code} • Franchise Steward Portal
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {franchise.name}
            </h1>
            <p className="mt-2 max-w-xl text-amber-100/80 text-sm">
              Manage franchise-level Super Admins and monitor license status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/franchise-steward/super-admins"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-bold text-amber-950 shadow-lg transition hover:bg-amber-300"
            >
              <Plus className="h-4 w-4" />
              Add Super Admin
            </Link>
            <Link
              href="/franchise-steward/license"
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-900/40 px-5 py-3 text-sm font-bold text-amber-100 backdrop-blur-md transition hover:bg-amber-900/60"
            >
              <RefreshCw className="h-4 w-4" />
              Manage License
            </Link>
          </div>
        </div>
      </div>

      {/* License Alert Notification if expiring/expired */}
      {isExpired ? (
        <div className="flex items-center gap-4 rounded-2xl border border-red-300 bg-red-500/10 p-5 text-red-900 shadow-sm">
          <ShieldAlert className="h-7 w-7 text-red-600 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-red-800">Franchise License Has Expired</h4>
            <p className="text-xs text-red-700">
              Super Admin creation is currently restricted. Please renew your license to unlock full franchise administrative functions.
            </p>
          </div>
          <Link
            href="/franchise-steward/license"
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
          >
            Renew Now
          </Link>
        </div>
      ) : isExpiringSoon ? (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-300 bg-amber-500/10 p-5 text-amber-900 shadow-sm">
          <Clock className="h-7 w-7 text-amber-600 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-800">License Expiring Soon</h4>
            <p className="text-xs text-amber-700">
              Your franchise license expires in <span className="font-bold">{franchise.remainingDays} days</span>. Renew early to prevent service disruption.
            </p>
          </div>
          <Link
            href="/franchise-steward/license"
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
          >
            Renew License
          </Link>
        </div>
      ) : null}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Super Admins */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Super Admins
            </span>
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {metrics.totalSuperAdmins}
            </span>
            <span className="text-xs text-slate-500">
              / max {franchise.maxSuperAdmins}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <UserCheck className="h-3.5 w-3.5" />
              {metrics.activeSuperAdmins} Active
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <UserX className="h-3.5 w-3.5" />
              {metrics.inactiveSuperAdmins} Inactive
            </span>
          </div>
        </div>

        {/* License Status */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              License Status
            </span>
            <div className={`rounded-2xl p-3 ${isExpired ? "bg-red-50 text-red-600" : isExpiringSoon ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-2xl font-black uppercase tracking-tight ${isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-emerald-600"}`}>
              {franchise.licenseStatus}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>Key: {franchise.licenseKey.slice(0, 12)}...</span>
          </div>
        </div>

        {/* Days Remaining */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Remaining Days
            </span>
            <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {franchise.remainingDays}
            </span>
            <span className="text-xs text-slate-500">days left</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>Expires: {new Date(franchise.licenseExpiresAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Seat Usage */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Seat Usage
            </span>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {metrics.totalSuperAdmins}
            </span>
            <span className="text-xs text-slate-500">/ {franchise.maxSuperAdmins} seats</span>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, (metrics.totalSuperAdmins / franchise.maxSuperAdmins) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Super Admin Management Overview */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Super Admin Management</h3>
              <p className="text-xs text-slate-500">Create, edit, or deactivate Super Admin accounts for your franchise.</p>
            </div>
            <Link
              href="/franchise-steward/super-admins"
              className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
            >
              View All →
            </Link>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/franchise-steward/super-admins"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-amber-200 hover:bg-amber-50/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:bg-amber-200">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Dynamic Super Admin Creation</h4>
                  <p className="text-xs text-slate-500">Add new high-level administrators for franchise operations</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-700">Manage</span>
            </Link>
          </div>
        </div>

        {/* License & Franchise Info */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Subscription & Licensing</h3>
              <p className="text-xs text-slate-500">Franchise-level plan limits, expiry dates, and renewals.</p>
            </div>
            <Link
              href="/franchise-steward/license"
              className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
            >
              License Details →
            </Link>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Super Admin Seat Usage</span>
                <span className="font-bold text-slate-900">{metrics.totalSuperAdmins} / {franchise.maxSuperAdmins} Seats</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-amber-600 transition-all"
                  style={{ width: `${Math.min(100, (metrics.totalSuperAdmins / franchise.maxSuperAdmins) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
