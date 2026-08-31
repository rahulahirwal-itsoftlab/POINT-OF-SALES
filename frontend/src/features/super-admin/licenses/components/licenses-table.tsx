"use client";

import { useEffect, useState } from "react";
import { addDays, addMonths, format } from "date-fns";
import toast from "react-hot-toast";
import Link from "next/link";
import { Clock, Eye, RotateCw, ShieldCheck, ShieldOff } from "lucide-react";
import { ActionDropdown } from "@/components/common/action-dropdown";
import { useConfirmation } from "@/components/common/modal";
import { CommonModal } from "@/components/common/modal";
import { FilterCard, FilterSearchInput, FilterSelect } from "@/components/common/filters";
import { StatusBadge } from "@/components/common/status-badge";
import { CommonPagination } from "@/components/common/pagination";
import { formatCurrency } from "@/lib/formatters/currency";
import { usePlans } from "@/features/super-admin/plans/hooks/use-plans";
import {
  activateLicense,
  getLicenseHistory,
  listLicenses,
  renewLicense,
  revokeLicense,
  suspendLicense,
  type LicenseHistoryResponse,
  type LicenseListItem,
  type RenewLicenseInput,
} from "../api/license-api";

import { LicenseDetailsModal } from "./license-details-modal";

function money(value?: string | number | null, currency = "INR") {
  return formatCurrency(Number(value ?? 0), currency);
}

function planKind(item: LicenseListItem) {
  return item.plan.planType === "CUSTOMIZED" || item.plan.planNumber?.startsWith("CUSTOM-") ? "Customized" : "Common";
}

type RenewalPlan = {
  id: string;
  planNumber?: string | null;
  code?: string;
  name: string;
  description?: string | null;
  planType?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  durationMonths?: number | null;
  gstPercentage?: string | null;
  waiterLimit?: number | null;
  kitchenLimit?: number | null;
  receptionistLimit?: number | null;
  maxUsers?: number | null;
  isActive?: boolean;
};

type RenewalType = "PREDEFINED" | "CUSTOMIZED";

function renewalStartFor(item: LicenseListItem) {
  const now = new Date();
  const subscriptionEnd = new Date(item.subscription.endDate);
  const licenseEnd = new Date(item.license.expiresAt);
  const currentEnd = subscriptionEnd > licenseEnd ? subscriptionEnd : licenseEnd;
  return currentEnd > now ? addDays(currentEnd, 1) : now;
}

function roleLimits(plan: RenewalPlan) {
  const waiter = plan.waiterLimit ?? Math.max((plan.maxUsers ?? 0) - 2, 1);
  const kitchen = plan.kitchenLimit ?? 1;
  const receptionist = plan.receptionistLimit ?? 1;
  return { waiter, kitchen, receptionist };
}

function billingSummary(base: number, gstPercentage: number) {
  const gstAmount = (base * gstPercentage) / 100;
  return { base, gstPercentage, gstAmount, finalAmount: base + gstAmount };
}

export function LicensesTable() {
  const { confirm } = useConfirmation();
  const plansQuery = usePlans();
  const [licenses, setLicenses] = useState<LicenseListItem[]>([]);
  const [selected, setSelected] = useState<LicenseListItem | null>(null);
  const [selectedDetailLicenseId, setSelectedDetailLicenseId] = useState<string | null>(null);
  const [renewing, setRenewing] = useState<LicenseListItem | null>(null);
  const [historyFor, setHistoryFor] = useState<LicenseListItem | null>(null);
  const [history, setHistory] = useState<LicenseHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const plans = ((plansQuery.data?.data ?? []) as RenewalPlan[]).filter((plan) => plan.isActive !== false && plan.planType !== "CUSTOMIZED");

  const fetchLicenses = (currentPage: number, currentLimit: number, status: string, subStatus: string, term: string) => {
    setLoading(true);
    const params: Record<string, string | number> = { page: currentPage, limit: currentLimit };
    if (status !== "all") params.status = status;
    if (subStatus !== "all") params.subscriptionStatus = subStatus;
    if (term.trim()) params.search = term.trim();

    listLicenses(params)
      .then((res) => {
        setLicenses(res.data);
        setTotal(res.meta.total);
        setTotalPages(Math.ceil(res.meta.total / res.meta.limit) || 1);
      })
      .catch(() => toast.error("Unable to load licenses."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLicenses(page, limit, statusFilter, subscriptionStatus, search);
  }, [page, limit, statusFilter, subscriptionStatus, search]);

  const handleAction = async (id: string, action: "activate" | "suspend" | "revoke") => {
    const isDestructive = action === "revoke" || action === "suspend";
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} License`,
      description: `Are you sure you want to ${action} this license?`,
      variant: isDestructive ? "danger" : "info",
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
    });

    if (!confirmed) return;

    try {
      if (action === "activate") await activateLicense(id);
      if (action === "suspend") await suspendLicense(id);
      if (action === "revoke") await revokeLicense(id);

      toast.success(`License ${action}d successfully`);
      fetchLicenses(page, limit, statusFilter, subscriptionStatus, search);
    } catch {
      toast.error(`Failed to ${action} license`);
    }
  };

  const openHistory = async (item: LicenseListItem) => {
    setHistoryFor(item);
    setHistory(null);
    setHistoryLoading(true);
    try {
      const res = await getLicenseHistory(item.license.id);
      setHistory(res.data);
    } catch {
      toast.error("Unable to load subscription history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <FilterCard
        title="License Filters"
        activeCount={[statusFilter !== "all", subscriptionStatus !== "all", Boolean(search.trim())].filter(Boolean).length}
        chips={[
          statusFilter !== "all" ? { key: "status", label: "License", value: statusFilter, onRemove: () => { setStatusFilter("all"); setPage(1); } } : undefined,
          subscriptionStatus !== "all" ? { key: "subscriptionStatus", label: "Subscription", value: subscriptionStatus, onRemove: () => { setSubscriptionStatus("all"); setPage(1); } } : undefined,
          search.trim() ? { key: "search", label: "Search", value: search, onRemove: () => { setSearch(""); setPage(1); } } : undefined,
        ].filter((chip): chip is { key: string; label: string; value: string; onRemove: () => void } => Boolean(chip))}
        onClear={() => { setStatusFilter("all"); setSubscriptionStatus("all"); setSearch(""); setPage(1); }}
      >
        <FilterSearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search restaurant, email, license, plan..." />
        <FilterSelect
          value={statusFilter}
          onChange={(status) => { setStatusFilter(status); setPage(1); }}
          label="License Status"
          options={[
            { value: "all", label: "All licenses" },
            { value: "ACTIVE", label: "Active" },
            { value: "EXPIRED", label: "Expired" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "REVOKED", label: "Revoked" },
          ]}
        />
        <FilterSelect
          value={subscriptionStatus}
          onChange={(status) => { setSubscriptionStatus(status); setPage(1); }}
          label="Subscription Status"
          options={[
            { value: "all", label: "All subscriptions" },
            { value: "ACTIVE", label: "Active" },
            { value: "EXPIRED", label: "Expired" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "PENDING", label: "Pending" },
          ]}
        />
        <Link href="/super-admin/licenses/expiry" className="heritage-button-secondary inline-flex h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold">
          Manage Expirations
        </Link>
      </FilterCard>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-5 py-3">License Number</th>
                <th className="px-5 py-3">Restaurant</th>
                <th className="px-5 py-3">Plan Name</th>
                <th className="px-5 py-3">License Status</th>
                <th className="px-5 py-3">Expiry Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading licenses...</td></tr>
              ) : licenses.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No licenses found.</td></tr>
              ) : (
                licenses.map((item) => {
                  const sub = item.subscription;
                  const isExpired = new Date(item.license.expiresAt) < new Date();
                  const daysLeft = Math.ceil((new Date(item.license.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={item.license.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailLicenseId(item.license.id)}
                          className="font-mono font-bold text-slate-900 hover:text-blue-600 transition"
                        >
                          {item.license.licenseKey}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{item.restaurant.name}</div>
                        <div className="text-xs text-slate-500">{item.restaurant.email ?? item.restaurant.publicId}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{sub.planNameSnapshot ?? item.plan.name}</div>
                        <div className="text-xs text-slate-500">{planKind(item)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.license.status} />
                        {item.license.status === "ACTIVE" && !isExpired && daysLeft <= 15 ? (
                          <div className="mt-1 text-[10px] font-bold text-amber-600">Expires in {daysLeft} days</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700 text-xs">
                        {format(new Date(item.license.expiresAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ActionDropdown
                          items={[
                            { label: "View Details", icon: <Eye className="h-4 w-4" />, onClick: () => setSelectedDetailLicenseId(item.license.id) },
                            { label: "Renew Subscription", icon: <RotateCw className="h-4 w-4" />, onClick: () => setRenewing(item) },
                            { label: "View History", icon: <Clock className="h-4 w-4" />, onClick: () => openHistory(item) },
                            { label: "View Subscription", icon: <RotateCw className="h-4 w-4" />, onClick: () => window.location.assign(`/super-admin/subscriptions/${sub.id}`) },
                            { divider: true, label: "" },
                            item.license.status !== "ACTIVE" && item.license.status !== "EXPIRED"
                              ? { label: "Activate", icon: <ShieldCheck className="h-4 w-4" />, onClick: () => handleAction(item.license.id, "activate") }
                              : { label: "Deactivate", icon: <ShieldOff className="h-4 w-4" />, variant: "warning", onClick: () => handleAction(item.license.id, "suspend") },
                            item.license.status !== "REVOKED"
                              ? { label: "Revoke", icon: <ShieldOff className="h-4 w-4" />, variant: "destructive", onClick: () => handleAction(item.license.id, "revoke") }
                              : { label: "Revoked", disabled: true },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CommonPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
        showPageSize
        loading={loading}
      />

      {/* License Overview Modal */}
      <LicenseDetailsModal
        licenseId={selectedDetailLicenseId}
        isOpen={Boolean(selectedDetailLicenseId)}
        onClose={() => setSelectedDetailLicenseId(null)}
        onOpenRenew={() => {
          const item = licenses.find((l) => l.license.id === selectedDetailLicenseId);
          setSelectedDetailLicenseId(null);
          if (item) setRenewing(item);
        }}
        onOpenHistory={() => {
          const item = licenses.find((l) => l.license.id === selectedDetailLicenseId);
          setSelectedDetailLicenseId(null);
          if (item) void openHistory(item);
        }}
      />

      {selected ? (
        <CommonModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="License Details" description="Restaurant subscription and license lifecycle context." showFooter={false} size="xl">
          <LicenseDetails item={selected} />
        </CommonModal>
      ) : null}

      {renewing ? (
        <RenewSubscriptionModal
          item={renewing}
          plans={plans}
          onClose={() => setRenewing(null)}
          onRenewed={() => {
            setRenewing(null);
            fetchLicenses(page, limit, statusFilter, subscriptionStatus, search);
          }}
        />
      ) : null}

      {historyFor ? (
        <CommonModal isOpen={Boolean(historyFor)} onClose={() => setHistoryFor(null)} title="Subscription History" description={historyFor.restaurant.name} showFooter={false} size="full">
          <HistoryDetails history={history} loading={historyLoading} />
        </CommonModal>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-[var(--text)]">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-[var(--muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function inputClass() {
  return "w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-strong)] disabled:opacity-50";
}

function RenewSubscriptionModal({ item, plans, onClose, onRenewed }: { item: LicenseListItem; plans: RenewalPlan[]; onClose: () => void; onRenewed: () => void }) {
  const [renewalType, setRenewalType] = useState<RenewalType>("PREDEFINED");
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [durationMonths, setDurationMonths] = useState<number>(item.subscription.durationMonthsSnapshot ?? 1);
  const [customName, setCustomName] = useState(`${item.restaurant.name} Renewal Plan`);
  const [customBase, setCustomBase] = useState(Number(item.subscription.baseAmountSnapshot ?? item.subscription.price ?? 0));
  const [customGst, setCustomGst] = useState(Number(item.subscription.gstPercentageSnapshot ?? 18));
  const [customWaiter, setCustomWaiter] = useState(Number(item.subscription.waiterLimitSnapshot ?? 1));
  const [customKitchen, setCustomKitchen] = useState(Number(item.subscription.kitchenLimitSnapshot ?? 1));
  const [customReception, setCustomReception] = useState(Number(item.subscription.receptionistLimitSnapshot ?? 1));
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];
  const startDate = renewalStartFor(item);
  const effectiveDuration = renewalType === "PREDEFINED" ? Number(selectedPlan?.durationMonths ?? durationMonths) : durationMonths;
  const expiryDate = addMonths(startDate, effectiveDuration);
  const baseAmount = renewalType === "PREDEFINED"
    ? Number(billingCycle === "YEARLY" ? selectedPlan?.yearlyPrice ?? 0 : selectedPlan?.monthlyPrice ?? 0)
    : customBase;
  const gstPercentage = renewalType === "PREDEFINED" ? Number(selectedPlan?.gstPercentage ?? 18) : customGst;
  const billing = billingSummary(baseAmount, gstPercentage);
  const limits = renewalType === "PREDEFINED" && selectedPlan
    ? roleLimits(selectedPlan)
    : { waiter: customWaiter, kitchen: customKitchen, receptionist: customReception };

  const handleConfirm = async () => {
    if (renewalType === "PREDEFINED" && !selectedPlan) {
      toast.error("Select an active common plan.");
      return;
    }
    if (renewalType === "CUSTOMIZED" && !customName.trim()) {
      toast.error("Enter a custom plan name.");
      return;
    }

    const payload: RenewLicenseInput = {
      renewalType,
      billingCycle,
      durationMonths: effectiveDuration,
      startDate: startDate.toISOString(),
      ...(renewalType === "PREDEFINED"
        ? { planId: selectedPlan!.id }
        : {
            customPlan: {
              name: customName.trim(),
              waiterLimit: customWaiter,
              kitchenLimit: customKitchen,
              receptionistLimit: customReception,
              basePrice: customBase,
              gstPercentage: customGst,
              features: [],
            },
          }),
    };

    setSubmitting(true);
    try {
      await renewLicense(item.license.id, payload);
      toast.success("Subscription renewed successfully.");
      onRenewed();
    } catch {
      toast.error("Unable to renew subscription.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CommonModal
      isOpen
      onClose={onClose}
      title="Renew Subscription"
      description={`${item.restaurant.name} - ${item.license.licenseKey}`}
      size="full"
      variant="confirm"
      confirmText="Confirm Renewal"
      onConfirm={handleConfirm}
      isConfirming={submitting}
      confirmDisabled={submitting || (renewalType === "PREDEFINED" && !selectedPlan)}
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--background-subtle)] p-4">
          <dl className="grid gap-4 md:grid-cols-4">
            <Detail label="Current Plan" value={item.subscription.planNameSnapshot ?? item.plan.name} />
            <Detail label="Subscription Status" value={<StatusBadge status={item.subscription.status} />} />
            <Detail label="Current Expiry" value={format(new Date(item.license.expiresAt), "MMM d, yyyy")} />
            <Detail label="Renewal Starts" value={format(startDate, "MMM d, yyyy")} />
          </dl>
        </section>

        <div className="flex flex-wrap gap-2">
          {(["PREDEFINED", "CUSTOMIZED"] as RenewalType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRenewalType(type)}
              className={`rounded-lg border px-4 py-2 text-sm font-bold transition-none ${
                renewalType === type
                  ? "border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface))] text-[var(--text)] shadow-xs"
                  : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              {type === "PREDEFINED" ? "Predefined Plan" : "Customized Plan"}
            </button>
          ))}
        </div>

        {renewalType === "PREDEFINED" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {plans.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-soft)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">No active common plans are available.</div>
            ) : (
              plans.map((plan) => {
                const planBilling = billingSummary(Number(billingCycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice), Number(plan.gstPercentage ?? 18));
                const planLimits = roleLimits(plan);
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setDurationMonths(Number(plan.durationMonths ?? 1));
                    }}
                    className={`rounded-xl border p-4 text-left transition-none ${
                      isSelected
                        ? "border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface))] shadow-xs text-[var(--text)]"
                        : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text)]"
                    }`}
                  >
                    <div className="font-mono text-xs font-bold text-[var(--accent-strong)]">{plan.planNumber ?? plan.code}</div>
                    <div className="mt-1 font-bold text-[var(--text)]">{plan.name}</div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
                      <span>Waiter <b className="text-[var(--text)]">{planLimits.waiter}</b></span>
                      <span>Kitchen <b className="text-[var(--text)]">{planLimits.kitchen}</b></span>
                      <span>Reception <b className="text-[var(--text)]">{planLimits.receptionist}</b></span>
                    </div>
                    <div className="mt-3 text-xs text-[var(--muted)]">
                      {Number(plan.durationMonths ?? 1)} month - Base {money(planBilling.base)} - GST {planBilling.gstPercentage}% - Final <b className="text-[var(--text)]">{money(planBilling.finalAmount)}</b>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Plan Name"><input className={inputClass()} value={customName} onChange={(e) => setCustomName(e.target.value)} /></Field>
            <Field label="Base Amount"><input className={inputClass()} type="number" min={0} value={customBase} onChange={(e) => setCustomBase(Number(e.target.value))} /></Field>
            <Field label="GST %"><input className={inputClass()} type="number" min={0} max={100} value={customGst} onChange={(e) => setCustomGst(Number(e.target.value))} /></Field>
            <Field label="Waiter Limit"><input className={inputClass()} type="number" min={0} value={customWaiter} onChange={(e) => setCustomWaiter(Number(e.target.value))} /></Field>
            <Field label="Kitchen Limit"><input className={inputClass()} type="number" min={0} value={customKitchen} onChange={(e) => setCustomKitchen(Number(e.target.value))} /></Field>
            <Field label="Receptionist Limit"><input className={inputClass()} type="number" min={0} value={customReception} onChange={(e) => setCustomReception(Number(e.target.value))} /></Field>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Billing Cycle">
            <select className={inputClass()} value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as "MONTHLY" | "YEARLY")}>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </Field>
          <Field label="Duration Months">
            <input className={inputClass()} type="number" min={1} max={120} value={effectiveDuration} disabled={renewalType === "PREDEFINED"} onChange={(e) => setDurationMonths(Number(e.target.value))} />
          </Field>
          <Detail label="New Expiry" value={format(expiryDate, "MMM d, yyyy")} />
          <Detail label="Final Amount" value={money(billing.finalAmount)} />
        </div>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] p-4">
          <h3 className="text-sm font-bold text-[var(--text)]">Renewal Summary</h3>
          <dl className="mt-3 grid gap-4 md:grid-cols-4">
            <Detail label="Plan Type" value={renewalType === "PREDEFINED" ? "Common Plan" : "Private Custom Plan"} />
            <Detail label="Staff Limits" value={`W ${limits.waiter} / K ${limits.kitchen} / R ${limits.receptionist}`} />
            <Detail label="Billing" value={`${money(billing.base)} + ${money(billing.gstAmount)} GST`} />
            <Detail label="Validity" value={`${format(startDate, "MMM d, yyyy")} to ${format(expiryDate, "MMM d, yyyy")}`} />
          </dl>
        </section>
      </div>
    </CommonModal>
  );
}

function HistoryDetails({ history, loading }: { history: LicenseHistoryResponse | null; loading: boolean }) {
  if (loading) return <div className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>Loading history...</div>;
  if (!history) return <div className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>No history available.</div>;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border p-4" style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Subscription History</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-xs uppercase" style={{ borderColor: "var(--border-soft)", background: "var(--background-subtle)", color: "var(--muted)" }}>
              <tr>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Validity</th>
                <th className="px-3 py-2">Billing</th>
                <th className="px-3 py-2">Limits</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-soft)" }}>
              {history.subscriptions.map(({ subscription, plan }) => (
                <tr key={subscription.id}>
                  <td className="px-3 py-3"><div className="font-semibold" style={{ color: "var(--text)" }}>{subscription.planNameSnapshot ?? plan.name}</div><div className="font-mono text-xs" style={{ color: "var(--accent-strong)" }}>{plan.planNumber ?? plan.code ?? "-"}</div></td>
                  <td className="px-3 py-3"><StatusBadge status={subscription.status} /></td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--muted)" }}>{format(new Date(subscription.startDate), "MMM d, yyyy")} to {format(new Date(subscription.endDate), "MMM d, yyyy")}</td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--muted)" }}>{subscription.billingCycle} - {money(subscription.finalAmountSnapshot ?? subscription.price, subscription.currency)}</td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--muted)" }}>W {subscription.waiterLimitSnapshot ?? "-"} / K {subscription.kitchenLimitSnapshot ?? "-"} / R {subscription.receptionistLimitSnapshot ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Recent License Activity</h3>
        <div className="mt-3 space-y-2">
          {history.auditLogs.length === 0 ? (
            <div className="text-sm" style={{ color: "var(--muted)" }}>No audit activity recorded.</div>
          ) : (
            history.auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-soft)", background: "var(--background-subtle)" }}>
                <span className="font-medium" style={{ color: "var(--text)" }}>{log.action}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function LicenseDetails({ item }: { item: LicenseListItem }) {
  const sub = item.subscription;
  const currency = sub.currency ?? "INR";
  return (
    <div className="space-y-5">
      <section className="rounded-xl border p-4" style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Restaurant Information</h3>
        <dl className="mt-3 grid gap-4 md:grid-cols-2">
          <Detail label="Restaurant" value={item.restaurant.name} />
          <Detail label="Email" value={item.restaurant.email ?? "-"} />
          <Detail label="Phone" value={item.restaurant.phone ?? "-"} />
          <Detail label="Organization" value={item.organization?.name ?? "-"} />
        </dl>
      </section>
      <section className="rounded-xl border p-4" style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>Subscription Information</h3>
        <dl className="mt-3 grid gap-4 md:grid-cols-3">
          <Detail label="Plan Number" value={item.plan.planNumber ?? "-"} />
          <Detail label="Plan" value={sub.planNameSnapshot ?? item.plan.name} />
          <Detail label="Plan Type" value={planKind(item)} />
          <Detail label="Billing Cycle" value={sub.billingCycle} />
          <Detail label="Duration" value={`${sub.durationMonthsSnapshot ?? "-"} month`} />
          <Detail label="Status" value={<StatusBadge status={sub.status} />} />
          <Detail label="Waiter Limit" value={sub.waiterLimitSnapshot ?? "-"} />
          <Detail label="Kitchen Limit" value={sub.kitchenLimitSnapshot ?? "-"} />
          <Detail label="Receptionist Limit" value={sub.receptionistLimitSnapshot ?? "-"} />
          <Detail label="Base Amount" value={money(sub.baseAmountSnapshot ?? sub.price, currency)} />
          <Detail label="GST" value={`${sub.gstPercentageSnapshot ?? "0"}% (${money(sub.gstAmountSnapshot, currency)})`} />
          <Detail label="Final Amount" value={money(sub.finalAmountSnapshot ?? sub.price, currency)} />
        </dl>
      </section>
      <section className="rounded-xl border p-4" style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>License Information</h3>
        <dl className="mt-3 grid gap-4 md:grid-cols-3">
          <Detail label="License Number" value={item.license.licenseKey} />
          <Detail label="License Status" value={<StatusBadge status={item.license.status} />} />
          <Detail label="Issue Date" value={format(new Date(item.license.issuedAt), "MMM d, yyyy")} />
          <Detail label="Expiry Date" value={format(new Date(item.license.expiresAt), "MMM d, yyyy")} />
          <Detail label="Renewal Status" value={item.license.status === "ACTIVE" ? "Current" : item.license.status} />
        </dl>
      </section>
    </div>
  );
}
