"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { formatCurrency } from "@/lib/formatters/currency";
import { queryKeys } from "@/lib/query/query-keys";
import { FilterCard, FilterSearchInput, FilterSelect } from "@/components/common/filters";
import { createPlan, updatePlan, updatePlanStatus, type PlanPayload } from "../api/plan-api";
import { usePlans } from "../hooks/use-plans";

export type PlanRow = {
  id: string;
  planNumber?: string;
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice: string;
  yearlyPrice: string;
  durationMonths?: number | null;
  gstPercentage?: string | number | null;
  features?: string[];
  maxUsers?: number | null;
  waiterLimit?: number | null;
  kitchenLimit?: number | null;
  receptionistLimit?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const emptyForm = {
  name: "",
  description: "",
  billingCycle: "MONTHLY",
  monthlyPrice: "",
  yearlyPrice: "",
  durationMonths: "1",
  gstPercentage: "18",
  waiterLimit: "5",
  kitchenLimit: "2",
  receptionistLimit: "1",
  features: "Menu Management\nTable Management\nBilling\nKitchen Management\nReports\nStaff Management",
  isActive: true,
};

function billingFor(plan: PlanRow, cycle: "MONTHLY" | "YEARLY") {
  const baseAmount = Number(cycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice);
  const gstPercentage = Number(plan.gstPercentage ?? 18);
  const gstAmount = baseAmount * gstPercentage / 100;
  return { baseAmount, gstPercentage, gstAmount, finalAmount: baseAmount + gstAmount };
}

export function PlanListPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = usePlans();
  const rows = (data?.data ?? []) as PlanRow[];
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const filteredRows = useMemo(() => {
    return rows.filter((plan) => {
      const matchesSearch = !search || [plan.name, plan.planNumber, plan.code, plan.description].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? plan.isActive : !plan.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const previewBase = Number(form.billingCycle === "YEARLY" ? form.yearlyPrice : form.monthlyPrice) || 0;
  const previewGst = Number(form.gstPercentage) || 0;
  const previewGstAmount = previewBase * previewGst / 100;

  const planMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: PlanPayload }) => id ? updatePlan(id, payload) : createPlan(payload),
    onSuccess: () => {
      toast.success(editing ? "Plan updated successfully." : "Plan created successfully.");
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans });
    },
    onError: () => toast.error("Unable to save subscription plan."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updatePlanStatus(id, isActive),
    onSuccess: () => {
      toast.success("Plan status updated.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans });
    },
    onError: () => toast.error("Unable to update plan status."),
  });

  const totals = useMemo(() => ({
    active: rows.filter((plan) => plan.isActive).length,
    inactive: rows.filter((plan) => !plan.isActive).length,
  }), [rows]);

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load subscription plans." onRetry={() => refetch()} />;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(plan: PlanRow) {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      billingCycle: "MONTHLY",
      monthlyPrice: String(plan.monthlyPrice ?? ""),
      yearlyPrice: String(plan.yearlyPrice ?? ""),
      durationMonths: String(plan.durationMonths ?? 1),
      gstPercentage: String(plan.gstPercentage ?? 18),
      waiterLimit: String(plan.waiterLimit ?? Math.max((plan.maxUsers ?? 0) - 3, 1)),
      kitchenLimit: String(plan.kitchenLimit ?? 1),
      receptionistLimit: String(plan.receptionistLimit ?? 1),
      features: (plan.features ?? []).join("\n"),
      isActive: plan.isActive,
    });
    setShowForm(true);
  }

  function submitPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const monthlyPrice = Number(form.monthlyPrice);
    const yearlyPrice = Number(form.yearlyPrice);
    const durationMonths = Number(form.durationMonths);
    const gstPercentage = Number(form.gstPercentage);
    const waiterLimit = Number(form.waiterLimit);
    const kitchenLimit = Number(form.kitchenLimit);
    const receptionistLimit = Number(form.receptionistLimit);
    if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) return toast.error("Monthly amount must be a positive number.");
    if (!Number.isFinite(yearlyPrice) || yearlyPrice <= 0) return toast.error("Yearly amount must be a positive number.");
    if (!Number.isInteger(durationMonths) || durationMonths < 1) return toast.error("Duration must be at least 1 month.");
    if (!Number.isFinite(gstPercentage) || gstPercentage < 0 || gstPercentage > 28) return toast.error("GST must be between 0 and 28.");
    if (![waiterLimit, kitchenLimit, receptionistLimit].every((value) => Number.isInteger(value) && value > 0)) {
      return toast.error("All staff limits must be positive whole numbers.");
    }

    planMutation.mutate({
      id: editing?.id,
      payload: {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        monthlyPrice,
        yearlyPrice,
        durationMonths,
        gstPercentage,
        waiterLimit,
        kitchenLimit,
        receptionistLimit,
        features: form.features.split("\n").map((feature) => feature.trim()).filter(Boolean),
        isActive: form.isActive,
      },
    });
  }

  const inputClass = "heritage-input mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)]";

  return (
    <div className="space-y-5">
      {!embedded ? (
        <PageHeader
          title="Subscription Plans"
          description={`Manage predefined plans, role limits, and pricing. Active: ${totals.active}, inactive: ${totals.inactive}.`}
          actions={<button onClick={openCreate} className="heritage-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-95 disabled:opacity-60">Add Subscription Plan</button>}
        />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="heritage-heading text-2xl font-bold">Subscription Plans</h2>
            <p className="text-sm text-slate-600">Create reusable predefined plans for new restaurant subscriptions.</p>
          </div>
          <button onClick={openCreate} className="heritage-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-95 disabled:opacity-60">Add Subscription Plan</button>
        </div>
      )}

      <FilterCard
        title="Plan Filters"
        activeCount={(search ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0)}
        chips={[
          search ? { key: "search", label: "Search", value: search, onRemove: () => setSearch("") } : undefined,
          statusFilter !== "ALL" ? { key: "status", label: "Status", value: statusFilter, onRemove: () => setStatusFilter("ALL") } : undefined,
        ].filter((chip): chip is NonNullable<typeof chip> => Boolean(chip))}
        onClear={() => { setSearch(""); setStatusFilter("ALL"); }}
      >
        <FilterSearchInput value={search} onChange={setSearch} placeholder="Search by plan name, code, plan number..." />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as "ALL" | "ACTIVE" | "INACTIVE")}
          options={[
            { value: "ALL", label: "All Statuses" },
            { value: "ACTIVE", label: "Active Only" },
            { value: "INACTIVE", label: "Inactive Only" },
          ]}
        />
      </FilterCard>

      {showForm ? (
        <form onSubmit={submitPlan} className="heritage-surface rounded-lg p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">{editing ? "Edit Subscription Plan" : "Create Subscription Plan"}</h3>
              <p className="text-sm text-slate-600">Reusable predefined plans apply to future restaurant subscriptions.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Active
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">Plan Name<input required className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700">Plan Type<input readOnly className={`${inputClass} bg-slate-50`} value="PREDEFINED" /></label>
            <label className="text-sm font-medium text-slate-700">Waiters<input required type="number" min={1} step={1} className={inputClass} value={form.waiterLimit} onChange={(event) => setForm((current) => ({ ...current, waiterLimit: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700">Kitchen Staff<input required type="number" min={1} step={1} className={inputClass} value={form.kitchenLimit} onChange={(event) => setForm((current) => ({ ...current, kitchenLimit: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700">Receptionists<input required type="number" min={1} step={1} className={inputClass} value={form.receptionistLimit} onChange={(event) => setForm((current) => ({ ...current, receptionistLimit: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700">Billing Preview<select className={inputClass} value={form.billingCycle} onChange={(event) => setForm((current) => ({ ...current, billingCycle: event.target.value }))}><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label>
            <label className="text-sm font-medium text-slate-700">Duration<input required type="number" min={1} max={120} step={1} className={inputClass} value={form.durationMonths} onChange={(event) => setForm((current) => ({ ...current, durationMonths: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700">GST %<input required type="number" min={0} max={28} step="0.01" className={inputClass} value={form.gstPercentage} onChange={(event) => setForm((current) => ({ ...current, gstPercentage: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700">Monthly Base Amount<input required type="number" min={0.01} step="0.01" className={inputClass} value={form.monthlyPrice} onChange={(event) => setForm((current) => ({ ...current, monthlyPrice: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700">Yearly Base Amount<input required type="number" min={0.01} step="0.01" className={inputClass} value={form.yearlyPrice} onChange={(event) => setForm((current) => ({ ...current, yearlyPrice: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700 xl:col-span-3">Description<input className={inputClass} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">Features<textarea rows={4} className={inputClass} value={form.features} onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))} /></label>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-4 text-sm">
              <div className="flex justify-between py-1"><span className="text-slate-600">Base Amount</span><span className="font-semibold">{formatCurrency(previewBase, "INR")}</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-600">GST ({previewGst}%)</span><span className="font-semibold">{formatCurrency(previewGstAmount, "INR")}</span></div>
              <div className="mt-2 flex justify-between border-t border-[var(--border-soft)] pt-3"><span className="font-semibold">Final Amount</span><span className="font-bold">{formatCurrency(previewBase + previewGstAmount, "INR")}</span></div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="heritage-button-secondary rounded-lg px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)]">Cancel</button>
            <button disabled={planMutation.isPending} className="heritage-button-primary rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-95 disabled:opacity-60">{planMutation.isPending ? editing ? "Updating Plan..." : "Creating Plan..." : editing ? "Update Plan" : "Create Plan"}</button>
          </div>
        </form>
      ) : null}

      {!filteredRows.length ? (
        <EmptyState title="No subscription plans available." description="Try adjusting your search or filters." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((plan) => {
            const billing = billingFor(plan, "MONTHLY");
            return (
              <article key={plan.id} className="heritage-card group rounded-lg p-5">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{plan.planNumber ?? plan.code}</p>
                    <h3 className="heritage-heading mt-1 text-2xl font-bold text-[var(--text)]">{plan.name}</h3>
                    {plan.description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{plan.description}</p> : null}
                  </div>
                  <StatusBadge status={plan.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>

                <div className="mt-5 rounded-lg border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-strong)_34%,var(--surface))] p-4">
                  <div className="text-3xl font-extrabold tracking-normal text-[var(--text)]">{formatCurrency(billing.baseAmount, "INR")}</div>
                  <div className="mt-1 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">/ Month</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3"><div className="text-xs font-medium text-[var(--muted)]">Waiter</div><div className="mt-1 text-lg font-bold text-[var(--text)]">{plan.waiterLimit ?? "-"}</div></div>
                  <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3"><div className="text-xs font-medium text-[var(--muted)]">Kitchen</div><div className="mt-1 text-lg font-bold text-[var(--text)]">{plan.kitchenLimit ?? "-"}</div></div>
                  <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] p-3"><div className="text-xs font-medium text-[var(--muted)]">Reception</div><div className="mt-1 text-lg font-bold text-[var(--text)]">{plan.receptionistLimit ?? "-"}</div></div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-[var(--muted)]">
                  <div className="flex justify-between"><span>Duration</span><span className="font-semibold">{plan.durationMonths ?? 1} Month</span></div>
                  <div className="flex justify-between"><span>GST</span><span className="font-semibold">{billing.gstPercentage}%</span></div>
                  <div className="flex justify-between"><span>GST Amount</span><span className="font-semibold">{formatCurrency(billing.gstAmount, "INR")}</span></div>
                  <div className="flex justify-between border-t border-[var(--border-soft)] pt-2 text-[var(--text)]"><span>Final Amount</span><span className="font-bold">{formatCurrency(billing.finalAmount, "INR")}</span></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(plan.features ?? []).slice(0, 5).map((feature) => <span key={feature} className="rounded-full border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] px-2 py-1 text-xs font-medium text-[var(--muted)]">{feature}</span>)}
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => openEdit(plan)} className="heritage-button-secondary rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--accent)]">Edit</button>
                  <button
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: plan.id, isActive: !plan.isActive })}
                    className="heritage-button-primary rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-95 disabled:opacity-60"
                  >
                    {plan.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
