"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Bell, CheckCheck, ChefHat, ClipboardList, Edit, Eye, Loader2, Plus, ReceiptText, RefreshCw, Send, Trash2, Upload, Utensils, X } from "lucide-react";
import { CommonModal } from "@/components/common/modal";
import { DashboardDateFilter } from "@/components/dashboard/dashboard-date-filter";
import {
  ActivityTimeline,
  AnalyticsPanel,
  DonutAnalytics,
  MetricStrip,
  OccupancyAnalytics,
  ResponsiveBarAnalytics,
  type ChartDatum,
} from "@/components/dashboard/analytics-widgets";
import { FilterCard, FilterSearchInput, FilterSelect, type ActiveFilterChip } from "@/components/common/filters";
import { CommonPagination } from "@/components/common/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils/cn";
import { useDebounce } from "@/hooks/use-debounce";
import { useDashboardDateFilter } from "@/hooks/use-dashboard-date-filter";
import { extractApiError, getImageUrl } from "@/lib/api/client";
import {
  useCategories,
  useAddOrderItems,
  useAssignTable,
  useCreateOrder,
  useCreateCategory,
  useCreateMenuItem,
  useCreateTable,
  useDeleteTable,
  useDeleteMenuItem,
  useKitchenOrders,
  useMenu,
  useOrderDetail,
  usePayBill,
  useReadAllStaffNotifications,
  useReadStaffNotification,
  useSendOrderToBilling,
  useStaffBillDetail,
  useServeOrder,
  useStaffBills,
  useStaffDashboard,
  useStaffNotifications,
  useStaffOrders,
  useTableDetail,
  useUpdateKitchenOrderStatus,
  useUpdateMenuItem,
  useUploadMenuImage,
  useTables,
} from "./hooks";
import type { BillDetail, BillRow, MenuRow, OrderRow, StaffNotification, TableRow } from "./api";

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Card({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-slate-500">
        <p className="text-sm font-medium">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function WaiterDashboardPage() {
  const dateFilter = useDashboardDateFilter();
  const { data, isLoading, isFetching, isError, refetch } = useStaffDashboard(dateFilter.apiParams);
  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState message="Unable to load waiter dashboard." onRetry={() => refetch()} />;
  const dashboard = data.data;
  return (
    <DashboardShell
      title="Waiter Dashboard"
      filter={<DashboardDateFilter value={dateFilter.filter} onChange={dateFilter.setFilter} onReset={dateFilter.resetFilter} isLoading={isFetching} />}
      cards={[
        ["Assigned Tables", dashboard.tables.active],
        ["Occupied Tables", dashboard.tables.occupied],
        ["Open Orders", dashboard.orders.pendingOrders],
        ["Pending Kitchen Orders", dashboard.orders.pendingOrders],
        ["Completed Orders", dashboard.orders.completedOrders],
        ["Today's Orders", dashboard.orders.todayOrders],
      ]}
      orders={dashboard.recentOrders}
    />
  );
}

export function ReceptionistDashboardPage() {
  const dateFilter = useDashboardDateFilter();
  const { data, isLoading, isFetching, isError, refetch } = useStaffDashboard(dateFilter.apiParams);
  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState message="Unable to load receptionist dashboard." onRetry={() => refetch()} />;
  const dashboard = data.data;
  return (
    <DashboardShell
      title="Receptionist Dashboard"
      filter={<DashboardDateFilter value={dateFilter.filter} onChange={dateFilter.setFilter} onReset={dateFilter.resetFilter} isLoading={isFetching} />}
      cards={[
        ["Today's Bills", dashboard.bills.todayBills],
        ["Today's Sales", currency(dashboard.bills.todaySales)],
        ["Pending Bills", dashboard.bills.pendingBills],
        ["Paid Bills", dashboard.bills.paidBills],
        ["Today's Orders", dashboard.orders.todayOrders],
        ["Available Tables", dashboard.tables.available],
      ]}
      bills={dashboard.recentBills}
    />
  );
}

const tableStatuses = ["AVAILABLE", "OCCUPIED", "BILL_PENDING", "PAYMENT_PENDING"] as const;

function tableDisplayStatus(table: TableRow) {
  if (table.activePaymentStatus && table.activePaymentStatus !== "SUCCESS") return "PAYMENT_PENDING";
  if (table.activeBillNumber) return "BILL_PENDING";
  return table.status;
}

function buildTableFilterChips(search: string, status: string, capacity: string, actions: { clearSearch: () => void; clearStatus: () => void; clearCapacity: () => void }) {
  return [
    search ? { key: "search", label: "Search", value: search, onRemove: actions.clearSearch } : undefined,
    status ? { key: "status", label: "Status", value: status, onRemove: actions.clearStatus } : undefined,
    capacity ? { key: "capacity", label: "Capacity", value: capacity, onRemove: actions.clearCapacity } : undefined,
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip));
}

export function ReceptionistTablesPage() {
  const { data, isLoading, isError, refetch, isFetching } = useTables();
  const createTable = useCreateTable();
  const deleteTable = useDeleteTable();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("");
  const [detailId, setDetailId] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<TableRow | null>(null);
  const [tableFormOpen, setTableFormOpen] = useState(false);
  const [form, setForm] = useState({ tableNumber: "", capacity: "4" });
  const detail = useTableDetail(detailId);

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load tables." onRetry={() => refetch()} />;

  const rows = data?.data ?? [];
  const filtered = rows.filter((table) => {
    const matchesSearch = !search || table.tableNumber.toLowerCase().includes(search.toLowerCase()) || table.customerName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || tableDisplayStatus(table) === statusFilter;
    const matchesCapacity = !capacityFilter || Number(table.capacity ?? 0) >= Number(capacityFilter);
    return matchesSearch && matchesStatus && matchesCapacity;
  });
  const stats = {
    total: rows.length,
    available: rows.filter((table) => table.status === "AVAILABLE").length,
    occupied: rows.filter((table) => tableDisplayStatus(table) === "OCCUPIED").length,
    billPending: rows.filter((table) => tableDisplayStatus(table) === "BILL_PENDING").length,
    paymentPending: rows.filter((table) => tableDisplayStatus(table) === "PAYMENT_PENDING").length,
  };

  function openCreate() {
    setForm({ tableNumber: "", capacity: "4" });
    setTableFormOpen(true);
  }

  async function handleSaveTable() {
    if (!form.tableNumber.trim()) {
      toast.error("Table number is required.");
      return;
    }
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      toast.error("Capacity must be a positive number.");
      return;
    }
    try {
      await createTable.mutateAsync({ tableNumber: form.tableNumber.trim(), capacity });
      toast.success(`Table ${form.tableNumber} created successfully.`);
      setTableFormOpen(false);
      setForm({ tableNumber: "", capacity: "4" });
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTable.mutateAsync(deleteTarget.id);
      toast.success(`Table ${deleteTarget.tableNumber} deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Table Management"
        description="Manage restaurant seating from the same table data used by waiters."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Add Table
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Card label="Total Tables" value={stats.total} icon={<ClipboardList className="h-4 w-4" />} />
        <Card label="Available" value={stats.available} icon={<ClipboardList className="h-4 w-4" />} />
        <Card label="Occupied" value={stats.occupied} icon={<ClipboardList className="h-4 w-4" />} />
        <Card label="Bill Pending" value={stats.billPending} icon={<ReceiptText className="h-4 w-4" />} />
        <Card label="Payment Pending" value={stats.paymentPending} icon={<ReceiptText className="h-4 w-4" />} />
      </div>

      <FilterCard
        title="Table Filters"
        activeCount={[search, statusFilter, capacityFilter].filter(Boolean).length}
        chips={buildTableFilterChips(search, statusFilter, capacityFilter, {
          clearSearch: () => setSearch(""),
          clearStatus: () => setStatusFilter(""),
          clearCapacity: () => setCapacityFilter(""),
        })}
        onClear={() => { setSearch(""); setStatusFilter(""); setCapacityFilter(""); }}
      >
        <FilterSearchInput value={search} onChange={setSearch} placeholder="Search table or customer..." />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="Status" options={[{ value: "", label: "All statuses" }, ...tableStatuses.map((status) => ({ value: status, label: status }))]} />
        <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          Min Capacity
          <input type="number" value={capacityFilter} onChange={(e) => setCapacityFilter(e.target.value)} placeholder="Any" className="heritage-input mt-1 h-10 w-full rounded-xl px-3 text-sm font-normal normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-36" />
        </label>
      </FilterCard>

      {!rows.length ? (
        <EmptyState title="No tables created yet." description="Create your first table to start managing restaurant seating." />
      ) : !filtered.length ? (
        <EmptyState title="No matching tables" description="Adjust search or filters to find tables." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((table) => (
            <div key={table.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Table</p>
                  <h2 className="text-xl font-semibold">{table.tableNumber}</h2>
                  <p className="text-sm text-slate-500">Capacity: {table.capacity ?? "-"}</p>
                </div>
                <StatusBadge status={tableDisplayStatus(table)} />
              </div>
              {table.customerName || table.activeOrderNumber ? (
                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                  <p><span className="text-slate-500">Customer:</span> {table.customerName ?? "-"}</p>
                  <p><span className="text-slate-500">Phone:</span> {table.customerPhone ?? "-"}</p>
                  <p><span className="text-slate-500">Order:</span> {table.activeOrderNumber ?? "-"} {table.activeOrderStatus ? `(${table.activeOrderStatus})` : ""}</p>
                  <p><span className="text-slate-500">Bill:</span> {table.activeBillNumber ?? "-"} {table.activePaymentStatus ? `(${table.activePaymentStatus})` : ""}</p>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button onClick={() => setDetailId(table.id)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"><Eye className="h-3.5 w-3.5" /> View</button>
                <button onClick={() => setDeleteTarget(table)} disabled={Boolean(table.activeOrderId)} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CommonModal isOpen={tableFormOpen} onClose={() => { setTableFormOpen(false); setForm({ tableNumber: "", capacity: "4" }); }} onConfirm={handleSaveTable} title="Add Table" description="New tables are created as AVAILABLE. Occupancy is controlled by waiter seating and payment completion." confirmText="Create Table" isConfirming={createTable.isPending}>
        <div className="space-y-3">
          <input value={form.tableNumber} onChange={(e) => setForm({ ...form, tableNumber: e.target.value })} placeholder="Table number, e.g. T-04" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Capacity" className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
      </CommonModal>

      <CommonModal isOpen={Boolean(detailId)} onClose={() => setDetailId(undefined)} title="Table Details" showFooter={false} size="xl">
        {detail.isLoading ? <LoadingSkeleton /> : detail.isError ? <ErrorState message="Unable to load table details." onRetry={() => detail.refetch()} /> : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-xs text-slate-500">Table</p><p className="font-semibold">{detail.data?.data.tableNumber}</p></div>
              <div><p className="text-xs text-slate-500">Capacity</p><p className="font-semibold">{detail.data?.data.capacity}</p></div>
              <div><p className="text-xs text-slate-500">Status</p><StatusBadge status={detail.data?.data ? tableDisplayStatus(detail.data.data) : "AVAILABLE"} /></div>
            </div>
            {detail.data?.data.activeOrder ? (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">{detail.data.data.activeOrder.orderNumber}</h3>
                <p className="text-sm text-slate-600">{detail.data.data.activeOrder.customer ?? "-"} | {detail.data.data.activeOrder.customerPhone ?? "-"}</p>
                <p className="mt-1 text-sm text-slate-600">Payment: {detail.data.data.activeOrder.paymentStatus ?? "PENDING"}</p>
                <div className="mt-3 space-y-2">
                  {detail.data.data.activeOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between border-b pb-2 text-sm last:border-0">
                      <span>{item.itemName} x {item.quantity}</span>
                      <span>{currency(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-right font-semibold">{currency(detail.data.data.activeOrder.grandTotal)}</p>
              </div>
            ) : <EmptyState title="No active order" description="This table has no active customer order." />}
          </div>
        )}
      </CommonModal>

      <CommonModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Table?" description={deleteTarget ? `Are you sure you want to delete Table ${deleteTarget.tableNumber}?` : undefined} confirmText="Delete" variant="danger" isConfirming={deleteTable.isPending} />
    </div>
  );
}

export function KitchenDashboardPage() {
  const router = useRouter();
  const dateFilter = useDashboardDateFilter();
  const { data, isLoading, isError, error, refetch, isFetching } = useKitchenOrders();
  const dashboard = useStaffDashboard(dateFilter.apiParams);
  const notifications = useStaffNotifications({ limit: 20 });
  const readNotification = useReadStaffNotification();
  const updateStatus = useUpdateKitchenOrderStatus();
  const [popups, setPopups] = useState<StaffNotification[]>([]);
  const seenNotificationIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const rows = notifications.data?.data ?? [];
    if (!seenNotificationIds.current) {
      seenNotificationIds.current = new Set(rows.map((notification) => notification.id));
      return;
    }
    const newKitchenOrders = rows.filter((notification) => {
      const isNew = !seenNotificationIds.current!.has(notification.id);
      seenNotificationIds.current!.add(notification.id);
      return isNew && !notification.isRead && notification.entityType === "order" && notification.type.startsWith("KITCHEN_");
    });
    if (!newKitchenOrders.length) return;
    setPopups((current) => {
      const byId = new Map(current.map((notification) => [notification.id, notification]));
      for (const notification of newKitchenOrders) byId.set(notification.id, notification);
      return Array.from(byId.values()).slice(-5);
    });
    for (const notification of newKitchenOrders) toast.success(notification.title);
  }, [notifications.data]);

  async function openKitchenNotification(notification: StaffNotification) {
    try {
      if (!notification.isRead) await readNotification.mutateAsync(notification.id);
      setPopups((current) => current.filter((item) => item.id !== notification.id));
      if (notification.entityType === "order" && notification.entityId) router.push(`/kitchen/orders/${notification.entityId}`);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }
  if (isLoading) return <LoadingSkeleton />;
  const orders = data?.data ?? [];
  const dashboardData = dashboard.data?.data;
  const groups = ["PLACED", "PREPARING", "READY"];
  const statusRows: ChartDatum[] = groups.map((status) => ({ status, value: orders.filter((order) => order.status === status).length }));
  const kitchenActivity = orders.slice(0, 6).map((order) => ({
    id: order.id,
    title: order.orderNumber,
    subtitle: `Table ${order.table ?? "-"} | ${order.customer ?? "Walk-in"} | ${order.status}`,
    value: `${order.itemCount ?? 0} items`,
    time: new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(order.createdAt)),
  }));
  const orderError = isError ? extractApiError(error).message : "";
  const notificationError = notifications.isError ? extractApiError(notifications.error).message : "";
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kitchen Dashboard"
        description={`Live kitchen order board. ${notifications.data?.meta?.unread ?? 0} unread notifications.`}
        actions={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <DashboardDateFilter value={dateFilter.filter} onChange={dateFilter.setFilter} onReset={dateFilter.resetFilter} isLoading={dashboard.isFetching} />
            <button onClick={() => router.push("/kitchen/notifications")} className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <Bell className="h-4 w-4" /> {notifications.data?.meta?.unread ?? 0}
            </button>
          </div>
        }
      />
      <MetricStrip items={[
        { label: "Orders Received", value: dashboardData?.orders.todayOrders ?? orders.length, hint: "selected period", tone: "blue" },
        { label: "Preparing", value: orders.filter((order) => order.status === "PREPARING").length, hint: "live queue", tone: "amber" },
        { label: "Ready", value: dashboardData?.orders.readyOrders ?? orders.filter((order) => order.status === "READY").length, hint: "awaiting service", tone: "green" },
        { label: "Served", value: dashboardData?.orders.completedOrders ?? orders.filter((order) => order.status === "COMPLETED").length, hint: "completed orders", tone: "slate" },
      ]} />
      {orderError || notificationError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {orderError ? <p>Kitchen orders API: {orderError}</p> : null}
          {notificationError ? <p>Notifications API: {notificationError}</p> : null}
          <button onClick={() => { refetch(); notifications.refetch(); }} className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white">Retry</button>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPanel title="Kitchen Status Distribution" subtitle="Live order queue split by preparation state.">
          <DonutAnalytics data={statusRows} nameKey="status" valueKey="value" centerLabel="Queue" centerValue={orders.length} emptyMessage="No kitchen orders are available right now." />
        </AnalyticsPanel>
        <AnalyticsPanel title="Live Kitchen Activity" subtitle="Most recent orders in the kitchen queue.">
          <ActivityTimeline rows={kitchenActivity} />
        </AnalyticsPanel>
      </div>
      {popups.length ? (
        <div className="fixed right-4 top-20 z-50 w-[min(360px,calc(100vw-2rem))] space-y-3">
          {popups.map((notification) => {
            const order = orders.find((row) => row.id === notification.entityId);
            return (
              <div key={notification.id} className="rounded-lg border border-amber-200 bg-white p-4 shadow-xl ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700"><Utensils className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-950">{notification.title}</p>
                      <button onClick={() => setPopups((current) => current.filter((item) => item.id !== notification.id))} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close notification">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    <p className="mt-2 text-xs text-slate-500">Table {order?.table ?? "-"} | {order?.itemCount ?? 0} items | {date(notification.createdAt)}</p>
                    <button onClick={() => openKitchenNotification(notification)} className="mt-3 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">View Order</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-3">
        {groups.map((status) => (
          <section key={status} className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="font-semibold">{status}{isFetching ? <span className="ml-2 text-xs font-normal text-slate-400">syncing</span> : null}</h2>
            <div className="mt-3 space-y-3">
              {orders
                .filter((order) => order.status === status)
                .map((order) => (
                  <div key={order.id} className="rounded-lg border p-3">
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-slate-600">Table {order.table ?? "-"} • {order.customer ?? "Walk-in"}</p>
                    <p className="mt-1 text-xs text-slate-500">{date(order.createdAt)}</p>
                    <button onClick={() => router.push(`/kitchen/orders/${order.id}`)} className="mt-3 rounded-lg border px-3 py-1.5 text-xs font-semibold">View Order</button>
                    {status === "PLACED" ? (
                      <button onClick={() => updateStatus.mutate({ id: order.id, status: "PREPARING" })} className="ml-2 mt-3 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Accept</button>
                    ) : null}
                    {status === "PREPARING" ? (
                      <button onClick={() => updateStatus.mutate({ id: order.id, status: "READY" })} className="ml-2 mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Mark Ready</button>
                    ) : null}
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ReceptionistBillsPage() {
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, isError, refetch } = useStaffBills({
    limit: 50,
    search: debouncedSearch || undefined,
    paymentStatus: paymentStatus || undefined,
  });
  const payBill = usePayBill();
  const [paymentBill, setPaymentBill] = useState<BillRow | null>(null);
  const [method, setMethod] = useState("CASH");

  async function handlePayment() {
    if (!paymentBill) return;
    try {
      await payBill.mutateAsync({ id: paymentBill.id, input: { amount: paymentBill.grandTotal, method } });
      toast.success("Payment completed successfully.");
      setPaymentBill(null);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bills & Invoices" description="Manage restaurant billing, view tax invoices, and process customer payments." />
      
      <FilterCard
        title="Bill Filters"
        activeCount={[search, paymentStatus].filter(Boolean).length}
        chips={[
          search ? { key: "search", label: "Search", value: search, onRemove: () => setSearch("") } : undefined,
          paymentStatus ? { key: "paymentStatus", label: "Payment", value: paymentStatus, onRemove: () => setPaymentStatus("") } : undefined,
        ].filter((chip): chip is ActiveFilterChip => Boolean(chip))}
        onClear={() => { setSearch(""); setPaymentStatus(""); }}
      >
        <FilterSearchInput value={search} onChange={setSearch} placeholder="Search invoice no, customer, phone, or table..." />
        <FilterSelect value={paymentStatus} onChange={setPaymentStatus} label="Payment" options={[{ value: "", label: "All payment status" }, { value: "PENDING", label: "Pending" }, { value: "SUCCESS", label: "Paid" }]} />
        <button
          onClick={() => refetch()}
          className="heritage-button-secondary inline-flex h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </FilterCard>

      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState message="Unable to load bills." onRetry={() => refetch()} />
      ) : (
        <BillsTable rows={data?.data ?? []} onPay={(bill) => setPaymentBill(bill)} />
      )}

      <CommonModal
        isOpen={Boolean(paymentBill)}
        onClose={() => setPaymentBill(null)}
        onConfirm={handlePayment}
        title="Collect Payment"
        description={paymentBill ? `Invoice ${paymentBill.billNumber} | Customer: ${paymentBill.customer ?? "Walk-in"} | Total: ${currency(paymentBill.grandTotal)}` : undefined}
        confirmText="Collect Payment"
        isConfirming={payBill.isPending}
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Payment Method *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 font-semibold"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NET_BANKING">Net Banking</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Amount Due:</span>
              <span className="font-bold text-slate-900 text-sm">{currency(paymentBill?.grandTotal ?? 0)}</span>
            </div>
            <p className="text-[11px] text-slate-500">Completing payment will automatically mark the table as AVAILABLE.</p>
          </div>
        </div>
      </CommonModal>
    </div>
  );
}

export function ReceptionistBillDetailPage({ billId }: { billId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useStaffBillDetail(billId);
  const payBill = usePayBill();
  const [method, setMethod] = useState("CASH");

  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState message="Unable to load bill invoice." onRetry={() => refetch()} />;
  const bill = data.data;

  async function handlePayment() {
    try {
      await payBill.mutateAsync({ id: bill.id, input: { amount: bill.remainingAmount || bill.grandTotal, method } });
      toast.success("Payment completed successfully.");
      refetch();
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .tax-invoice, .tax-invoice * { visibility: visible !important; }
          .tax-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
      <PageHeader
        title="Tax Invoice"
        description={`${bill.billNumber} | Status: ${bill.paymentStatus === "SUCCESS" ? "PAID" : "PENDING"}`}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/receptionist/bills")}
              className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Back to Bills
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              <ReceiptText className="h-4 w-4" /> Print Bill
            </button>
          </div>
        }
      />
      <TaxInvoice bill={bill} />
      {bill.paymentStatus === "SUCCESS" ? (
        <div className="no-print mx-auto max-w-4xl rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800 shadow-sm">
          ✓ Payment Completed. Invoice is fully settled and Table {bill.table ? `T-${bill.table}` : ""} is now AVAILABLE.
        </div>
      ) : (
        <div className="no-print mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Collect Customer Payment</h2>
              <p className="text-xs text-slate-500">Record customer payment to settle invoice and release the table.</p>
            </div>
            <StatusBadge status="PENDING" />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1 min-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-slate-950"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="NET_BANKING">Net Banking</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Amount Due</p>
              <p className="text-xl font-extrabold text-slate-900">{currency(bill.remainingAmount || bill.grandTotal)}</p>
            </div>
            <button
              onClick={handlePayment}
              disabled={payBill.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
            >
              Collect Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TaxInvoice({ bill }: { bill: BillDetail }) {
  const restaurantAddress = [
    bill.restaurantAddressLine1,
    bill.restaurantAddressLine2,
    bill.restaurantAddress,
    bill.restaurantCity,
    bill.restaurantState,
    bill.restaurantCountry,
    bill.restaurantPostalCode,
  ].filter(Boolean).join(", ");

  const subtotal = bill.subtotal;
  const discountTotal = bill.discountTotal;
  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const taxTotal = bill.taxTotal;
  const cgstAmount = taxTotal / 2;
  const sgstAmount = taxTotal / 2;

  return (
    <div className="tax-invoice mx-auto max-w-4xl rounded-xl border border-slate-300 bg-white p-8 text-slate-900 shadow-sm print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-300 pb-2 text-xs font-semibold text-slate-600">
        <span>Page No. 1 of 1</span>
        <span className="text-sm font-bold uppercase text-slate-900 tracking-wider">TAX INVOICE</span>
        <span>Original Copy</span>
      </div>

      {/* Restaurant Info Header */}
      <div className="py-5 text-center border-b border-slate-300">
        <h1 className="text-2xl font-extrabold uppercase tracking-wide text-slate-900">
          {bill.restaurantLegalName || bill.restaurantName || "RESTAURANT NAME"}
        </h1>
        <p className="mx-auto mt-1 max-w-xl text-xs font-medium text-slate-600">
          {restaurantAddress || "Restaurant Address"}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-700 font-medium">
          {bill.restaurantPhone && <span>Phone: {bill.restaurantPhone}</span>}
          {bill.restaurantTaxNumber && <span>GSTIN / Tax No: {bill.restaurantTaxNumber}</span>}
          <span>PAN: N/A</span>
        </div>
      </div>

      {/* Billing & Invoice Details Grid */}
      <div className="grid grid-cols-2 gap-6 border-b border-slate-300 py-4 text-xs">
        {/* Billing Details */}
        <div className="space-y-1.5">
          <h2 className="font-bold uppercase text-slate-800 tracking-wider text-[11px] mb-2 border-b pb-1 border-slate-200">
            Billing Details
          </h2>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <span className="text-slate-500">Customer Name:</span>
            <span className="font-semibold">{bill.customer ?? "Walk-in"}</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <span className="text-slate-500">Phone:</span>
            <span className="font-medium">{bill.customerPhone ?? "-"}</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <span className="text-slate-500">Address:</span>
            <span className="font-medium">{bill.customerAddress ?? "-"}</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <span className="text-slate-500">GSTIN:</span>
            <span className="font-medium">-</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1">
            <span className="text-slate-500">Table No.:</span>
            <span className="font-bold text-slate-900">{bill.table ? `T-${bill.table}` : "-"}</span>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="space-y-1.5 border-l border-slate-200 pl-6">
          <h2 className="font-bold uppercase text-slate-800 tracking-wider text-[11px] mb-2 border-b pb-1 border-slate-200">
            Invoice Details
          </h2>
          <div className="grid grid-cols-[110px_1fr] gap-1">
            <span className="text-slate-500">Invoice No.:</span>
            <span className="font-bold font-mono text-slate-900">{bill.billNumber}</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-1">
            <span className="text-slate-500">Invoice Date:</span>
            <span className="font-medium">{new Date(bill.createdAt).toLocaleDateString("en-IN")}</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-1">
            <span className="text-slate-500">Invoice Time:</span>
            <span className="font-medium">{new Date(bill.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-1">
            <span className="text-slate-500">Due Date:</span>
            <span className="font-medium">{new Date(bill.createdAt).toLocaleDateString("en-IN")}</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-1">
            <span className="text-slate-500">Place of Supply:</span>
            <span className="font-medium">{bill.restaurantState ?? "State"}</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-1">
            <span className="text-slate-500">Reverse Charge:</span>
            <span className="font-medium">N/A</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] gap-1">
            <span className="text-slate-500">Payment Status:</span>
            <span className={`font-bold uppercase ${bill.paymentStatus === "SUCCESS" ? "text-emerald-600" : "text-amber-600"}`}>
              {bill.paymentStatus === "SUCCESS" ? "PAID" : "PENDING"}
            </span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-5 overflow-hidden">
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-bold">
              <th className="border border-slate-300 p-2 text-center w-10">Sr.</th>
              <th className="border border-slate-300 p-2 text-left">Item Description</th>
              <th className="border border-slate-300 p-2 text-center w-20">HSN/SAC</th>
              <th className="border border-slate-300 p-2 text-center w-12">Qty.</th>
              <th className="border border-slate-300 p-2 text-center w-14">Unit</th>
              <th className="border border-slate-300 p-2 text-right w-20">List Price</th>
              <th className="border border-slate-300 p-2 text-right w-20">Discount</th>
              <th className="border border-slate-300 p-2 text-right w-16">Tax %</th>
              <th className="border border-slate-300 p-2 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bill.items.map((item, idx) => (
              <tr key={item.id} className="text-slate-800">
                <td className="border border-slate-300 p-2 text-center font-medium">{idx + 1}</td>
                <td className="border border-slate-300 p-2 font-semibold">{item.itemName}</td>
                <td className="border border-slate-300 p-2 text-center text-slate-500">
                  {item.itemCode ?? "-"}
                </td>
                <td className="border border-slate-300 p-2 text-center font-bold">{item.quantity}</td>
                <td className="border border-slate-300 p-2 text-center text-slate-600">Pcs</td>
                <td className="border border-slate-300 p-2 text-right">{currency(item.unitPrice)}</td>
                <td className="border border-slate-300 p-2 text-right">{currency(item.discountAmount)}</td>
                <td className="border border-slate-300 p-2 text-right">{item.taxRate}%</td>
                <td className="border border-slate-300 p-2 text-right font-bold">{currency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Totals & Summary */}
      <div className="mt-5 flex justify-end">
        <div className="w-full max-w-sm rounded-lg border border-slate-300 p-4 text-xs space-y-2 bg-slate-50/50">
          <div className="flex justify-between text-slate-700">
            <span>Subtotal</span>
            <span className="font-semibold">{currency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Discount</span>
            <span className="font-semibold">{currency(discountTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-800 font-medium border-t border-slate-200 pt-1.5">
            <span>Taxable Amount</span>
            <span>{currency(taxableAmount)}</span>
          </div>
          {taxTotal > 0 ? (
            <>
              <div className="flex justify-between text-slate-600 text-[11px] pl-2">
                <span>CGST</span>
                <span>{currency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px] pl-2">
                <span>SGST</span>
                <span>{currency(sgstAmount)}</span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between text-slate-700">
            <span>Tax Total</span>
            <span className="font-semibold">{currency(taxTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Other Charges</span>
            <span>₹0.00</span>
          </div>
          <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-extrabold text-slate-900">
            <span>Grand Total</span>
            <span>{currency(bill.grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StaffOrdersPage() {
  const { data, isLoading, isError, refetch } = useStaffOrders({ limit: 50 });
  const serveOrder = useServeOrder();
  const sendToBilling = useSendOrderToBilling();
  const addItems = useAddOrderItems();
  const { data: menuData } = useMenu();
  const [addTarget, setAddTarget] = useState<OrderRow | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load orders." onRetry={() => refetch()} />;
  async function handleServe(order: OrderRow) {
    try {
      await serveOrder.mutateAsync(order.id);
      toast.success("Order marked as served.");
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }
  async function handleBilling(order: OrderRow) {
    try {
      await sendToBilling.mutateAsync(order.id);
      toast.success("Order sent to billing.");
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }
  async function handleAddItems() {
    if (!addTarget) return;
    const items = Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (!items.length) {
      toast.error("Select at least one food item.");
      return;
    }
    try {
      await addItems.mutateAsync({ id: addTarget.id, input: { items } });
      toast.success("Additional items sent to kitchen.");
      setCart({});
      setAddTarget(null);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }
  return (
    <>
      <OrdersTable rows={data?.data ?? []} onServe={handleServe} onSendToBilling={handleBilling} onAddItems={(order) => setAddTarget(order)} />
      <CommonModal isOpen={Boolean(addTarget)} onClose={() => setAddTarget(null)} onConfirm={handleAddItems} title="Add Items" description="New items are appended to this active order and sent back to kitchen." confirmText="Send New Items" isConfirming={addItems.isPending} size="xl">
        <MenuPicker rows={menuData?.data ?? []} cart={cart} setCart={setCart} />
      </CommonModal>
    </>
  );
}

export function WaiterTablesPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useTables();
  const assignTable = useAssignTable();
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customer, setCustomer] = useState({ customerName: "", customerPhone: "", numberOfGuests: "" });

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load restaurant tables." onRetry={() => refetch()} />;
  const tables = data?.data ?? [];
  const selectedTables = tables.filter((t) => selectedTableIds.includes(t.id));

  function toggleTableSelection(table: TableRow) {
    if (table.status !== "AVAILABLE") return;
    setSelectedTableIds((prev) =>
      prev.includes(table.id) ? prev.filter((id) => id !== table.id) : [...prev, table.id]
    );
  }

  async function handleAssign() {
    if (!selectedTableIds.length) {
      toast.error("Please select at least one available table.");
      return;
    }
    const normalizedCustomer = {
      customerName: customer.customerName.trim().replace(/\s+/g, " "),
      customerPhone: customer.customerPhone.trim(),
      numberOfGuests: customer.numberOfGuests ? Number(customer.numberOfGuests) : undefined,
    };
    if (normalizedCustomer.customerName.length < 2) {
      toast.error("Customer name must be at least 2 characters.");
      return;
    }
    if (!/^\d{10}$/.test(normalizedCustomer.customerPhone)) {
      toast.error("Customer phone must be exactly 10 digits.");
      return;
    }
    try {
      await assignTable.mutateAsync({
        tableIds: selectedTableIds,
        customerName: normalizedCustomer.customerName,
        customerPhone: normalizedCustomer.customerPhone,
        numberOfGuests: normalizedCustomer.numberOfGuests,
      });
      toast.success(`${selectedTableIds.length} ${selectedTableIds.length === 1 ? "table" : "tables"} reserved & customer created successfully.`);
      setIsCustomerModalOpen(false);
      setSelectedTableIds([]);
      setCustomer({ customerName: "", customerPhone: "", numberOfGuests: "" });
      router.push("/waiter/customers");
    } catch (err) {
      toast.error(extractApiError(err).message);
      refetch();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables & Multi-Table Seating"
        description="Select one or multiple available tables for a customer or group, then click Continue."
      />

      {selectedTableIds.length > 0 ? (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/95 p-4 shadow-md backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
              {selectedTableIds.length} {selectedTableIds.length === 1 ? "Table Selected" : "Tables Selected"}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedTables.map((tbl) => (
                <span key={tbl.id} className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-900 border border-blue-200 shadow-2xs">
                  Table {tbl.tableNumber}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleTableSelection(tbl); }}
                    className="ml-1 text-slate-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTableIds([])}
              className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition"
            >
              Continue →
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.map((table) => {
          const isSelected = selectedTableIds.includes(table.id);
          const isAvailable = table.status === "AVAILABLE";
          return (
            <div
              key={table.id}
              onClick={() => isAvailable && toggleTableSelection(table)}
              className={cn(
                "relative rounded-xl border p-4 text-left shadow-2xs transition cursor-pointer select-none",
                isAvailable
                  ? isSelected
                    ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500 shadow-md"
                    : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm"
                  : "border-slate-200 bg-slate-50 opacity-75 cursor-not-allowed"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Table</span>
                  <h3 className="text-xl font-extrabold text-slate-900">Table {table.tableNumber}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Capacity: {table.capacity ?? "-"} Guests</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={table.status} />
                  {isAvailable ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold transition",
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {isSelected ? "✓ Selected" : "+ Select"}
                    </span>
                  ) : null}
                </div>
              </div>

              {table.customerName || (table.groupTables && table.groupTables.length > 1) ? (
                <div className="mt-3 rounded-lg bg-white/80 p-2.5 text-xs border border-slate-200 space-y-1">
                  {table.customerName && (
                    <p><span className="font-medium text-slate-500">Customer:</span> <span className="font-bold text-slate-900">{table.customerName}</span></p>
                  )}
                  {table.customerPhone && (
                    <p><span className="font-medium text-slate-500">Phone:</span> <span>{table.customerPhone}</span></p>
                  )}
                  {table.groupTables && table.groupTables.length > 1 && (
                    <p><span className="font-medium text-slate-500">Group Tables:</span> <span className="font-bold text-blue-700">{table.groupTables.map((t) => `Table ${t}`).join(", ")}</span></p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <CommonModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onConfirm={handleAssign}
        title="Customer / Group Details"
        description="Enter customer details to reserve the selected tables and start the order session."
        confirmText="Create Customer & Reserve Tables"
        isConfirming={assignTable.isPending}
      >
        <div className="space-y-4">
          <div className="rounded-xl border bg-slate-50 p-3.5 space-y-1 text-xs">
            <span className="font-bold uppercase text-slate-500 tracking-wider">Selected Tables Summary</span>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {selectedTables.map((tbl) => (
                <span key={tbl.id} className="rounded-md bg-white border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900">
                  Table {tbl.tableNumber}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
              <input
                value={customer.customerName}
                onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (10 digits) *</label>
              <input
                value={customer.customerPhone}
                onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Number of Guests (Optional)</label>
              <input
                type="number"
                min={1}
                value={customer.numberOfGuests}
                onChange={(e) => setCustomer({ ...customer, numberOfGuests: e.target.value })}
                placeholder="e.g. 4"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>
      </CommonModal>
    </div>
  );
}

export function WaiterNewOrderPage({ initialOrderId }: { initialOrderId?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = initialOrderId ?? searchParams.get("orderId") ?? undefined;
  const tableId = searchParams.get("tableId") ?? undefined;
  const customerId = searchParams.get("customerId") ?? undefined;
  const tableNumber = searchParams.get("table") ?? "-";
  const customerName = searchParams.get("customer") ?? "Customer";
  const customerPhone = searchParams.get("phone") ?? "-";
  const { data: menuData, isLoading, isError, refetch } = useMenu();
  const orderDetail = useOrderDetail(orderId);
  const createOrder = useCreateOrder();
  const addItems = useAddOrderItems();
  const serveOrder = useServeOrder();
  const sendToBilling = useSendOrderToBilling();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  const activeOrder = orderDetail.data?.data;
  const effectiveTableId = activeOrder?.tableId ?? tableId;
  const effectiveCustomerId = activeOrder?.customerId ?? customerId;
  const effectiveTable = activeOrder?.table ?? tableNumber;
  const effectiveCustomer = activeOrder?.customer ?? customerName;
  const effectivePhone = activeOrder?.customerPhone ?? customerPhone;

  const isCompleted = activeOrder?.status === "COMPLETED" || activeOrder?.paymentStatus === "SUCCESS";
  const isBillSent = Boolean(activeOrder?.billNumber);
  const canGoForBill = Boolean(activeOrder && activeOrder.items?.length > 0 && !isBillSent && !isCompleted);

  if (!orderId && (!tableId || !customerId)) {
    return (
      <ErrorState
        message="Open an active customer card or assign an available table before creating an order."
        onRetry={() => {
          router.push("/waiter/customers");
        }}
      />
    );
  }

  if (isLoading || (orderId && orderDetail.isLoading)) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load menu for order." onRetry={() => refetch()} />;
  if (orderId && orderDetail.isError) return <ErrorState message="Unable to load active customer order." onRetry={() => orderDetail.refetch()} />;

  async function handleCreate() {
    if (isCompleted || isBillSent) {
      toast.error("This order is read-only and cannot accept new items.");
      return;
    }
    const items = Object.entries(cart)
      .filter(([, quantity]) => quantity > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (!items.length) {
      toast.error("Select at least one food item.");
      return;
    }
    try {
      if (orderId) {
        await addItems.mutateAsync({ id: orderId, input: { items } });
      } else {
        await createOrder.mutateAsync({ tableId: effectiveTableId, customerId: effectiveCustomerId, items });
      }
      toast.success("Order sent to kitchen successfully.");
      setCart({});
      orderDetail.refetch();
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  async function handleServe() {
    if (!orderId) return;
    try {
      await serveOrder.mutateAsync(orderId);
      toast.success("Order marked as served.");
      orderDetail.refetch();
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  async function handleConfirmBilling() {
    if (!orderId) return;
    try {
      await sendToBilling.mutateAsync(orderId);
      toast.success("Bill sent to Receptionist successfully.");
      setIsBillingModalOpen(false);
      orderDetail.refetch();
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Order & Billing Card"
        description="Manage customer session, send orders to kitchen, and dispatch bills to reception."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeOrder?.status === "READY" ? (
              <button
                onClick={handleServe}
                disabled={serveOrder.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Mark as Served
              </button>
            ) : null}

            {canGoForBill ? (
              <button
                onClick={() => setIsBillingModalOpen(true)}
                disabled={sendToBilling.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition shadow-sm"
              >
                <ReceiptText className="h-4 w-4" /> Go for Bill
              </button>
            ) : null}

            {!isCompleted && !isBillSent ? (
              <button
                onClick={handleCreate}
                disabled={createOrder.isPending || addItems.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <Send className="h-4 w-4" /> Send to Kitchen
              </button>
            ) : null}
          </div>
        }
      />

      {/* Confirmation Modal */}
      <CommonModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onConfirm={handleConfirmBilling}
        title="Send Bill to Receptionist?"
        description="Please confirm sending this order bill to Reception for payment collection."
        confirmText="Send Bill"
        isConfirming={sendToBilling.isPending}
      >
        <div className="space-y-2 rounded-xl border bg-slate-50 p-4 text-xs font-medium text-slate-700">
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Customer Name:</span>
            <span className="font-semibold text-slate-900">{effectiveCustomer}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Customer Phone:</span>
            <span>{effectivePhone}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Table(s):</span>
            <span className="font-bold text-slate-900">{effectiveTable ? (effectiveTable.startsWith("Table") ? effectiveTable : `Table ${effectiveTable}`) : "-"}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Order Number:</span>
            <span className="font-mono text-slate-900 font-bold">{activeOrder?.orderNumber ?? "-"}</span>
          </div>
          <div className="flex justify-between border-b pb-1.5">
            <span className="text-slate-500">Number of Items:</span>
            <span className="font-bold text-slate-900">{activeOrder?.items?.reduce((acc, i) => acc + i.quantity, 0) ?? 0}</span>
          </div>
          <div className="flex justify-between pt-1.5 text-sm font-extrabold text-slate-900">
            <span>Total Amount:</span>
            <span>{currency(activeOrder?.grandTotal ?? 0)}</span>
          </div>
        </div>
      </CommonModal>

      {/* Customer Session Card */}
      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Session Details</span>
            <h2 className="text-lg font-bold text-slate-900">{effectiveCustomer}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              Table {isCompleted ? "AVAILABLE" : "OCCUPIED"}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-xs">
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-slate-500 font-medium">Customer Phone</p>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{effectivePhone}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-slate-500 font-medium">Table(s)</p>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{effectiveTable ? (effectiveTable.startsWith("Table") ? effectiveTable : `Table ${effectiveTable}`) : "-"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-slate-500 font-medium">Customer ID</p>
            <p className="font-mono text-slate-700 truncate mt-0.5">{effectiveCustomerId ?? "-"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-slate-500 font-medium">Session / Order ID</p>
            <p className="font-mono font-bold text-slate-900 mt-0.5">{activeOrder?.orderNumber ?? "New"}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-slate-500 font-medium">Grand Total</p>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{currency(activeOrder?.grandTotal ?? 0)}</p>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid gap-4 sm:grid-cols-3 border-t pt-3 text-xs">
          <div>
            <span className="text-slate-500 block mb-1">Kitchen / Order Status</span>
            <StatusBadge status={activeOrder?.status ?? "ORDERING"} />
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Billing Status</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isCompleted ? "bg-emerald-100 text-emerald-700" : isBillSent ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
              {isCompleted ? "Completed" : isBillSent ? "Sent to Receptionist" : "Not Sent"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Payment Status</span>
            <StatusBadge status={activeOrder?.paymentStatus ?? "PENDING"} />
          </div>
        </div>

        {/* Ordered Food Items Breakdown */}
        {activeOrder?.items?.length ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Ordered Items Breakdown</h3>
            <div className="space-y-2">
              {activeOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-2.5 text-xs border border-slate-100 shadow-2xs">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-10 w-12 shrink-0 overflow-hidden rounded border bg-slate-100">
                      <MenuItemImage src={item.imageUrl} alt={item.itemName} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{item.itemName}</p>
                      <p className="text-slate-500">{currency(item.unitPrice)} × {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{currency(item.lineTotal)}</p>
                    {item.taxAmount > 0 && <p className="text-[10px] text-slate-500">Tax: {currency(item.taxAmount)}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="grid gap-2 border-t border-slate-200 pt-3 text-xs sm:grid-cols-4 font-medium text-slate-700">
              <div>Subtotal: <span className="font-bold text-slate-900">{currency(activeOrder.subtotal)}</span></div>
              <div>Discount: <span className="font-bold text-slate-900">{currency(activeOrder.discountTotal)}</span></div>
              <div>Tax: <span className="font-bold text-slate-900">{currency(activeOrder.taxTotal)}</span></div>
              <div className="text-right sm:text-left">Grand Total: <span className="font-extrabold text-slate-900 text-sm">{currency(activeOrder.grandTotal)}</span></div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Read-Only State or Menu Picker */}
      {isCompleted ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-900 shadow-sm space-y-1">
          <p className="font-bold text-base">✓ Order Completed & Paid</p>
          <p className="text-xs text-emerald-700">Payment has been collected by reception. Table T-{effectiveTable} is now AVAILABLE. This order is read-only.</p>
        </div>
      ) : isBillSent ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-blue-900 shadow-sm space-y-1">
          <p className="font-bold text-base">Bill Sent to Receptionist ({activeOrder?.billNumber})</p>
          <p className="text-xs text-blue-700">Awaiting receptionist payment collection. Table T-{effectiveTable} remains OCCUPIED until paid.</p>
        </div>
      ) : (
        <MenuPicker rows={menuData?.data ?? []} cart={cart} setCart={setCart} />
      )}
    </div>
  );
}

export function WaiterCustomersPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useStaffOrders({ limit: 100 });
  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load active customers." onRetry={() => refetch()} />;
  const rows = (data?.data ?? []).filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status) && order.tableId && order.customerId);
  return (
    <div className="space-y-6">
      <PageHeader title="Active Customers" description="Open a seated customer card to take or continue an order." />
      {!rows.length ? (
        <EmptyState title="No active customers" description="Seat a customer from Tables to start an order." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((order) => (
            <button key={order.id} onClick={() => router.push(`/waiter/customers/${order.id}`)} className="rounded-lg border bg-white p-4 text-left shadow-sm hover:bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Customer</p>
                  <h2 className="text-lg font-semibold">{order.customer ?? "Walk-in"}</h2>
                  <p className="text-sm text-slate-500">{order.customerPhone ?? "-"}</p>
                </div>
                <StatusBadge status={order.status === "DRAFT" ? "ORDERING" : order.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Tables</p><p className="font-semibold">{order.table ? (order.table.includes(",") ? `Tables ${order.table}` : `Table ${order.table}`) : "-"}</p></div>
                <div><p className="text-slate-500">Order</p><p className="font-semibold">{order.orderNumber}</p></div>
                <div><p className="text-slate-500">Items</p><p className="font-semibold">{order.itemCount ?? 0}</p></div>
                <div><p className="text-slate-500">Total</p><p className="font-semibold">{currency(order.grandTotal)}</p></div>
              </div>
              <p className="mt-3 text-xs text-slate-500">{date(order.createdAt)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StaffNotificationsPage({ role = "reception" }: { role?: "waiter" | "kitchen" | "reception" | "admin" }) {
  const router = useRouter();
  const [params, setParams] = useState({ page: 1, limit: 10, status: "all" });
  const { data, isLoading, isError, refetch } = useStaffNotifications({
    page: params.page,
    limit: params.limit,
    isRead: params.status === "unread" ? "false" : params.status === "read" ? "true" : undefined,
  });
  const readNotification = useReadStaffNotification();
  const readAllNotifications = useReadAllStaffNotifications();

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load notifications." onRetry={() => refetch()} />;

  const rows = data?.data ?? [];
  const unreadCount = data?.meta?.unread ?? rows.filter((r) => !r.isRead).length;

  async function handleMarkAllAsRead() {
    try {
      await readAllNotifications.mutateAsync();
      toast.success("All notifications marked as read.");
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  async function openNotification(notification: StaffNotification) {
    try {
      if (!notification.isRead) await readNotification.mutateAsync(notification.id);

      if (notification.entityType === "bill" && notification.entityId) {
        router.push(`/receptionist/bills/${notification.entityId}`);
      } else if (notification.entityType === "order" && notification.entityId) {
        if (role === "kitchen") {
          router.push(`/kitchen/orders/${notification.entityId}`);
        } else if (role === "reception") {
          router.push(`/receptionist/bills`);
        } else {
          router.push(`/waiter/customers/${notification.entityId}`);
        }
      }
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`}
        actions={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllAsRead}
              disabled={readAllNotifications.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" /> Mark All as Read
            </button>
          ) : null
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

      {!rows.length ? (
        <EmptyState title="No notifications" description="All notification updates will appear here." />
      ) : (
        <div className="space-y-3">
          {rows.map((notification) => (
            <button
              key={notification.id}
              onClick={() => openNotification(notification)}
              className={cn(
                "w-full rounded-xl border p-4 text-left shadow-xs transition flex items-start justify-between gap-4",
                notification.isRead
                  ? "bg-white border-slate-200 hover:bg-slate-50/60"
                  : "bg-blue-50/40 border-blue-200 border-l-4 border-l-blue-600 hover:bg-blue-50/80"
              )}
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  {notification.type.includes("BILL") ? (
                    <ReceiptText className="h-4 w-4 text-blue-600" />
                  ) : notification.type.includes("KITCHEN") ? (
                    <Utensils className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Bell className="h-4 w-4 text-slate-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-bold", notification.isRead ? "text-slate-800" : "text-slate-950")}>
                      {notification.title}
                    </p>
                    {!notification.isRead && (
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{notification.message}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{date(notification.createdAt)}</span>
                <StatusBadge status={notification.isRead ? "READ" : "UNREAD"} />
              </div>
            </button>
          ))}

          <CommonPagination
            currentPage={params.page}
            totalPages={Math.ceil((data?.meta?.total ?? 0) / params.limit) || 1}
            totalItems={data?.meta?.total}
            pageSize={params.limit}
            onPageChange={(page: number) => setParams((prev) => ({ ...prev, page }))}
            onPageSizeChange={(limit: number) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
            showPageSize
          />
        </div>
      )}
    </div>
  );
}

export function KitchenOrderDetailPage({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useOrderDetail(orderId);
  const updateStatus = useUpdateKitchenOrderStatus();
  if (isLoading) return <LoadingSkeleton />;
  if (isError || !data?.data) return <ErrorState message="Unable to load kitchen order." onRetry={() => refetch()} />;
  const order = data.data;
  return (
    <div className="space-y-6">
      <PageHeader
        title={order.orderNumber}
        description={`Table ${order.table ?? "-"} | ${order.customer ?? "Walk-in"} | ${date(order.createdAt)}`}
        actions={<button onClick={() => router.push("/kitchen/orders")} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Back to Orders</button>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card label="Status" value={order.status} icon={<ChefHat className="h-4 w-4" />} />
        <Card label="Table" value={order.table ?? "-"} icon={<ClipboardList className="h-4 w-4" />} />
        <Card label="Items" value={order.items.reduce((sum, item) => sum + item.quantity, 0)} icon={<Utensils className="h-4 w-4" />} />
        <Card label="Waiter" value={order.waiter ?? "-"} icon={<ClipboardList className="h-4 w-4" />} />
      </div>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Food Items</h2>
            <p className="text-sm text-slate-500">Customer: {order.customer ?? "Walk-in"}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-4 divide-y">
          {order.items.map((item) => (
            <div key={item.id} className="py-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium">{item.itemName}</span>
                <span>x {item.quantity}</span>
              </div>
              {item.notes ? <p className="mt-1 text-xs text-slate-500">Note: {item.notes}</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === "PLACED" ? (
            <button disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: order.id, status: "PREPARING" })} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Start Preparing</button>
          ) : null}
          {order.status === "PREPARING" ? (
            <button disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: order.id, status: "READY" })} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Mark Ready</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MenuPicker({ rows, cart, setCart }: { rows: MenuRow[]; cart: Record<string, number>; setCart: React.Dispatch<React.SetStateAction<Record<string, number>>> }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const categories = Array.from(new Map(rows.map((row) => [row.category.id, row.category])).values());
  const available = rows.filter(({ item, category }) => {
    const matchesAvailability = item.isActive && item.isAvailable;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || category.name.toLowerCase().includes(search.toLowerCase()) || item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryId || category.id === categoryId;
    return matchesAvailability && matchesSearch && matchesCategory;
  });
  const allAvailable = rows.filter(({ item }) => item.isActive && item.isAvailable);
  if (!allAvailable.length) return <EmptyState title="No available food items" description="Available menu items will appear here." />;
  const total = allAvailable.reduce((sum, { item }) => sum + (cart[item.id] ?? 0) * Number(item.price), 0);
  const selected = allAvailable.filter(({ item }) => (cart[item.id] ?? 0) > 0);
  return (
    <div className="space-y-4">
      <FilterCard
        title="Menu Filters"
        activeCount={[search, categoryId].filter(Boolean).length}
        chips={[
          search ? { key: "search", label: "Search", value: search, onRemove: () => setSearch("") } : undefined,
          categoryId ? { key: "category", label: "Category", value: categories.find((category) => category.id === categoryId)?.name ?? categoryId, onRemove: () => setCategoryId("") } : undefined,
        ].filter((chip): chip is ActiveFilterChip => Boolean(chip))}
        onClear={() => { setSearch(""); setCategoryId(""); }}
      >
        <FilterSearchInput value={search} onChange={setSearch} placeholder="Search food or category..." />
        <FilterSelect value={categoryId} onChange={setCategoryId} label="Category" options={[{ value: "", label: "All categories" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} />
      </FilterCard>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {!available.length ? <EmptyState title="No matching food items" description="Adjust search or category filters." /> : available.map(({ item, category }) => (
            <div key={item.id} className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="relative h-28 overflow-hidden rounded-lg bg-slate-100"><MenuItemImage src={item.imageUrl} alt={item.name} /></div>
              <p className="mt-3 font-semibold">{item.name}</p>
              <p className="text-xs text-slate-500">{category.name}</p>
              {item.description ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p> : null}
              <p className="mt-1 text-sm font-medium">{currency(Number(item.price))}</p>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setCart((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1) }))} className="h-8 w-8 rounded-lg border">-</button>
                <span className="w-8 text-center text-sm font-semibold">{cart[item.id] ?? 0}</span>
                <button onClick={() => setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))} className="h-8 w-8 rounded-lg border">+</button>
              </div>
            </div>
          ))}
        </div>
        <aside className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Order Summary</h2>
          {selected.length ? (
            <div className="mt-3 space-y-3">
              {selected.map(({ item }) => {
                const quantity = cart[item.id] ?? 0;
                return (
                  <div key={item.id} className="border-b pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-sm font-semibold">{currency(Number(item.price) * quantity)}</p>
                    </div>
                    <p className="text-xs text-slate-500">{currency(Number(item.price))} x {quantity}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Add items to build the customer order.</p>
          )}
          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-semibold">{currency(total)}</p>
            <p className="text-sm text-slate-500">{Object.values(cart).reduce((sum, qty) => sum + qty, 0)} items selected</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
function MenuItemImage({ src, alt }: { src?: string | null; alt: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageSrc = getImageUrl(src);

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [imageSrc]);

  if (!imageSrc || error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 px-2 text-center text-[10px] font-medium text-slate-400">
        {imageSrc ? "Image unavailable" : "No Image"}
      </div>
    );
  }
  return (
    <>
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-slate-200" /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </>
  );
}


type MenuItemForm = {
  name: string;
  categoryId: string;
  description: string;
  price: string;
  taxRate: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  isAvailable: boolean;
  isActive: boolean;
};

export function RestaurantAdminMenuManagementPage() {
  const { data: menuData, isLoading: menuLoading, isError: menuError, refetch } = useMenu();
  const { data: categoryData } = useCategories();
  const updateMenuItem = useUpdateMenuItem();
  const createMenuItem = useCreateMenuItem();
  const createCategory = useCreateCategory();
  const uploadImage = useUploadMenuImage();

  const categories = categoryData?.data ?? [];
  const allRows = menuData?.data ?? [];

  // Search & Filter state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuRow["item"] | null>(null);
  const [detailsItem, setDetailsItem] = useState<MenuRow | null>(null);

  // Form state
  const [form, setForm] = useState<MenuItemForm>({
    name: "",
    categoryId: "",
    description: "",
    price: "",
    taxRate: "0",
    imageUrl: null,
    imagePublicId: null,
    isAvailable: true,
    isActive: true,
  });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [statusDialog, setStatusDialog] = useState<{ isOpen: boolean; item: MenuRow["item"] | null }>({
    isOpen: false,
    item: null,
  });

  // Filter rows
  const filteredRows = allRows.filter(({ item, category }) => {
    const matchesSearch = !debouncedSearch || item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || category.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesCategory = !selectedCategory || category.id === selectedCategory;
    const matchesAvailability = !selectedAvailability || (selectedAvailability === "available" ? item.isAvailable : !item.isAvailable);
    const matchesStatus = !selectedStatus || (selectedStatus === "active" ? item.isActive : !item.isActive);
    return matchesSearch && matchesCategory && matchesAvailability && matchesStatus;
  });

  function openAddModal() {
    setEditingItem(null);
    setForm({
      name: "",
      categoryId: categories[0]?.id ?? "",
      description: "",
      price: "",
      taxRate: "0",
      imageUrl: null,
      imagePublicId: null,
      isAvailable: true,
      isActive: true,
    });
    setImagePreview(null);
    setIsItemModalOpen(true);
  }

  function openEditModal(item: MenuRow["item"], categoryId: string) {
    setEditingItem(item);
    setForm({
      name: item.name,
      categoryId,
      description: item.description ?? "",
      price: item.price,
      taxRate: item.taxRate ?? "0",
      imageUrl: item.imageUrl ?? null,
      imagePublicId: item.imagePublicId ?? null,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
    });
    setImagePreview(item.imageUrl ?? null);
    setIsItemModalOpen(true);
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file format
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG and WEBP image formats are allowed.");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5 MB.");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const previousPreview = imagePreview;
    setImagePreview(localPreviewUrl);
    setIsUploading(true);
    try {
      const res = await uploadImage.mutateAsync(file);
      setForm((prev) => ({ ...prev, imageUrl: res.data.imageUrl, imagePublicId: res.data.imagePublicId }));
      setImagePreview(res.data.imageUrl);
      toast.success("Food image uploaded successfully.");
    } catch (err) {
      setImagePreview(previousPreview);
      toast.error(extractApiError(err).message);
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
      e.target.value = "";
      setIsUploading(false);
    }
  }

  function handleRemoveImage() {
    setForm((prev) => ({ ...prev, imageUrl: null, imagePublicId: null }));
    setImagePreview(null);
  }

  async function handleItemSubmit() {
    if (!form.name.trim()) return toast.error("Food name is required.");
    if (!form.categoryId) return toast.error("Category is required.");
    const numPrice = Number(form.price);
    if (!Number.isFinite(numPrice) || numPrice <= 0) return toast.error("Please enter a valid positive price.");

    try {
      if (editingItem) {
        await updateMenuItem.mutateAsync({
          id: editingItem.id,
          input: {
            name: form.name,
            categoryId: form.categoryId,
            description: form.description || undefined,
            price: numPrice,
            imageUrl: form.imageUrl === null ? null : form.imageUrl || undefined,
            imagePublicId: form.imagePublicId === null ? null : form.imagePublicId || undefined,
            isAvailable: form.isAvailable,
          },
        });
        toast.success("Food item updated successfully.");
      } else {
        await createMenuItem.mutateAsync({
          name: form.name,
          categoryId: form.categoryId,
          description: form.description || undefined,
          price: numPrice,
          imageUrl: form.imageUrl === null ? null : form.imageUrl || undefined,
          imagePublicId: form.imagePublicId === null ? null : form.imagePublicId || undefined,
          isAvailable: form.isAvailable,
        });
        toast.success("Food item created successfully.");
      }
      setIsItemModalOpen(false);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  async function handleCategorySubmit() {
    if (!categoryForm.name.trim()) return toast.error("Category name is required.");
    try {
      await createCategory.mutateAsync({ name: categoryForm.name, description: categoryForm.description || undefined });
      toast.success("Category created successfully.");
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: "", description: "" });
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  async function handleToggleAvailability(item: MenuRow["item"]) {
    try {
      await updateMenuItem.mutateAsync({ id: item.id, input: { isAvailable: !item.isAvailable } });
      toast.success(`Food item marked as ${!item.isAvailable ? "Available" : "Unavailable"}.`);
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteDialog.item) return;
    try {
      await deleteMenuItem.mutateAsync(deleteDialog.item.id);
      toast.success("Food item removed successfully.");
      setDeleteDialog({ isOpen: false, item: null });
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  if (menuLoading) return <LoadingSkeleton />;
  if (menuError) return <ErrorState message="Unable to load menu." onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu Management"
        description="Create, view, update, and remove food items and categories."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Plus className="h-4 w-4" /> Add Category
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              <Plus className="h-4 w-4" /> Add Menu
            </button>
          </div>
        }
      />

      <FilterCard
        title="Menu Filters"
        activeCount={[search, selectedCategory, selectedAvailability].filter(Boolean).length}
        chips={[
          search ? { key: "search", label: "Search", value: search, onRemove: () => setSearch("") } : undefined,
          selectedCategory ? { key: "category", label: "Category", value: categories.find((cat) => cat.id === selectedCategory)?.name ?? selectedCategory, onRemove: () => setSelectedCategory("") } : undefined,
          selectedAvailability ? { key: "availability", label: "Availability", value: selectedAvailability, onRemove: () => setSelectedAvailability("") } : undefined,
        ].filter((chip): chip is ActiveFilterChip => Boolean(chip))}
        onClear={() => { setSearch(""); setSelectedCategory(""); setSelectedAvailability(""); }}
      >
        <FilterSearchInput value={search} onChange={setSearch} placeholder="Search food item or category..." />
        <FilterSelect value={selectedCategory} onChange={setSelectedCategory} label="Category" options={[{ value: "", label: "All categories" }, ...categories.map((cat) => ({ value: cat.id, label: cat.name }))]} />
        <FilterSelect value={selectedAvailability} onChange={setSelectedAvailability} label="Availability" options={[{ value: "", label: "All availability" }, { value: "available", label: "Available only" }, { value: "unavailable", label: "Unavailable only" }]} />
      </FilterCard>

      {/* Food Items Table */}
      {!filteredRows.length ? (
        <EmptyState title="No food items found" description="Create categories and add food items to begin." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
              <tr>
                <th className="p-3">Image</th>
                <th className="p-3">Food Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Price</th>
                <th className="p-3">Availability</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRows.map(({ item, category }) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-3">
                    <div className="relative h-12 w-16 overflow-hidden rounded-lg border bg-slate-100 flex items-center justify-center">
                      <MenuItemImage src={item.imageUrl} alt={item.name} />
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {category.name}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500 max-w-xs truncate">{item.description ?? "-"}</td>
                  <td className="p-3 font-medium text-slate-900">{currency(Number(item.price))}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      disabled={updateMenuItem.isPending}
                      className="cursor-pointer"
                    >
                      <StatusBadge status={item.isAvailable ? "ACTIVE" : "INACTIVE"} />
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(item, category.id)}
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition"
                        title="Edit Food Item"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteDialog({ isOpen: true, item })}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition"
                        title="Remove Food Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Food Item Modal */}
      <CommonModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? "Edit Food Item" : "Add Menu"}
        description="Configure food item details, category, pricing, and image."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Food Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Paneer Butter Masala"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500">Category *</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
              >
                <option value="" disabled>
                  Select Category
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500">Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="250"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Rich tomato cream gravy with cottage cheese cubes."
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
          </div>

          {/* Cloudinary Food Image Upload & Preview */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Food Image (Cloudinary)</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="relative h-20 w-28 overflow-hidden rounded-lg border bg-slate-100 flex items-center justify-center">
                {imagePreview ? (
                  <MenuItemImage src={imagePreview} alt="Preview" />
                ) : (
                  <span className="text-xs text-slate-400">No Image</span>
                )}
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition">
                    <Upload className="h-4 w-4" />
                    <span>{isUploading ? "Uploading..." : "Choose Image File"}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileChange} className="hidden" />
                  </label>
                  {imagePreview ? (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Remove
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Allowed: JPG, PNG, WEBP (Max 5 MB)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isAvailable"
              checked={form.isAvailable}
              onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
            />
            <label htmlFor="isAvailable" className="text-sm font-medium text-slate-700">
              Available for Ordering
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleItemSubmit}
              disabled={createMenuItem.isPending || updateMenuItem.isPending || isUploading}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {editingItem ? "Save Changes" : "Create Food Item"}
            </button>
          </div>
        </div>
      </CommonModal>

      {/* Add Category Modal */}
      <CommonModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Menu Category"
        description="Create a new food category (e.g. Starters, Main Course, Beverages)."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Category Name *</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. Main Course"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Description</label>
            <input
              type="text"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              placeholder="North Indian and Continental main courses"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCategorySubmit}
              disabled={createCategory.isPending}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Create Category
            </button>
          </div>
        </div>
      </CommonModal>

      {/* Delete Confirmation Popup */}
      <CommonModal
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, item: null })}
        onConfirm={handleConfirmDelete}
        title="Remove Food Item?"
        description={`Are you sure you want to remove "${deleteDialog.item?.name}" from the menu? This action cannot be undone.`}
        confirmText="Remove Food Item"
        variant="danger"
        isConfirming={deleteMenuItem.isPending}
      />
    </div>
  );
}



export const StaffMenuPage = ReceptionistMenuPage;

export function StaffMenuViewPage() {
  const { data, isLoading, isError, refetch } = useMenu();
  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load menu." onRetry={() => refetch()} />;
  const rows = data?.data ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Menu" description="Live restaurant menu and item availability." />
      {!rows.length ? (
        <EmptyState title="No menu items found" description="Available food items will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ item, category }) => (
            <div key={item.id} className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="relative h-36 overflow-hidden rounded-lg bg-slate-100">
                <MenuItemImage src={item.imageUrl} alt={item.name} />
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-slate-500">{category.name}</p>
                </div>
                <StatusBadge status={item.isAvailable ? "ACTIVE" : "INACTIVE"} />
              </div>
              {item.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p> : null}
              <p className="mt-3 font-semibold">{currency(Number(item.price))}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardShell({ title, cards, orders, bills, filter }: { title: string; cards: Array<[string, string | number]>; orders?: OrderRow[]; bills?: BillRow[]; filter?: React.ReactNode }) {
  const lookup = new Map(cards.map(([label, value]) => [label, value]));
  const numberValue = (label: string) => {
    const value = lookup.get(label);
    return typeof value === "number" ? value : Number(String(value ?? 0).replace(/[^\d.-]/g, "")) || 0;
  };
  const metricItems = cards.slice(0, 4).map(([label, value], index) => ({
    label,
    value,
    tone: (["blue", "green", "amber", "slate"] as const)[index % 4],
  }));
  const orderRows: ChartDatum[] = [
    { status: "Open", value: numberValue("Open Orders") || numberValue("Pending Kitchen Orders") },
    { status: "Ready", value: numberValue("Ready Orders") },
    { status: "Completed", value: numberValue("Completed Orders") },
    { status: "Today", value: numberValue("Today's Orders") },
  ];
  const billRows: ChartDatum[] = [
    { status: "Paid", value: numberValue("Paid Bills") },
    { status: "Pending", value: numberValue("Pending Bills") },
    { status: "Today", value: numberValue("Today's Bills") },
  ];
  const activeTables = numberValue("Assigned Tables") || numberValue("Available Tables") + numberValue("Occupied Tables");
  const occupiedTables = numberValue("Occupied Tables");
  const availableTables = numberValue("Available Tables");
  const recentActivity = [
    ...(orders ?? []).map((order) => ({
      id: order.id,
      title: order.orderNumber,
      subtitle: `Table ${order.table ?? "-"} | ${order.customer ?? "Walk-in"}`,
      value: currency(order.grandTotal),
      time: new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(order.createdAt)),
    })),
    ...(bills ?? []).map((bill) => ({
      id: bill.id,
      title: bill.billNumber,
      subtitle: `${bill.orderNumber} | ${bill.paymentStatus}`,
      value: currency(bill.grandTotal),
      time: new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(bill.createdAt)),
    })),
  ].sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="space-y-6">
      <PageHeader title={title} description="Live operational intelligence from the restaurant POS." actions={filter} />
      <MetricStrip items={metricItems} />

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPanel title="Order Flow" subtitle="Current order state from the dashboard API.">
          <DonutAnalytics data={orderRows} nameKey="status" valueKey="value" centerLabel="Orders" centerValue={numberValue("Today's Orders") || numberValue("Open Orders")} emptyMessage="Order analytics are not available for this period." />
        </AnalyticsPanel>
        <AnalyticsPanel title="Table Occupancy" subtitle="Visual occupancy using available table counts.">
          <OccupancyAnalytics total={activeTables || occupiedTables + availableTables} occupied={occupiedTables} available={availableTables} pending={numberValue("Billing Pending")} />
        </AnalyticsPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsPanel title="Billing & Payment" subtitle="Bill counts and payment state.">
          <ResponsiveBarAnalytics data={billRows} xKey="status" yKey="value" fill="#16a34a" emptyMessage="Billing analytics are not available for this role." />
        </AnalyticsPanel>
        <AnalyticsPanel title="Recent Activity" subtitle="Latest orders and bills returned by the API.">
          <ActivityTimeline rows={recentActivity} />
        </AnalyticsPanel>
      </div>
    </div>
  );
}

function OrdersTable({ rows, onServe, onSendToBilling, onAddItems }: { rows: OrderRow[]; onServe?: (order: OrderRow) => void; onSendToBilling?: (order: OrderRow) => void; onAddItems?: (order: OrderRow) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="p-3">Order</th>
            <th className="p-3">Table</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Waiter</th>
            <th className="p-3">Total</th>
            <th className="p-3">Status</th>
            <th className="p-3">Time</th>
            {(onServe || onSendToBilling || onAddItems) ? <th className="p-3 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((order) => (
            <tr key={order.id}>
              <td className="p-3 font-medium">{order.orderNumber}</td>
              <td className="p-3">{order.table ?? "-"}</td>
              <td className="p-3">{order.customer ?? "-"}</td>
              <td className="p-3">{order.waiter ?? "-"}</td>
              <td className="p-3">{currency(order.grandTotal)}</td>
              <td className="p-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="p-3">{date(order.createdAt)}</td>
              {(onServe || onSendToBilling || onAddItems) ? (
                <td className="p-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {onAddItems && !["COMPLETED", "CANCELLED"].includes(order.status) ? (
                      <button onClick={() => onAddItems(order)} className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold">Add Items</button>
                    ) : null}
                    {onServe && order.status === "READY" ? (
                      <button onClick={() => onServe(order)} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white">Serve</button>
                    ) : null}
                    {onSendToBilling && ["READY", "SERVED"].includes(order.status) ? (
                      <button onClick={() => onSendToBilling(order)} className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white">Send to Billing</button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillsTable({ rows, onPay }: { rows: BillRow[]; onPay?: (bill: BillRow) => void }) {
  const router = useRouter();
  if (!rows.length) {
    return <EmptyState title="No bills found" description="Bills will appear after orders are sent to billing." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            <th className="p-3">Invoice No</th>
            <th className="p-3">Order No</th>
            <th className="p-3">Table</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Phone</th>
            <th className="p-3">Waiter</th>
            <th className="p-3 text-right">Amount</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3">Date & Time</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((bill) => (
            <tr key={bill.id} className="hover:bg-slate-50/60 transition">
              <td className="p-3 font-bold font-mono text-slate-900">{bill.billNumber}</td>
              <td className="p-3 font-medium text-slate-600">{bill.orderNumber}</td>
              <td className="p-3 font-bold text-slate-900">{bill.table ? `T-${bill.table}` : "-"}</td>
              <td className="p-3 font-semibold text-slate-900">{bill.customer ?? "Walk-in"}</td>
              <td className="p-3 text-slate-500">{bill.customerPhone ?? "-"}</td>
              <td className="p-3 text-slate-600">{bill.waiter ?? "-"}</td>
              <td className="p-3 text-right font-extrabold text-slate-900">{currency(bill.grandTotal)}</td>
              <td className="p-3 text-center">
                <StatusBadge status={bill.paymentStatus === "SUCCESS" ? "PAID" : "PENDING"} />
              </td>
              <td className="p-3 text-slate-500">{date(bill.createdAt)}</td>
              <td className="p-3 text-right">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <button
                    onClick={() => router.push(`/receptionist/bills/${bill.id}`)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                  {bill.paymentStatus !== "SUCCESS" && onPay ? (
                    <button
                      onClick={() => onPay(bill)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
                    >
                      Collect Payment
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
