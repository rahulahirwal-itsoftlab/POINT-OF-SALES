"use client";

import { useEffect, useState } from "react";
import { superAdminApi } from "@/lib/api/super-admin.api";
import { format } from "date-fns";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters/currency";
import { FilterCard, FilterSearchInput, FilterSelect, type ActiveFilterChip } from "@/components/common/filters";
import { StatusBadge } from "@/components/common/status-badge";
import { CommonPagination } from "@/components/common/pagination";
import { useDebounce } from "@/hooks/use-debounce";

type Subscription = {
  subscription: {
    id: string;
    organizationId: string;
    restaurantId: string;
    planId: string;
    status: "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELLED" | "SUSPENDED" | "PENDING";
    billingCycle: "MONTHLY" | "YEARLY";
    startDate: string;
    endDate: string;
    renewalDate: string | null;
    price: string;
    currency: string;
    paymentStatus: string;
    planNameSnapshot?: string | null;
    baseAmountSnapshot?: string | null;
    gstPercentageSnapshot?: string | null;
    finalAmountSnapshot?: string | null;
  };
  organization: {
    name: string;
    publicId: string;
  };
  restaurant: {
    name: string;
    publicId: string;
  };
  owner?: {
    fullName: string;
    email: string;
  };
  plan: {
    name: string;
    planNumber?: string;
    planType?: string;
  };
};

export function SubscriptionsTable() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [billingCycle, setBillingCycle] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const fetchSubscriptions = (currentPage: number, currentLimit: number, status: string, cycle: string, term: string) => {
    setLoading(true);
    const params: Record<string, string | number> = { page: currentPage, limit: currentLimit };
    if (status !== "all") params.status = status;
    if (cycle !== "all") params.billingCycle = cycle;
    if (term.trim()) params.search = term.trim();

    superAdminApi.listSubscriptions(params)
      .then((res) => {
        setSubscriptions(res.data);
        setTotal(res.meta.total);
        setTotalPages(Math.ceil(res.meta.total / res.meta.limit) || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscriptions(page, limit, statusFilter, billingCycle, debouncedSearch);
  }, [page, limit, statusFilter, billingCycle, debouncedSearch]);

  return (
    <div className="space-y-4">
      <FilterCard
        title="Subscription Filters"
        activeCount={buildSubscriptionChips(search, statusFilter, billingCycle).length}
        chips={buildSubscriptionChips(search, statusFilter, billingCycle, {
          clearSearch: () => { setSearch(""); setPage(1); },
          clearStatus: () => { setStatusFilter("all"); setPage(1); },
          clearCycle: () => { setBillingCycle("all"); setPage(1); },
        })}
        onClear={() => { setSearch(""); setStatusFilter("all"); setBillingCycle("all"); setPage(1); }}
      >
        <FilterSearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search organization, owner, restaurant, plan..." />
        <FilterSelect
          value={statusFilter}
          onChange={(status) => { setStatusFilter(status); setPage(1); }}
          label="Status"
          options={[
            { value: "all", label: "All statuses" },
            { value: "ACTIVE", label: "Active" },
            { value: "EXPIRED", label: "Expired" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "PENDING", label: "Pending" },
          ]}
        />
        <FilterSelect
          value={billingCycle}
          onChange={(cycle) => { setBillingCycle(cycle); setPage(1); }}
          label="Billing Cycle"
          options={[{ value: "all", label: "All cycles" }, { value: "MONTHLY", label: "Monthly" }, { value: "YEARLY", label: "Yearly" }]}
        />
      </FilterCard>

      <div className="border bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Organization</th>
                <th className="px-6 py-3 font-medium">Owner</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Plan & Cycle</th>
                <th className="px-6 py-3 font-medium">Billing Period</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                subscriptions.map(({ subscription, organization, restaurant, owner, plan }) => (
                  <tr key={subscription.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-medium truncate max-w-[180px]" title={organization.name}>
                      {organization.name}
                      <div className="text-xs font-normal text-slate-500">{restaurant.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-900 font-medium">{owner?.fullName ?? "Owner not assigned"}</div>
                      {owner?.email ? <div className="text-xs text-slate-500">{owner.email}</div> : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 items-start">
                        <StatusBadge status={subscription.status} />
                        <StatusBadge status={subscription.paymentStatus} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 capitalize truncate max-w-[140px]" title={plan.name}>
                        {subscription.planNameSnapshot ?? plan.name}
                      </div>
                      <div className="text-xs font-mono text-amber-700">{plan.planNumber ?? "-"}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-medium">
                        {plan.planType === "CUSTOMIZED" ? "Customized" : "Common"} · {subscription.billingCycle}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      <div>{format(new Date(subscription.startDate), "MMM d, yyyy")}</div>
                      <div className="text-xs text-slate-500">to {format(new Date(subscription.endDate), "MMM d, yyyy")}</div>
                      {subscription.renewalDate ? (
                        <div className="text-xs text-amber-700 font-semibold mt-0.5">renew {format(new Date(subscription.renewalDate), "MMM d, yyyy")}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                      <div>{formatCurrency(subscription.finalAmountSnapshot ?? subscription.price, subscription.currency)}</div>
                      <div className="text-xs font-medium text-slate-500">GST {subscription.gstPercentageSnapshot ?? "0"}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/super-admin/subscriptions/${subscription.id}`} className="inline-flex items-center gap-1 text-slate-900 hover:text-slate-950 font-bold px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-sm">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}

function buildSubscriptionChips(search: string, status: string, cycle: string, actions?: { clearSearch: () => void; clearStatus: () => void; clearCycle: () => void }) {
  return [
    search ? { key: "search", label: "Search", value: search, onRemove: actions?.clearSearch ?? (() => undefined) } : undefined,
    status !== "all" ? { key: "status", label: "Status", value: status, onRemove: actions?.clearStatus ?? (() => undefined) } : undefined,
    cycle !== "all" ? { key: "billingCycle", label: "Cycle", value: cycle, onRemove: actions?.clearCycle ?? (() => undefined) } : undefined,
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip));
}
