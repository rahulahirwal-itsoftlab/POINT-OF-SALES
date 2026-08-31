"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useDebounce } from "@/hooks/use-debounce";
import { useDashboardDateFilter } from "@/hooks/use-dashboard-date-filter";
import { Check, Clock, Edit3, Eye, Loader2, Plus, Sparkles, UserCircle } from "lucide-react";
import toast from "react-hot-toast";
import { ActionDropdown } from "@/components/common/action-dropdown";
import { DashboardDateFilter } from "@/components/dashboard/dashboard-date-filter";
import {
  ActivityTimeline,
  AnalyticsPanel,
  DonutAnalytics,
  LiveMarketAnalyticsChart,
  MetricStrip,
  ResponsiveBarAnalytics,
  type ChartDatum,
} from "@/components/dashboard/analytics-widgets";
import { CommonModal } from "@/components/common/modal";
import { CommonPagination } from "@/components/common/pagination";
import { FilterCard, FilterSearchInput, FilterSelect, type ActiveFilterChip } from "@/components/common/filters";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { extractApiError } from "@/lib/api/client";
import {
  useCreateRestaurantAdminStaff,
  useReadAllRestaurantAdminNotifications,
  useReadRestaurantAdminNotification,
  useRestaurantAdminAuditLogs,
  useRestaurantAdminAvailablePlans,
  useRestaurantAdminBills,
  useRestaurantAdminDashboard,
  useRestaurantAdminNotifications,
  useRestaurantAdminStaff,
  useRestaurantAdminStaffDetail,
  useRestaurantAdminSubscription,
  useUpdateRestaurantAdminStaff,
  useUpdateRestaurantAdminStaffStatus,
} from "./hooks";
import type { AvailablePlan, StaffMember, StaffRole } from "./types";

const roleLabels: Record<string, string> = {
  RECEPTION: "Receptionist",
  WAITER: "Waiter",
  KITCHEN: "Kitchen Admin",
};

function currency(value: number, currencyCode = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(value);
}

function date(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

function time(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "-";
}

export function RestaurantAdminDashboardPage() {
  const [activeMetricKey, setActiveMetricKey] = useState("revenue");
  const dateFilter = useDashboardDateFilter();
  const { data, isLoading, isFetching, isError, refetch } = useRestaurantAdminDashboard(dateFilter.apiParams);
  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState message="Unable to load restaurant dashboard." onRetry={() => refetch()} />;
  const dashboard = data.data;
  const selectedRevenue = dashboard.revenue.selected ?? dashboard.revenue.today;
  const selectedOrders = dashboard.orders.selected ?? dashboard.orders.today;
  const combinedTrend: ChartDatum[] = dashboard.charts.revenueTrend.map((row, idx) => {
    const matchingOrder = dashboard.charts.orderTrend[idx];
    const rev = row.revenue ?? 0;
    const ord = matchingOrder?.orders ?? 0;
    const avg = ord > 0 ? Math.round(rev / ord) : 0;
    return {
      date: row.date,
      revenue: rev,
      orders: ord,
      averageOrder: avg,
    };
  });
  const orderTrend: ChartDatum[] = dashboard.charts.orderTrend.map((row) => ({ date: row.date, orders: row.orders }));
  const paymentRows: ChartDatum[] = dashboard.charts.paymentDistribution.map((row) => ({ method: row.method, total: row.total, count: row.count }));
  const billDistribution: ChartDatum[] = [
    { status: "Paid", value: dashboard.bills.paid },
    { status: "Pending", value: dashboard.bills.pending },
    { status: "Cancelled", value: dashboard.bills.cancelled },
  ];
  const staffRows: ChartDatum[] = dashboard.charts.staffDistribution.map((row) => ({ role: roleLabels[row.role] ?? row.role, count: row.count }));
  const insights = [
    selectedRevenue > 0 ? `Selected period revenue is ${currency(selectedRevenue)}.` : "",
    selectedOrders > 0 ? `${selectedOrders} orders were recorded in the selected period.` : "",
    dashboard.bills.pending > 0 ? `${dashboard.bills.pending} bills are waiting for payment.` : "",
    dashboard.staff.active > 0 ? `${dashboard.staff.active} active staff members are available.` : "",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restaurant Intelligence"
        description="Revenue, orders, billing, and staff performance from live restaurant data."
        actions={<DashboardDateFilter value={dateFilter.filter} onChange={dateFilter.setFilter} onReset={dateFilter.resetFilter} isLoading={isFetching} />}
      />

      <MetricStrip items={[
        { label: "Revenue", value: currency(selectedRevenue), hint: dashboard.dateRange?.preset ?? "selected range", tone: "green" },
        { label: "Orders", value: selectedOrders, hint: `${dashboard.orders.total} total orders`, tone: "blue" },
        { label: "Average Order", value: currency(dashboard.revenue.averageOrderValue ?? 0), hint: "calculated by backend", tone: "amber" },
        { label: "Pending Bills", value: dashboard.bills.pending, hint: `${dashboard.bills.paid} paid bills`, tone: dashboard.bills.pending ? "red" : "green" },
      ]} />

      <LiveMarketAnalyticsChart
        title="Performance Analytics Terminal"
        subtitle="Time-series financial and order performance from live backend API data."
        data={combinedTrend}
        xKey="date"
        activeMetricKey={activeMetricKey}
        onMetricChange={setActiveMetricKey}
        metrics={[
          {
            key: "revenue",
            label: "Revenue",
            yKey: "revenue",
            formatValue: (val) => currency(val),
            stroke: "#10b981",
            gradientStart: "#10b981",
            gradientStop: "#ecfdf5",
          },
          {
            key: "orders",
            label: "Orders",
            yKey: "orders",
            formatValue: (val) => `${val} orders`,
            stroke: "#2563eb",
            gradientStart: "#2563eb",
            gradientStop: "#eff6ff",
          },
          {
            key: "averageOrder",
            label: "Average Order",
            yKey: "averageOrder",
            formatValue: (val) => currency(val),
            stroke: "#d97706",
            gradientStart: "#d97706",
            gradientStop: "#fffbe6",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPanel title="Sales Performance" subtitle="Order volume by dashboard grouping.">
          <ResponsiveBarAnalytics data={orderTrend} xKey="date" yKey="orders" emptyMessage="Order trend data is not available for this range." />
        </AnalyticsPanel>
        <AnalyticsPanel title="Billing Distribution" subtitle="Paid, pending, and cancelled bill state.">
          <DonutAnalytics data={billDistribution} nameKey="status" valueKey="value" centerLabel="Bills" centerValue={dashboard.bills.total} emptyMessage="Bill distribution data is not available." />
        </AnalyticsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPanel title="Payment Analytics" subtitle="Collected amount by payment method.">
          <ResponsiveBarAnalytics data={paymentRows} xKey="method" yKey="total" fill="#16a34a" emptyMessage="Payment method data is not available for this range." />
        </AnalyticsPanel>
        <AnalyticsPanel title="Staff Operations Mix" subtitle="Real staff distribution by role.">
          <DonutAnalytics data={staffRows} nameKey="role" valueKey="count" centerLabel="Staff" centerValue={dashboard.staff.total} emptyMessage="Staff distribution data is not available." />
        </AnalyticsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPanel title="Business Insights" subtitle="Calculated only from available dashboard fields.">
          <div className="space-y-2">
            {insights.length ? insights.map((insight) => <p key={insight} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{insight}</p>) : <EmptyState title="No insights available" description="There is not enough data in the selected period." />}
          </div>
        </AnalyticsPanel>
        <AnalyticsPanel title="Account Health" subtitle="Subscription and license status.">
          <ActivityTimeline rows={[
            { id: "subscription", title: dashboard.subscription?.planName ?? "Subscription", subtitle: dashboard.subscription?.status ?? "Missing", value: dashboard.subscription ? `${dashboard.subscription.remainingDays} days left` : "No plan", time: dashboard.subscription?.endDate ? time(dashboard.subscription.endDate) : "-" },
            { id: "license", title: "License", subtitle: dashboard.license?.status ?? "Missing", value: dashboard.license ? `${dashboard.license.remainingDays} days left` : "No license", time: dashboard.license?.expiresAt ? time(dashboard.license.expiresAt) : "-" },
          ]} />
        </AnalyticsPanel>
      </div>
    </div>
  );
}

export function RestaurantAdminStaffPage() {
  const [params, setParams] = useState({ page: 1, limit: 20, search: "", role: "", status: "" });
  const [isOpen, setIsOpen] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const queryParams = useMemo(() => ({ ...params, role: params.role || undefined, status: params.status || undefined, search: params.search || undefined }), [params]);
  const { data, isLoading, isError, refetch } = useRestaurantAdminStaff(queryParams);
  const { data: detailData, isLoading: detailLoading } = useRestaurantAdminStaffDetail(viewingStaff?.id);

  const createStaff = useCreateRestaurantAdminStaff();
  const updateStaff = useUpdateRestaurantAdminStaff();
  const updateStatus = useUpdateRestaurantAdminStaffStatus();

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", role: "RECEPTION" as StaffRole, shift: "", assignedSection: "", kitchenStation: "" });
  const [editForm, setEditForm] = useState({ fullName: "", email: "", phone: "", role: "RECEPTION" as StaffRole, shift: "", assignedSection: "", kitchenStation: "" });

  function handleOpenEdit(staff: StaffMember) {
    setEditingStaff(staff);
    setEditForm({
      fullName: staff.fullName ?? "",
      email: staff.email ?? "",
      phone: staff.phone ?? "",
      role: staff.role ?? "RECEPTION",
      shift: staff.shift ?? "",
      assignedSection: staff.assignedSection ?? "",
      kitchenStation: staff.kitchenStation ?? "",
    });
  }

  async function submitCreate() {
    const normalized = {
      ...form,
      fullName: form.fullName.trim().replace(/\s+/g, " "),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      shift: form.shift.trim(),
      assignedSection: form.assignedSection.trim(),
      kitchenStation: form.kitchenStation.trim(),
    };
    if (normalized.fullName.length < 2) return toast.error("Staff name must be at least 2 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) return toast.error("Enter a valid staff email.");
    if (normalized.phone && !/^\d{10}$/.test(normalized.phone)) return toast.error("Staff phone must be exactly 10 digits.");
    if (normalized.password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (normalized.role === "WAITER" && !normalized.assignedSection) return toast.error("Assigned section is required for waiters.");
    if (normalized.role === "KITCHEN" && !normalized.kitchenStation) return toast.error("Kitchen station is required for kitchen staff.");

    try {
      await createStaff.mutateAsync(normalized);
      toast.success("Staff member created.");
      setIsOpen(false);
      setForm({ fullName: "", email: "", phone: "", password: "", role: "RECEPTION", shift: "", assignedSection: "", kitchenStation: "" });
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  async function submitEdit() {
    if (!editingStaff) return;
    const normalized = {
      fullName: editForm.fullName.trim().replace(/\s+/g, " "),
      email: editForm.email.trim().toLowerCase(),
      phone: editForm.phone.trim() || undefined,
      role: editForm.role,
      shift: editForm.shift.trim() || undefined,
      assignedSection: editForm.assignedSection.trim() || undefined,
      kitchenStation: editForm.kitchenStation.trim() || undefined,
    };

    if (normalized.fullName.length < 2) return toast.error("Staff name must be at least 2 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) return toast.error("Enter a valid staff email.");
    if (normalized.phone && !/^\d{10}$/.test(normalized.phone)) return toast.error("Staff phone must be exactly 10 digits.");
    if (normalized.role === "WAITER" && !normalized.assignedSection) return toast.error("Assigned section is required for waiters.");
    if (normalized.role === "KITCHEN" && !normalized.kitchenStation) return toast.error("Kitchen station is required for kitchen staff.");

    try {
      await updateStaff.mutateAsync({ id: editingStaff.id, input: normalized });
      toast.success("Staff details updated successfully.");
      setEditingStaff(null);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  const staffDetails = detailData?.data ?? viewingStaff;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Manage restaurant employees and login access."
        actions={
          <button onClick={() => setIsOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Add Staff
          </button>
        }
      />
      <Filters params={params} setParams={setParams} roleFilter />
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState message="Unable to load staff." onRetry={() => refetch()} />
      ) : !(data?.data ?? []).length ? (
        <EmptyState title="No staff found" description="Add staff to begin." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.data ?? []).map((staff) => (
                <tr key={staff.id}>
                  <td className="p-3 font-medium">{staff.fullName}</td>
                  <td className="p-3">{staff.email}</td>
                  <td className="p-3">{staff.phone ?? "-"}</td>
                  <td className="p-3">{roleLabels[staff.role] ?? staff.role}</td>
                  <td className="p-3">
                    <StatusBadge status={staff.status} />
                  </td>
                  <td className="p-3">{date(staff.createdAt)}</td>
                  <td className="p-3 text-right">
                    <ActionDropdown
                      items={[
                        {
                          label: "View",
                          icon: <Eye className="h-4 w-4" />,
                          onClick: () => setViewingStaff(staff),
                        },
                        {
                          label: "Edit",
                          icon: <Edit3 className="h-4 w-4" />,
                          onClick: () => handleOpenEdit(staff),
                        },
                        {
                          label: staff.status === "ACTIVE" ? "Deactivate" : "Activate",
                          variant: staff.status === "ACTIVE" ? "destructive" : "default",
                          onClick: () => updateStatus.mutate({ id: staff.id, status: staff.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CommonPagination
        currentPage={params.page}
        totalPages={Math.ceil((data?.meta?.total ?? 0) / params.limit) || 1}
        totalItems={data?.meta?.total}
        pageSize={params.limit}
        onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
        onPageSizeChange={(limit) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
        showPageSize
      />

      {/* Add Staff Modal */}
      <CommonModal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Staff" description="Select a staff role and enter login details." showFooter={false}>
        <div className="space-y-4">
          <Select label="Role" value={form.role} onChange={(role) => setForm((prev) => ({ ...prev, role: role as StaffRole }))} options={[["RECEPTION", "Receptionist"], ["WAITER", "Waiter"], ["KITCHEN", "Kitchen Admin"]]} />
          <TextInput label="Name" value={form.fullName} onChange={(fullName) => setForm((prev) => ({ ...prev, fullName }))} />
          <TextInput label="Email" value={form.email} onChange={(email) => setForm((prev) => ({ ...prev, email }))} />
          <TextInput label="Phone" value={form.phone} onChange={(phone) => setForm((prev) => ({ ...prev, phone }))} />
          <TextInput label="Password" type="password" value={form.password} onChange={(password) => setForm((prev) => ({ ...prev, password }))} />
          {form.role === "RECEPTION" ? <TextInput label="Shift" value={form.shift} onChange={(shift) => setForm((prev) => ({ ...prev, shift }))} /> : null}
          {form.role === "WAITER" ? <TextInput label="Assigned Section" value={form.assignedSection} onChange={(assignedSection) => setForm((prev) => ({ ...prev, assignedSection }))} /> : null}
          {form.role === "KITCHEN" ? <TextInput label="Kitchen Station" value={form.kitchenStation} onChange={(kitchenStation) => setForm((prev) => ({ ...prev, kitchenStation }))} /> : null}
          <button disabled={createStaff.isPending} onClick={submitCreate} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {createStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Staff
          </button>
        </div>
      </CommonModal>

      {/* View Staff Modal */}
      {viewingStaff && (
        <CommonModal
          isOpen={Boolean(viewingStaff)}
          onClose={() => setViewingStaff(null)}
          title="Staff Details"
          description="Detailed employee record."
          showFooter={false}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-xl border p-4 bg-slate-50">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-lg">
                <UserCircle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">{staffDetails?.fullName}</h3>
                <p className="text-xs text-slate-500">{staffDetails?.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                    {roleLabels[staffDetails?.role ?? ""] ?? staffDetails?.role}
                  </span>
                  <StatusBadge status={staffDetails?.status ?? "ACTIVE"} />
                </div>
              </div>
            </div>

            {detailLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Employee Code</dt>
                  <dd className="mt-1 font-mono text-slate-800">{staffDetails?.employeeCode || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</dt>
                  <dd className="mt-1 text-slate-800">{staffDetails?.phone || "—"}</dd>
                </div>
                {staffDetails?.role === "RECEPTION" ? (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Shift</dt>
                    <dd className="mt-1 text-slate-800">{staffDetails?.shift || "—"}</dd>
                  </div>
                ) : null}
                {staffDetails?.role === "WAITER" ? (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Section</dt>
                    <dd className="mt-1 text-slate-800">{staffDetails?.assignedSection || "—"}</dd>
                  </div>
                ) : null}
                {staffDetails?.role === "KITCHEN" ? (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Kitchen Station</dt>
                    <dd className="mt-1 text-slate-800">{staffDetails?.kitchenStation || "—"}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Joined Date</dt>
                  <dd className="mt-1 text-slate-800">{date(staffDetails?.createdAt)}</dd>
                </div>
                {staffDetails?.lastLoginAt ? (
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Last Login</dt>
                    <dd className="mt-1 text-slate-800">{date(staffDetails.lastLoginAt)}</dd>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setViewingStaff(null)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingStaff;
                  setViewingStaff(null);
                  if (target) handleOpenEdit(target);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                <Edit3 className="h-4 w-4" /> Edit Staff
              </button>
            </div>
          </div>
        </CommonModal>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <CommonModal
          isOpen={Boolean(editingStaff)}
          onClose={() => setEditingStaff(null)}
          title="Edit Staff Member"
          description="Update staff profile and role details."
          showFooter={false}
        >
          <div className="space-y-4">
            <Select
              label="Role"
              value={editForm.role}
              onChange={(role) => setEditForm((prev) => ({ ...prev, role: role as StaffRole }))}
              options={[
                ["RECEPTION", "Receptionist"],
                ["WAITER", "Waiter"],
                ["KITCHEN", "Kitchen Admin"],
              ]}
            />
            <TextInput label="Name" value={editForm.fullName} onChange={(fullName) => setEditForm((prev) => ({ ...prev, fullName }))} />
            <TextInput label="Email" value={editForm.email} onChange={(email) => setEditForm((prev) => ({ ...prev, email }))} />
            <TextInput label="Phone" value={editForm.phone} onChange={(phone) => setEditForm((prev) => ({ ...prev, phone }))} />
            {editForm.role === "RECEPTION" ? (
              <TextInput label="Shift" value={editForm.shift} onChange={(shift) => setEditForm((prev) => ({ ...prev, shift }))} />
            ) : null}
            {editForm.role === "WAITER" ? (
              <TextInput label="Assigned Section" value={editForm.assignedSection} onChange={(assignedSection) => setEditForm((prev) => ({ ...prev, assignedSection }))} />
            ) : null}
            {editForm.role === "KITCHEN" ? (
              <TextInput label="Kitchen Station" value={editForm.kitchenStation} onChange={(kitchenStation) => setEditForm((prev) => ({ ...prev, kitchenStation }))} />
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                disabled={updateStaff.isPending}
                onClick={submitEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {updateStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </CommonModal>
      )}
    </div>
  );
}

export function RestaurantAdminBillsPage() {
  const [params, setParams] = useState({ page: 1, limit: 20, search: "", paymentStatus: "", paymentMethod: "", status: "" });
  const queryParams = useMemo(() => Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value || undefined])), [params]);
  const { data, isLoading, isError, refetch } = useRestaurantAdminBills(queryParams);
  return (
    <div className="space-y-6">
      <PageHeader title="Bills" description="Restaurant bill history with server-side filters." />
      <Filters params={params} setParams={setParams} billFilter />
      {isLoading ? <LoadingSkeleton /> : isError ? <ErrorState message="Unable to load bills." onRetry={() => refetch()} /> : !(data?.data ?? []).length ? <EmptyState title="No bills found" description="Bills will appear here after billing activity." /> : (
        <>
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="p-3">Bill</th><th className="p-3">Order</th><th className="p-3">Table</th><th className="p-3">Customer</th><th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Created By</th><th className="p-3">Date</th></tr>
              </thead>
              <tbody className="divide-y">
                {(data?.data ?? []).map((bill) => (
                  <tr key={bill.id}><td className="p-3 font-medium">{bill.billNumber}</td><td className="p-3">{bill.orderNumber}</td><td className="p-3">{bill.table ?? "-"}</td><td className="p-3">{bill.customer ?? "-"}</td><td className="p-3">{currency(bill.grandTotal)}</td><td className="p-3"><StatusBadge status={bill.paymentStatus} /></td><td className="p-3">{bill.createdBy ?? "-"}</td><td className="p-3">{date(bill.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <CommonPagination
            currentPage={params.page}
            totalPages={Math.ceil((data?.meta?.total ?? 0) / params.limit) || 1}
            totalItems={data?.meta?.total}
            pageSize={params.limit}
            onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
            onPageSizeChange={(limit) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
            showPageSize
          />
        </>
      )}
    </div>
  );
}

export function RestaurantAdminSubscriptionPage() {
  const { data, isLoading, isError, refetch } = useRestaurantAdminSubscription();
  const { data: plansData, isLoading: isLoadingPlans } = useRestaurantAdminAvailablePlans();

  const [viewingPlanDetails, setViewingPlanDetails] = useState<AvailablePlan | null>(null);

  if (isLoading || isLoadingPlans) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState message="Unable to load subscription details." onRetry={() => refetch()} />;

  const sub = data.data;
  const commonPlans = plansData?.data?.commonPlans ?? [];
  const customPlan = plansData?.data?.customPlan ?? null;

  const roleUsage = [
    { label: "Waiters", value: sub.roleUsage?.waiters ?? { used: 0, limit: sub.waiterLimit, remaining: sub.waiterLimit } },
    { label: "Kitchen Staff", value: sub.roleUsage?.kitchen ?? { used: 0, limit: sub.kitchenLimit, remaining: sub.kitchenLimit } },
    { label: "Receptionists", value: sub.roleUsage?.receptionists ?? { used: 0, limit: sub.receptionistLimit, remaining: sub.receptionistLimit } },
  ];

  const modalBase = viewingPlanDetails ? Number(viewingPlanDetails.monthlyPrice) : 0;
  const modalYearlyBase = viewingPlanDetails ? Number(viewingPlanDetails.yearlyPrice) : 0;
  const modalGstPct = viewingPlanDetails ? Number(viewingPlanDetails.gstPercentage ?? 18) : 18;
  const modalGstAmount = (modalBase * modalGstPct) / 100;
  const modalFinalAmount = modalBase + modalGstAmount;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Subscription Management"
        description="View your active subscription details, staff capacity limits, and available common or custom subscription plans."
      />

      {/* SECTION 1: MY ACTIVE SUBSCRIPTION */}
      <section className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">MY ACTIVE SUBSCRIPTION</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase border", sub.planType === "CUSTOMIZED" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                {sub.planType === "CUSTOMIZED" ? "CUSTOM PLAN" : "COMMON PLAN"}
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950 flex items-center gap-3">
              {sub.planName}
              {sub.planNumber ? <span className="text-xs font-mono font-medium text-slate-500">({sub.planNumber})</span> : null}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={sub.status} />
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{sub.remainingDays} Days Remaining</span>
            </div>
          </div>
        </div>

        {/* Staff Capacity & Limits */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Staff Capacity & Limits</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {roleUsage.map(({ label, value }) => {
              const isAtLimit = value.limit !== null && value.used >= value.limit;
              return (
                <div key={label} className={cn("rounded-lg border p-4 transition-all", isAtLimit ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-slate-50/50")}>
                  <div className="text-xs font-semibold text-slate-500 uppercase">{label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-950">
                    {value.used} <span className="text-sm font-normal text-slate-500">/ {value.limit ?? "Unlimited"}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Remaining Slots:</span>
                    <span className={cn("font-bold", isAtLimit ? "text-red-600" : "text-emerald-600")}>
                      {value.remaining ?? "Unlimited"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price Breakdown & Timeline */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Price & Tax Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Base Amount</span>
                <span className="font-semibold text-slate-900">{currency(sub.basePrice, sub.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST ({sub.gstPercentage}%)</span>
                <span className="font-semibold text-slate-900">{currency(sub.gstAmount, sub.currency)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold text-slate-950">
                <span>Final Paid Amount</span>
                <span className="text-emerald-700">{currency(sub.finalPrice, sub.currency)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Subscription Timeline</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500">Billing Cycle:</span>
                <p className="font-semibold text-slate-900">{sub.billingCycle}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Duration:</span>
                <p className="font-semibold text-slate-900">{sub.durationMonths ?? 1} Month(s)</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Start Date:</span>
                <p className="font-semibold text-slate-900">{date(sub.startDate)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Expiry Date:</span>
                <p className="font-semibold text-slate-900">{date(sub.endDate)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MY CUSTOM PLAN SECTION */}
      {customPlan ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-extrabold text-slate-950">MY CUSTOM SUBSCRIPTION PLAN</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <PlanCard
              plan={customPlan}
              isCurrent={sub.planId === customPlan.id}
              onViewDetails={(plan) => setViewingPlanDetails(plan)}
              isCustom
            />
          </div>
        </section>
      ) : null}

      {/* SECTION 2: AVAILABLE COMMON PLANS */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">AVAILABLE SUBSCRIPTION PLANS</h2>
          <p className="text-sm text-slate-500">View information on all active common subscription plans available across the system.</p>
        </div>

        {!commonPlans.length ? (
          <EmptyState title="No subscription plans are currently available." description="Contact Super Admin to publish subscription plans." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {commonPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={sub.planId === plan.id}
                onViewDetails={(selected) => setViewingPlanDetails(selected)}
              />
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: SUBSCRIPTION PLAN DETAILS MODAL (VIEW DETAILS ONLY) */}
      <CommonModal
        isOpen={Boolean(viewingPlanDetails)}
        onClose={() => setViewingPlanDetails(null)}
        title={`Subscription Plan Details: ${viewingPlanDetails?.name}`}
        description="Comprehensive specifications, pricing breakdown, and role limits for this plan."
        showFooter={false}
      >
        {viewingPlanDetails ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">{viewingPlanDetails.planNumber ?? viewingPlanDetails.code}</span>
                <h3 className="text-xl font-extrabold text-slate-950">{viewingPlanDetails.name}</h3>
              </div>
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-extrabold uppercase border", viewingPlanDetails.planType === "CUSTOMIZED" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                {viewingPlanDetails.planType === "CUSTOMIZED" ? "CUSTOM PLAN" : "COMMON PLAN"}
              </span>
            </div>

            {viewingPlanDetails.description ? (
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border">{viewingPlanDetails.description}</p>
            ) : null}

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-2 text-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Pricing Breakdown</h4>
              <div className="flex justify-between text-slate-600">
                <span>Monthly Base Price</span>
                <span className="font-semibold text-slate-900">{currency(modalBase)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Yearly Base Price</span>
                <span className="font-semibold text-slate-900">{currency(modalYearlyBase)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST ({modalGstPct}%)</span>
                <span className="font-semibold text-slate-900">{currency(modalGstAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200 pt-2 text-base font-black text-slate-950">
                <span>Final Monthly Price</span>
                <span className="text-emerald-700">{currency(modalFinalAmount)}</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Allowed Staff Capacity</h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-800">
                <div className="rounded bg-white p-2.5 border">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Waiters</div>
                  <div className="text-base text-slate-950 mt-1">{viewingPlanDetails.waiterLimit ?? "Unlimited"}</div>
                </div>
                <div className="rounded bg-white p-2.5 border">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Kitchen Staff</div>
                  <div className="text-base text-slate-950 mt-1">{viewingPlanDetails.kitchenLimit ?? "Unlimited"}</div>
                </div>
                <div className="rounded bg-white p-2.5 border">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Receptionists</div>
                  <div className="text-base text-slate-950 mt-1">{viewingPlanDetails.receptionistLimit ?? "Unlimited"}</div>
                </div>
              </div>
            </div>

            {(viewingPlanDetails.features ?? []).length > 0 ? (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Included Features</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(viewingPlanDetails.features ?? []).map((f) => (
                    <span key={f} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border">
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setViewingPlanDetails(null)}
                className="rounded-lg bg-slate-950 px-6 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </CommonModal>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onViewDetails,
  isCustom = false,
}: {
  plan: AvailablePlan;
  isCurrent: boolean;
  onViewDetails: (plan: AvailablePlan) => void;
  isCustom?: boolean;
}) {
  const basePrice = Number(plan.monthlyPrice);
  const gstPct = Number(plan.gstPercentage ?? 18);
  const gstAmt = (basePrice * gstPct) / 100;
  const finalPrice = basePrice + gstAmt;

  return (
    <article className={cn(
      "rounded-xl border bg-white p-6 shadow-xs flex flex-col justify-between transition-all relative overflow-hidden",
      isCurrent ? "border-emerald-500 ring-2 ring-emerald-500/20" : isCustom ? "border-purple-300 bg-purple-50/20" : "border-slate-200 hover:border-slate-300"
    )}>
      {isCurrent ? (
        <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-lg">
          ACTIVE PLAN
        </div>
      ) : null}

      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase text-slate-500">{plan.planNumber ?? plan.code}</span>
          {isCustom ? (
            <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">CUSTOM</span>
          ) : null}
        </div>
        <h3 className="mt-1 text-xl font-extrabold text-slate-950">{plan.name}</h3>
        {plan.description ? <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">{plan.description}</p> : null}

        <div className="mt-4 border-y py-3 my-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-950">{currency(finalPrice)}</span>
            <span className="text-xs font-medium text-slate-500">/ Month</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Base: {currency(basePrice)} + GST ({gstPct}%): {currency(gstAmt)}
          </div>
        </div>

        <div className="space-y-2 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{plan.waiterLimit ?? "-"} Waiters Allowed</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{plan.kitchenLimit ?? "-"} Kitchen Staff Allowed</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{plan.receptionistLimit ?? "-"} Receptionists Allowed</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t">
        <button
          type="button"
          onClick={() => onViewDetails(plan)}
          className="w-full rounded-lg py-2.5 px-4 text-xs font-bold transition-all text-center bg-slate-950 text-white hover:bg-slate-800 shadow-sm"
        >
          View Details
        </button>
      </div>
    </article>
  );
}

export function RestaurantAdminAuditLogsPage() {
  const [params, setParams] = useState({ page: 1, limit: 20, search: "", module: "", action: "" });
  const queryParams = useMemo(() => Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value || undefined])), [params]);
  const { data, isLoading, isError, refetch } = useRestaurantAdminAuditLogs(queryParams);
  return <LogTable title="Audit Logs" params={params} setParams={setParams} data={data?.data} isLoading={isLoading} isError={isError} onRetry={() => refetch()} />;
}

export function RestaurantAdminNotificationsPage() {
  const [params, setParams] = useState({ page: 1, limit: 10, status: "all" });
  const queryParams = useMemo(() => ({ ...params, status: params.status || undefined }), [params]);
  const { data, isLoading, isError, refetch } = useRestaurantAdminNotifications(queryParams);
  const readOne = useReadRestaurantAdminNotification();
  const readAll = useReadAllRestaurantAdminNotifications();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`${data?.meta?.unread ?? 0} unread notifications.`}
        actions={
          <button
            type="button"
            onClick={() => readAll.mutate()}
            disabled={readAll.isPending}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            {readAll.isPending ? "Updating..." : "Mark all read"}
          </button>
        }
      />

      <FilterCard
        title="Notification Filters"
        activeCount={params.status === "all" ? 0 : 1}
        chips={params.status === "all" ? [] : [{ key: "status", label: "Status", value: params.status, onRemove: () => setParams((prev) => ({ ...prev, status: "all", page: 1 })) }]}
        onClear={() => setParams((prev) => ({ ...prev, status: "all", page: 1 }))}
      >
        <FilterSelect
          value={params.status}
          onChange={(status) => setParams((prev) => ({ ...prev, status, page: 1 }))}
          label="Filter Status"
          options={[
            { value: "all", label: "All Notifications" },
            { value: "unread", label: "Unread Only" },
            { value: "read", label: "Read Only" },
          ]}
        />
      </FilterCard>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState message="Unable to load notifications." onRetry={() => refetch()} />
      ) : !(data?.data ?? []).length ? (
        <EmptyState title="No notifications" description="Restaurant notifications will appear here." />
      ) : (
        <div className="space-y-3">
          {(data?.data ?? []).map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "rounded-xl border p-4 shadow-xs transition-all flex items-start justify-between gap-4",
                notification.isRead
                  ? "bg-white text-slate-800"
                  : "bg-blue-50/40 border-blue-200 border-l-4 border-l-blue-600"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {!notification.isRead ? (
                    <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                  ) : null}
                  <h4 className={cn("text-sm font-bold", notification.isRead ? "text-slate-800" : "text-slate-950")}>
                    {notification.title}
                  </h4>
                </div>
                <p className="mt-1 text-sm text-slate-700 leading-relaxed">{notification.message}</p>
                <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span>{date(notification.createdAt)}</span>
                  {notification.entityType ? (
                    <span className="rounded-full bg-slate-100 border px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {notification.entityType}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={notification.isRead ? "READ" : "UNREAD"} />
                {!notification.isRead ? (
                  <button
                    type="button"
                    disabled={readOne.isPending}
                    onClick={() => readOne.mutate(notification.id)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          <CommonPagination
            currentPage={params.page}
            totalPages={Math.ceil((data?.meta?.total ?? 0) / params.limit) || 1}
            totalItems={data?.meta?.total}
            pageSize={params.limit}
            onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
            onPageSizeChange={(limit) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
            showPageSize
          />
        </div>
      )}
    </div>
  );
}

function LogTable({ title, params, setParams, data, isLoading, isError, onRetry }: { title: string; params: { search: string }; setParams: (value: never) => void; data?: Array<{ id: string; createdAt: string; actorRole: string; action: string; module: string; description?: string | null; ipAddress?: string | null }>; isLoading: boolean; isError: boolean; onRetry?: () => void }) {
  const hasSearch = Boolean(params.search);
  return (
    <div className="space-y-6">
      <PageHeader title={title} description="Tenant-scoped administrative and system activity." />
      <FilterCard
        title="Audit Filters"
        activeCount={hasSearch ? 1 : 0}
        chips={hasSearch ? [{ key: "search", label: "Search", value: params.search, onRemove: () => setParams({ ...params, search: "" } as never) }] : []}
        onClear={() => setParams({ ...params, search: "" } as never)}
      >
        <FilterSearchInput value={params.search} onChange={(search) => setParams({ ...params, search } as never)} placeholder="Search logs..." />
      </FilterCard>
      {isLoading ? <LoadingSkeleton /> : isError ? <ErrorState message="Unable to load logs." onRetry={onRetry} /> : !(data ?? []).length ? <EmptyState title="No logs found" description="Activity will appear here as the restaurant is used." /> : (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Date & Time</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Module</th><th className="p-3">Description</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{(data ?? []).map((log) => <tr key={log.id}><td className="p-3">{date(log.createdAt)}</td><td className="p-3">{log.actorRole}</td><td className="p-3 font-medium">{log.action}</td><td className="p-3">{log.module}</td><td className="p-3">{log.description ?? "-"}</td><td className="p-3">{log.ipAddress ?? "-"}</td><td className="p-3"><StatusBadge status="SUCCESS" /></td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
}

function Filters({ params, setParams, roleFilter, billFilter }: { params: Record<string, string | number>; setParams: (value: never) => void; roleFilter?: boolean; billFilter?: boolean }) {
  const [searchTerm, setSearchTerm] = useState(String(params.search ?? ""));
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearch !== (params.search ?? "")) {
      setParams({ ...params, search: debouncedSearch, page: 1 } as never);
    }
  }, [debouncedSearch]);

  const chips: ActiveFilterChip[] = [
    searchTerm ? { key: "search", label: "Search", value: searchTerm, onRemove: () => { setSearchTerm(""); setParams({ ...params, search: "", page: 1 } as never); } } : undefined,
    params.role ? { key: "role", label: "Role", value: String(params.role), onRemove: () => setParams({ ...params, role: "", page: 1 } as never) } : undefined,
    params.status ? { key: "status", label: "Status", value: String(params.status), onRemove: () => setParams({ ...params, status: "", page: 1 } as never) } : undefined,
    params.paymentStatus ? { key: "paymentStatus", label: "Payment", value: String(params.paymentStatus), onRemove: () => setParams({ ...params, paymentStatus: "", page: 1 } as never) } : undefined,
    params.paymentMethod ? { key: "paymentMethod", label: "Method", value: String(params.paymentMethod), onRemove: () => setParams({ ...params, paymentMethod: "", page: 1 } as never) } : undefined,
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip));

  function clearFilters() {
    setSearchTerm("");
    setParams({ ...params, search: "", role: "", status: "", paymentStatus: "", paymentMethod: "", page: 1 } as never);
  }

  return (
    <FilterCard title="Filters" activeCount={chips.length} chips={chips} onClear={clearFilters}>
      <FilterSearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search..." />
      {roleFilter ? <FilterSelect value={String(params.role ?? "")} onChange={(role) => setParams({ ...params, role, page: 1 } as never)} label="Role" options={[{ value: "", label: "All roles" }, { value: "RECEPTION", label: "Receptionist" }, { value: "WAITER", label: "Waiter" }, { value: "KITCHEN", label: "Kitchen Admin" }]} /> : null}
      {roleFilter ? <FilterSelect value={String(params.status ?? "")} onChange={(status) => setParams({ ...params, status, page: 1 } as never)} label="Status" options={[{ value: "", label: "All statuses" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }, { value: "BLOCKED", label: "Blocked" }]} /> : null}
      {billFilter ? <FilterSelect value={String(params.paymentStatus ?? "")} onChange={(paymentStatus) => setParams({ ...params, paymentStatus, page: 1 } as never)} label="Payment" options={[{ value: "", label: "All payments" }, { value: "SUCCESS", label: "Paid" }, { value: "PENDING", label: "Pending" }, { value: "PARTIALLY_PAID", label: "Partially Paid" }, { value: "FAILED", label: "Failed" }]} /> : null}
      {billFilter ? <FilterSelect value={String(params.paymentMethod ?? "")} onChange={(paymentMethod) => setParams({ ...params, paymentMethod, page: 1 } as never)} label="Method" options={[{ value: "", label: "All methods" }, { value: "CASH", label: "Cash" }, { value: "UPI", label: "UPI" }, { value: "CARD", label: "Card" }, { value: "OTHER", label: "Other" }]} /> : null}
    </FilterCard>
  );
}

function TextInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>;
}

function Select({ label, value, onChange, options }: { label?: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  const control = <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>;
  return label ? <label className="block text-sm font-medium text-slate-700">{label}<div className="mt-1">{control}</div></label> : control;
}
