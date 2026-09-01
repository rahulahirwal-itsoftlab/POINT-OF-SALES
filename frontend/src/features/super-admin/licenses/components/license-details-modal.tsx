"use client";

import { format } from "date-fns";
import { Key, Building2, CreditCard, RotateCw, History } from "lucide-react";
import { CommonModal } from "@/components/common/modal";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ErrorState } from "@/components/common/error-state";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailSection, DetailField } from "@/components/common/detail-overview-components";
import { useLicenseDetail } from "../hooks/use-licenses";
import { formatCurrency } from "@/lib/formatters/currency";

type Props = {
  licenseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRenew?: () => void;
  onOpenHistory?: () => void;
};

export function LicenseDetailsModal({ licenseId, isOpen, onClose, onOpenRenew, onOpenHistory }: Props) {
  const { data, isLoading, isError, refetch } = useLicenseDetail(licenseId ?? undefined);

  if (!isOpen) return null;

  const item = data?.data;
  const lic = item?.license;
  const rest = item?.restaurant;
  const org = item?.organization;
  const sub = item?.subscription;
  const plan = item?.plan;

  const isExpired = lic ? new Date(lic.expiresAt) < new Date() : false;
  const daysLeft = lic ? Math.ceil((new Date(lic.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const currency = sub?.currency ?? "INR";

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title="License Full Overview"
      description="Medium-sized centered overview panel."
      confirmText="Close"
      onConfirm={onClose}
      size="2xl"
    >
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-5 py-1">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError || !item ? (
          <ErrorState message="Unable to load license details." onRetry={() => refetch()} />
        ) : (
          <>
            {/* Header Banner */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">License Number</span>
                  </div>
                  <h2 className="mt-1 font-mono text-xl font-extrabold text-slate-900 dark:text-white">{lic?.licenseKey}</h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Restaurant: <span className="font-bold text-slate-900 dark:text-white">{rest?.name}</span></p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={lic?.status ?? "INACTIVE"} />
                  <span className={`text-xs font-bold ${isExpired ? "text-red-600" : daysLeft <= 15 ? "text-amber-600" : "text-emerald-600"}`}>
                    {isExpired ? "Expired" : `${daysLeft} days validity remaining`}
                  </span>
                </div>
              </div>
            </div>

            {/* LICENSE DETAILS */}
            <DetailSection title="License Details" icon={<Key className="h-4 w-4" />} columns={2}>
              <DetailField label="License Number" value={lic?.licenseKey} isMono />
              <DetailField label="License Status" statusBadge={lic?.status} />
              <DetailField label="License Type" value={plan?.planType ?? "COMMON"} />
              <DetailField label="Start Date" value={lic?.issuedAt ? format(new Date(lic.issuedAt), "MMM d, yyyy") : "-"} />
              <DetailField label="Expiry Date" value={lic?.expiresAt ? format(new Date(lic.expiresAt), "MMM d, yyyy") : "-"} />
              <DetailField
                label="Remaining Days"
                value={
                  lic ? (
                    <span className={`font-bold ${isExpired ? "text-red-600" : daysLeft <= 15 ? "text-amber-600" : "text-emerald-600"}`}>
                      {isExpired ? "Expired" : `${daysLeft} days left`}
                    </span>
                  ) : "-"
                }
              />
              <DetailField label="Created Date" value={lic?.issuedAt ? format(new Date(lic.issuedAt), "MMM d, yyyy h:mm a") : "-"} />
            </DetailSection>

            {/* RESTAURANT DETAILS */}
            <DetailSection title="Restaurant Details" icon={<Building2 className="h-4 w-4" />} columns={2}>
              <DetailField label="Restaurant Name" value={rest?.name} />
              <DetailField label="Restaurant Email" value={rest?.email} />
              <DetailField label="Restaurant Phone" value={rest?.phone} />
              <DetailField label="Location" value={rest?.publicId} isMono />
            </DetailSection>

            {/* ORGANIZATION DETAILS */}
            <DetailSection title="Organization Details" icon={<Building2 className="h-4 w-4" />} columns={2}>
              <DetailField label="Organization Name" value={org?.name ?? rest?.name} />
              <DetailField label="Organization ID" value={org?.publicId} isMono />
              <DetailField label="Organization Status" statusBadge="ACTIVE" />
            </DetailSection>

            {/* SUBSCRIPTION DETAILS */}
            <DetailSection title="Subscription Details" icon={<CreditCard className="h-4 w-4" />} columns={2}>
              <DetailField label="Plan Name" value={sub?.planNameSnapshot ?? plan?.name} />
              <DetailField label="Plan Type" value={plan?.planType ?? "COMMON"} />
              <DetailField label="Billing Cycle" value={sub?.billingCycle} />
              <DetailField label="Subscription Status" statusBadge={sub?.status} />
              <DetailField label="Start Date" value={sub?.startDate ? format(new Date(sub.startDate), "MMM d, yyyy") : "-"} />
              <DetailField label="End Date" value={sub?.endDate ? format(new Date(sub.endDate), "MMM d, yyyy") : "-"} />
              <DetailField label="Base Amount" value={sub?.baseAmountSnapshot != null ? formatCurrency(Number(sub.baseAmountSnapshot), currency) : formatCurrency(Number(sub?.price ?? 0), currency)} />
              <DetailField label="GST" value={sub?.gstPercentageSnapshot != null ? `${sub.gstPercentageSnapshot}%` : "0%"} />
              <DetailField label="Final Amount" value={sub?.finalAmountSnapshot != null ? formatCurrency(Number(sub.finalAmountSnapshot), currency) : formatCurrency(Number(sub?.price ?? 0), currency)} />
              <DetailField label="Waiter Limit" value={sub?.waiterLimitSnapshot ?? "Unlimited"} />
              <DetailField label="Receptionist Limit" value={sub?.receptionistLimitSnapshot ?? "Unlimited"} />
              <DetailField label="Kitchen Staff Limit" value={sub?.kitchenLimitSnapshot ?? "Unlimited"} />
            </DetailSection>

            {/* Actions Bar */}
            {(onOpenRenew || onOpenHistory) && (
              <div className="flex items-center justify-end gap-3 pt-2">
                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={onOpenHistory}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <History className="h-4 w-4 text-slate-500" />
                    View History
                  </button>
                )}
                {onOpenRenew && (
                  <button
                    type="button"
                    onClick={onOpenRenew}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm"
                  >
                    <RotateCw className="h-4 w-4" />
                    Renew License
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </CommonModal>
  );
}
