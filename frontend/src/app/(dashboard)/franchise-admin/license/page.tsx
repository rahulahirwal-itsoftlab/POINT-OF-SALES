"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Key,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useFranchiseLicense, useRenewFranchiseLicense } from "@/features/franchise-admin/hooks";
import { extractApiError } from "@/lib/api/client";

export default function FranchiseLicensePage() {
  const { data: license, isLoading, isError, refetch } = useFranchiseLicense();
  const renewMutation = useRenewFranchiseLicense();

  const [durationMonths, setDurationMonths] = useState(12);
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const [renewalSuccess, setRenewalSuccess] = useState<string | null>(null);

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenewalError(null);
    setRenewalSuccess(null);

    try {
      await renewMutation.mutateAsync(durationMonths);
      setRenewalSuccess(`License extended successfully by ${durationMonths} months!`);
    } catch (err) {
      const parsed = extractApiError(err);
      setRenewalError(parsed.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
          <span>Loading license information...</span>
        </div>
      </div>
    );
  }

  if (isError || !license) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-bold">Failed to load license</h3>
        </div>
        <p className="mt-2 text-sm">Unable to retrieve franchise license details.</p>
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

  const isExpired = license.licenseStatus === "EXPIRED" || license.remainingDays <= 0;
  const isExpiringSoon = license.licenseStatus === "EXPIRING_SOON" || (license.remainingDays <= 30 && !isExpired);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Franchise License & Subscription
        </h1>
        <p className="text-xs text-slate-500">
          View your license details, expiry date, maximum Super Admin seats, and extend validity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* License Overview Card */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">{license.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span>Code: {license.code}</span>
                    <span>•</span>
                    <span>Public ID: {license.publicId}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                {isExpired ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                    <ShieldAlert className="h-4 w-4" />
                    EXPIRED
                  </span>
                ) : isExpiringSoon ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    <Clock className="h-4 w-4" />
                    EXPIRING SOON
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <ShieldCheck className="h-4 w-4" />
                    ACTIVE
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* License Key */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Key className="h-4 w-4 text-amber-600" />
                  <span>License Key</span>
                </div>
                <div className="mt-2 font-mono text-sm font-bold text-slate-800 select-all">
                  {license.licenseKey}
                </div>
              </div>

              {/* Expiry Date */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <span>Expires On</span>
                </div>
                <div className="mt-2 text-sm font-bold text-slate-800">
                  {new Date(license.licenseExpiresAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>

              {/* Remaining Days */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Days Remaining</span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {license.remainingDays} days
                </div>
              </div>

              {/* Super Admin Limit */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Users className="h-4 w-4 text-amber-600" />
                  <span>Max Super Admins</span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  {license.maxSuperAdmins} Seats
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* License Renewal Panel */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs h-fit">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Renew License</h3>
              <p className="text-xs text-slate-500">Extend franchise validity</p>
            </div>
          </div>

          <form onSubmit={handleRenew} className="mt-6 space-y-4">
            {renewalError ? (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                {renewalError}
              </div>
            ) : null}

            {renewalSuccess ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{renewalSuccess}</span>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-bold text-slate-700">Renewal Duration</label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-amber-500 focus:bg-white"
              >
                <option value={1}>1 Month Extension</option>
                <option value={3}>3 Months Extension</option>
                <option value={6}>6 Months Extension</option>
                <option value={12}>12 Months (1 Year Extension)</option>
                <option value={24}>24 Months (2 Years Extension)</option>
              </select>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-xs text-amber-900 space-y-1">
              <div className="font-bold">Renewal Guarantee</div>
              <p className="text-[11px] text-amber-700">
                Extending license adds duration to your current expiry date without losing remaining days.
              </p>
            </div>

            <button
              type="submit"
              disabled={renewMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-50"
            >
              {renewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm License Renewal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
