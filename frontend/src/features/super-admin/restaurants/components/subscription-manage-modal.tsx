"use client";

import { useEffect, useState } from "react";
import { CommonModal } from "@/components/common/modal";
import { useConfirmation } from "@/components/common/modal";
import { updateSubscription } from "../api/restaurant-api";
import { superAdminApi } from "@/lib/api/super-admin.api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import toast from "react-hot-toast";
import { extractApiError } from "@/lib/api/client";
import type { RestaurantSummary } from "../types/restaurant.types";
import { StatusBadge } from "@/components/common/status-badge";
import { formatCurrency } from "@/lib/formatters/currency";
import { Info, HelpCircle } from "lucide-react";

type PlanOption = {
  id: string;
  name: string;
  code: string;
  monthlyPrice: string | number;
  yearlyPrice: string | number;
};

export type SubscriptionManageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  restaurant: RestaurantSummary | null;
  subscriptionId?: string;
  currentPlanId?: string;
  currentPrice?: string;
  currentBillingCycle?: string;
  currentStartDate?: string;
  currentEndDate?: string;
  currentStatus?: string;
};

const DURATION_OPTIONS = [
  { label: "1 Month", months: 1 },
  { label: "2 Months", months: 2 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "9 Months", months: 9 },
  { label: "12 Months (1 Year)", months: 12 },
  { label: "24 Months (2 Years)", months: 24 },
  { label: "Custom", months: 0 },
];

function addMonthsToDate(startDateStr: string, months: number): string {
  if (!startDateStr) return "";
  const date = new Date(startDateStr);
  if (isNaN(date.getTime())) return "";
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() !== day) {
    date.setDate(0);
  }
  return date.toISOString().slice(0, 10);
}

export function SubscriptionManageModal({
  isOpen,
  onClose,
  restaurant,
  subscriptionId,
  currentPlanId = "",
  currentPrice = "",
  currentBillingCycle = "MONTHLY",
  currentStartDate = "",
  currentEndDate = "",
  currentStatus = "ACTIVE",
}: SubscriptionManageModalProps) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();

  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [planId, setPlanId] = useState(currentPlanId);
  const [billingCycle, setBillingCycle] = useState(currentBillingCycle || "MONTHLY");
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [reason, setReason] = useState("");

  // Fetch available subscription plans
  useEffect(() => {
    if (isOpen) {
      setLoadingPlans(true);
      superAdminApi.listPlans()
        .then((res: { data?: PlanOption[] } | PlanOption[]) => {
          const loadedPlans = Array.isArray(res) ? res : res?.data || [];
          setPlans(loadedPlans);
        })
        .catch(() => toast.error("Failed to load global plans."))
        .finally(() => setLoadingPlans(false));
    }
  }, [isOpen]);

  // Sync form state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialStartDate = currentStartDate ? currentStartDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const initialEndDate = currentEndDate ? currentEndDate.slice(0, 10) : addMonthsToDate(initialStartDate, 1);
      
      setPlanId(currentPlanId);
      setBillingCycle(currentBillingCycle || "MONTHLY");
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      setStatus(currentStatus || "ACTIVE");
      setCustomPrice(currentPrice || "");
      setReason("");

      // Calculate initial duration if dates are available
      if (initialStartDate && initialEndDate) {
        const start = new Date(initialStartDate);
        const end = new Date(initialEndDate);
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (diffMonths > 0 && DURATION_OPTIONS.some(opt => opt.months === diffMonths)) {
          setDurationMonths(diffMonths);
          setIsCustomDuration(false);
        } else {
          setDurationMonths(diffMonths > 0 ? diffMonths : 1);
          setIsCustomDuration(true);
        }
      } else {
        setDurationMonths(1);
        setIsCustomDuration(false);
      }

      setIsCustomPrice(Boolean(currentPrice));
    }
  }, [isOpen, currentPlanId, currentPrice, currentBillingCycle, currentStartDate, currentEndDate, currentStatus]);

  // Derived selected plan and prices
  const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
  const standardPrice = selectedPlan
    ? Number(billingCycle === "YEARLY" ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice)
    : 0;

  const finalPrice = isCustomPrice ? Number(customPrice || 0) : standardPrice;

  // Handle duration or start date change -> auto recalculate end date
  const handleDurationChange = (months: number) => {
    if (months === 0) {
      setIsCustomDuration(true);
    } else {
      setIsCustomDuration(false);
      setDurationMonths(months);
      if (startDate) {
        setEndDate(addMonthsToDate(startDate, months));
      }
    }
  };

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    if (!isCustomDuration && durationMonths > 0 && newStartDate) {
      setEndDate(addMonthsToDate(newStartDate, durationMonths));
    }
  };

  async function handleSave() {
    if (!subscriptionId) {
      toast.error("Subscription record not found.");
      return;
    }

    if (isNaN(finalPrice) || finalPrice < 0) {
      toast.error("Final subscription price must be a valid non-negative number.");
      return;
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      toast.error("End date must be strictly after the start date.");
      return;
    }

    // Trigger Change Summary Confirmation Modal
    const confirmed = await confirm({
      title: "Save Subscription Changes?",
      description: `Confirm subscription update for ${restaurant?.name || "this restaurant"}. Changes take effect immediately.`,
      variant: "confirm",
      confirmText: "Save Changes",
      cancelText: "Review Form",
      children: (
        <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
          <div className="flex justify-between border-b border-slate-200 pb-2 font-medium text-slate-900">
            <span>Restaurant:</span>
            <span className="font-semibold">{restaurant?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Subscription Plan:</span>
            <span className="font-semibold text-indigo-700">{selectedPlan?.name || "Selected Plan"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Billing Cycle & Duration:</span>
            <span>{billingCycle} ({isCustomDuration ? "Custom Duration" : `${durationMonths} Months`})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pricing Mode:</span>
            <span className={isCustomPrice ? "font-semibold text-amber-700" : "text-slate-700"}>
              {isCustomPrice ? "Custom Override" : "Standard Plan Rate"}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
            <span>Final Assigned Price:</span>
            <span className="text-emerald-700">{formatCurrency(finalPrice, restaurant?.currency || "INR")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Validity Period:</span>
            <span>{startDate} → {endDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Target Status:</span>
            <StatusBadge status={status} />
          </div>
          {reason && (
            <div className="border-t border-slate-200 pt-2 text-slate-600 italic">
              <span className="font-medium not-italic text-slate-800">Reason: </span>
              {reason}
            </div>
          )}
        </div>
      ),
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      await updateSubscription(subscriptionId, {
        planId: selectedPlan?.id || planId || undefined,
        price: finalPrice,
        billingCycle,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        durationMonths: !isCustomDuration ? durationMonths : undefined,
        status,
        reason: reason.trim() || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions });
      await queryClient.invalidateQueries({ queryKey: queryKeys.licenses });
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      if (restaurant?.id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.restaurant(restaurant.id) });
      }

      toast.success(`Subscription updated successfully for ${restaurant?.name || "restaurant"}.`);
      onClose();
    } catch (err) {
      toast.error(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-400";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-700";

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Subscription — ${restaurant?.name || "Restaurant"}`}
      description="Independently configure plan, duration, custom pricing override, validity period, and status for this restaurant."
      variant="form"
      size="xl"
      confirmText="Save Subscription"
      onConfirm={handleSave}
      isConfirming={submitting}
    >
      <div className="space-y-5 text-sm">
        {/* Header Status Strip */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Restaurant Tenant</div>
            <div className="mt-0.5 font-bold text-slate-900">{restaurant?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Section 1: Plan & Billing Cycle */}
        <div className="grid gap-4 sm:grid-cols-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className={labelClass}>
            Subscription Plan *
            <select
              className={inputClass}
              value={planId}
              disabled={loadingPlans}
              onChange={(e) => setPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Billing Cycle *
            <select
              className={inputClass}
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </label>
        </div>

        {/* Section 2: Custom Pricing Override */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={labelClass}>Individual Pricing Override</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-normal text-slate-500">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                Isolated per restaurant
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCustomPrice}
                onChange={(e) => {
                  setIsCustomPrice(e.target.checked);
                  if (e.target.checked && !customPrice) {
                    setCustomPrice(standardPrice.toString());
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-800">Use Custom Price</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div>
              <div className="text-xs font-medium text-slate-500">Global Standard Rate</div>
              <div className="mt-1 font-semibold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                {formatCurrency(standardPrice, restaurant?.currency || "INR")} / {billingCycle.toLowerCase()}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Standard rate from global plan configuration.</p>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">Custom Price Override ({restaurant?.currency || "INR"})</div>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={!isCustomPrice}
                className={inputClass}
                value={isCustomPrice ? customPrice : standardPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0.00"
              />
              <p className="mt-1 text-[11px] text-amber-700 font-medium">
                {isCustomPrice ? "Custom rate active for this restaurant." : "Check toggle to override global rate."}
              </p>
            </div>
          </div>

          {/* Notice Box */}
          <div className="mt-2 rounded-lg bg-amber-50/80 p-3 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Price Isolation Guarantee:</strong> Custom price overrides apply ONLY to {restaurant?.name || "this restaurant"}. It will never alter the global plan rate or affect any other restaurants on this plan.
            </div>
          </div>
        </div>

        {/* Section 3: Duration & Validity Dates */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              Subscription Duration *
              <select
                className={inputClass}
                value={isCustomDuration ? 0 : durationMonths}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.months}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Start Date *
              <input
                type="date"
                required
                className={inputClass}
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </label>

            <label className={labelClass}>
              Calculated End / Expiry Date *
              <input
                type="date"
                required
                className={inputClass}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setIsCustomDuration(true);
                }}
              />
            </label>
          </div>
        </div>

        {/* Section 4: Status & Audit Reason */}
        <div className="grid gap-4 sm:grid-cols-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className={labelClass}>
            Subscription Status *
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>

          <label className={labelClass}>
            Reason / Administrative Note
            <input
              type="text"
              className={inputClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Promotional discount, custom contract..."
            />
          </label>
        </div>
      </div>
    </CommonModal>
  );
}
