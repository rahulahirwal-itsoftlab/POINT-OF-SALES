"use client";

import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, Edit, CreditCard, Power, ShieldAlert, Key } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { ActionDropdown, type ActionMenuItem } from "@/components/common/action-dropdown";
import { CommonDialog } from "@/components/common/common-dialog";
import { FilterCard, FilterSearchInput, FilterSelect, type ActiveFilterChip } from "@/components/common/filters";
import { useRestaurants } from "../hooks/use-restaurants";
import { activateRestaurant, blockRestaurant, deactivateRestaurant, unblockRestaurant, getRestaurant } from "../api/restaurant-api";
import { extractApiError } from "@/lib/api/client";
import type { RestaurantSummary } from "../types/restaurant.types";
import { RestaurantBranding } from "@/components/common/restaurant-branding";
import { SubscriptionManageModal } from "./subscription-manage-modal";
import { RestaurantDetailsModal } from "./restaurant-details-modal";



export function RestaurantTable() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [status, setStatus] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [licenseStatus, setLicenseStatus] = useState("");
  const [selectedDetailRestaurantId, setSelectedDetailRestaurantId] = useState<string | null>(null);

  // Action states
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean;
    restaurant: RestaurantSummary | null;
    action: "activate" | "deactivate" | "block" | "unblock" | null;
  }>({ isOpen: false, restaurant: null, action: null });

  const [subModal, setSubModal] = useState<{
    isOpen: boolean;
    restaurant: RestaurantSummary | null;
    subscriptionId?: string;
    planId?: string;
    price?: string;
    billingCycle?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }>({ isOpen: false, restaurant: null });

  const [loadingAction, setLoadingAction] = useState(false);

  const { data, isLoading, isError, refetch } = useRestaurants({
    page,
    limit: 15,
    search: debouncedSearch || undefined,
    status: status || undefined,
    subscriptionStatus: subscriptionStatus || undefined,
    licenseStatus: licenseStatus || undefined,
  });

  const rows: RestaurantSummary[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray((data as unknown as Record<string, unknown>)?.restaurants)
    ? ((data as unknown as Record<string, unknown>).restaurants as RestaurantSummary[])
    : [];

  const meta = data?.meta || (data as unknown as Record<string, unknown>)?.meta as { total: number; page: number; limit: number } | undefined;

  async function handleConfirmStatusAction() {
    if (!statusDialog.restaurant || !statusDialog.action) return;
    const { restaurant, action } = statusDialog;
    setLoadingAction(true);
    try {
      if (action === "activate") await activateRestaurant(restaurant.id);
      if (action === "deactivate") await deactivateRestaurant(restaurant.id);
      if (action === "block") await blockRestaurant(restaurant.id);
      if (action === "unblock") await unblockRestaurant(restaurant.id);
      await refetch();
      toast.success(`Restaurant ${action}ed successfully.`);
      setStatusDialog({ isOpen: false, restaurant: null, action: null });
    } catch (error) {
      toast.error(extractApiError(error).message);
    } finally {
      setLoadingAction(false);
    }
  }

  async function openSubscriptionModal(restaurant: RestaurantSummary) {
    try {
      const res = await getRestaurant(restaurant.id);
      const sub = res.data?.currentSubscription?.subscription;
      setSubModal({
        isOpen: true,
        restaurant,
        subscriptionId: sub?.id,
        planId: sub?.planId || "",
        price: sub?.price ? String(sub.price) : "",
        billingCycle: sub?.billingCycle || restaurant.subscriptionBillingCycle || "MONTHLY",
        startDate: sub?.startDate || "",
        endDate: sub?.endDate || restaurant.subscriptionExpiry || "",
        status: sub?.status || restaurant.subscriptionStatus || "ACTIVE",
      });
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  }

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message="Unable to load restaurants." onRetry={() => refetch()} />;
  const filterChips: ActiveFilterChip[] = [
    searchInput ? { key: "search", label: "Search", value: searchInput, onRemove: () => { setSearchInput(""); setPage(1); } } : undefined,
    status ? { key: "status", label: "Status", value: status, onRemove: () => { setStatus(""); setPage(1); } } : undefined,
    subscriptionStatus ? { key: "subscription", label: "Subscription", value: subscriptionStatus, onRemove: () => { setSubscriptionStatus(""); setPage(1); } } : undefined,
    licenseStatus ? { key: "license", label: "License", value: licenseStatus, onRemove: () => { setLicenseStatus(""); setPage(1); } } : undefined,
  ].filter((chip): chip is ActiveFilterChip => Boolean(chip));

  return (
    <div className="space-y-4">
      <FilterCard
        title="Restaurant Filters"
        activeCount={filterChips.length}
        chips={filterChips}
        onClear={() => { setSearchInput(""); setStatus(""); setSubscriptionStatus(""); setLicenseStatus(""); setPage(1); }}
      >
        <FilterSearchInput value={searchInput} onChange={(value) => { setSearchInput(value); setPage(1); }} placeholder="Search restaurant, email, or public ID..." />
        <FilterSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} label="Status" options={[{ value: "", label: "All statuses" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }, { value: "SUSPENDED", label: "Suspended" }, { value: "BLOCKED", label: "Blocked" }, { value: "ARCHIVED", label: "Archived" }]} />
        <FilterSelect value={subscriptionStatus} onChange={(value) => { setSubscriptionStatus(value); setPage(1); }} label="Subscription" options={[{ value: "", label: "All subscriptions" }, { value: "ACTIVE", label: "Active" }, { value: "EXPIRED", label: "Expired" }, { value: "SUSPENDED", label: "Suspended" }, { value: "CANCELLED", label: "Cancelled" }, { value: "PENDING", label: "Pending" }]} />
        <FilterSelect value={licenseStatus} onChange={(value) => { setLicenseStatus(value); setPage(1); }} label="License" options={[{ value: "", label: "All licenses" }, { value: "ACTIVE", label: "Active" }, { value: "EXPIRED", label: "Expired" }, { value: "SUSPENDED", label: "Suspended" }, { value: "BLOCKED", label: "Blocked" }, { value: "REVOKED", label: "Revoked" }]} />
        <button
          type="button"
          onClick={() => void refetch()}
          className="heritage-button-secondary h-10 rounded-xl px-3 py-2 text-sm font-bold"
        >
          Refresh
        </button>
      </FilterCard>

      {!rows.length ? (
        <EmptyState title="No restaurants found" description="Add a restaurant or adjust the current filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Restaurant</th>
                  <th className="px-4 py-3">Owner/Admin</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((restaurant: RestaurantSummary) => {
                  const menuItems: ActionMenuItem[] = [
                    {
                      label: "View Details",
                      icon: <Eye className="h-4 w-4" />,
                      onClick: () => setSelectedDetailRestaurantId(restaurant.id),
                    },
                    {
                      label: "Edit Restaurant",
                      icon: <Edit className="h-4 w-4" />,
                      onClick: () => router.push(`/super-admin/restaurants/${restaurant.id}/edit`),
                    },
                    {
                      label: "Subscription",
                      icon: <CreditCard className="h-4 w-4" />,
                      onClick: () => void openSubscriptionModal(restaurant),
                    },
                    {
                      label: "View License",
                      icon: <Key className="h-4 w-4" />,
                      onClick: () => router.push(`/super-admin/licenses?restaurantId=${restaurant.id}`),
                    },
                    { divider: true, label: "" },
                    restaurant.status === "ACTIVE"
                      ? {
                          label: "Deactivate Restaurant",
                          icon: <Power className="h-4 w-4" />,
                          variant: "warning",
                          onClick: () => setStatusDialog({ isOpen: true, restaurant, action: "deactivate" }),
                        }
                      : {
                          label: "Activate Restaurant",
                          icon: <Power className="h-4 w-4" />,
                          onClick: () => setStatusDialog({ isOpen: true, restaurant, action: "activate" }),
                        },
                    restaurant.status === "BLOCKED"
                      ? {
                          label: "Unblock Restaurant",
                          icon: <ShieldAlert className="h-4 w-4" />,
                          onClick: () => setStatusDialog({ isOpen: true, restaurant, action: "unblock" }),
                        }
                      : {
                          label: "Block Restaurant",
                          icon: <ShieldAlert className="h-4 w-4" />,
                          variant: "destructive",
                          onClick: () => setStatusDialog({ isOpen: true, restaurant, action: "block" }),
                        },
                  ];

                  return (
                    <tr key={restaurant.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailRestaurantId(restaurant.id)}
                          className="flex items-center gap-2 text-left hover:opacity-80 transition"
                        >
                          <RestaurantBranding
                            restaurant={{ name: restaurant.name, logo: restaurant.logo }}
                            size="sm"
                          />
                        </button>
                        {restaurant.code && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">{restaurant.code}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{restaurant.ownerName ?? "-"}</div>
                        <div className="text-xs text-slate-500">{restaurant.ownerPhone ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{restaurant.ownerEmail ?? restaurant.email ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{restaurant.phone ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium text-xs">
                        {[restaurant.city, restaurant.state].filter(Boolean).join(", ") || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={restaurant.status ?? "INACTIVE"} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={restaurant.subscriptionStatus ?? "ACTIVE"} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={restaurant.licenseStatus ?? "ACTIVE"} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionDropdown items={menuItems} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta && meta.total > meta.limit ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-50">
              Previous
            </button>
            <button disabled={page * meta.limit >= meta.total} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      ) : null}

      {/* Confirmation Dialog for Destructive & Status Actions */}
      <CommonDialog
        isOpen={statusDialog.isOpen}
        onClose={() => setStatusDialog({ isOpen: false, restaurant: null, action: null })}
        title={`${statusDialog.action === "deactivate" ? "Deactivate" : statusDialog.action === "activate" ? "Activate" : statusDialog.action === "block" ? "Block" : "Unblock"} Restaurant`}
        description={`Are you sure you want to ${statusDialog.action} ${statusDialog.restaurant?.name || "this restaurant"}?`}
        variant={statusDialog.action === "block" ? "destructive" : statusDialog.action === "deactivate" ? "warning" : "default"}
        confirmText={`${statusDialog.action === "deactivate" ? "Deactivate" : statusDialog.action === "activate" ? "Activate" : statusDialog.action === "block" ? "Block" : "Unblock"}`}
        onConfirm={handleConfirmStatusAction}
        isConfirming={loadingAction}
      >
        <div className="text-sm text-slate-600">
          {statusDialog.action === "deactivate" && "Deactivating this restaurant will temporarily suspend access to tenant services."}
          {statusDialog.action === "block" && "Blocking this restaurant will prevent all POS logins and API calls immediately."}
          {statusDialog.action === "activate" && "Activating will restore full POS dashboard access for the restaurant staff."}
          {statusDialog.action === "unblock" && "Unblocking will remove all access restrictions from this restaurant."}
        </div>
      </CommonDialog>

      {/* Subscription Management Modal */}
      <SubscriptionManageModal
        isOpen={subModal.isOpen}
        onClose={() => setSubModal({ isOpen: false, restaurant: null })}
        restaurant={subModal.restaurant}
        subscriptionId={subModal.subscriptionId}
        currentPlanId={subModal.planId}
        currentPrice={subModal.price}
        currentBillingCycle={subModal.billingCycle}
        currentStartDate={subModal.startDate}
        currentEndDate={subModal.endDate}
        currentStatus={subModal.status}
      />

      {/* Restaurant Full Overview Details Modal */}
      <RestaurantDetailsModal
        restaurantId={selectedDetailRestaurantId}
        isOpen={Boolean(selectedDetailRestaurantId)}
        onClose={() => setSelectedDetailRestaurantId(null)}
      />
    </div>
  );
}
