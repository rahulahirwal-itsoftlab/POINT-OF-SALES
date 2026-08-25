"use client";

import { useEffect, useState } from "react";
import { superAdminApi } from "@/lib/api/super-admin.api";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useConfirmation } from "@/components/common/modal";
import { FilterCard, FilterSelect } from "@/components/common/filters";

type Restaurant = {
  id: string;
  publicId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED";
  createdAt: string;
};

export function RestaurantsTable() {
  const { confirm } = useConfirmation();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchRestaurants = (currentPage: number, status: string) => {
    setLoading(true);
    const params: Record<string, string | number> = { page: currentPage, limit: 10 };
    if (status !== "all") params.status = status;

    superAdminApi.listRestaurants(params)
      .then((res: { data: Restaurant[], meta?: { total: number; limit: number } }) => {
        setRestaurants(res.data);
        setTotalPages(Math.ceil((res.meta?.total || res.data.length) / (res.meta?.limit || 10)));
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load restaurants.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRestaurants(page, statusFilter);
  }, [page, statusFilter]);

  const handleAction = async (id: string, action: "activate" | "deactivate") => {
    const isDeactivate = action === "deactivate";
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Restaurant`,
      description: `Are you sure you want to ${action} this restaurant?`,
      variant: isDeactivate ? "warning" : "info",
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
    });

    if (!confirmed) return;
    
    try {
      if (action === "activate") await superAdminApi.activateRestaurant(id);
      if (action === "deactivate") await superAdminApi.deactivateRestaurant(id);
      
      toast.success(`Restaurant ${action}d successfully`);
      fetchRestaurants(page, statusFilter);
    } catch {
      toast.error(`Failed to ${action} restaurant`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-50 text-green-700 border-green-200";
      case "INACTIVE": return "bg-gray-50 text-gray-700 border-gray-200";
      case "SUSPENDED": return "bg-orange-50 text-orange-700 border-orange-200";
      case "BLOCKED": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      <FilterCard
        title="Restaurant Filters"
        activeCount={statusFilter === "all" ? 0 : 1}
        chips={statusFilter === "all" ? [] : [{ key: "status", label: "Status", value: statusFilter, onRemove: () => { setStatusFilter("all"); setPage(1); } }]}
        onClear={() => { setStatusFilter("all"); setPage(1); }}
      >
        <FilterSelect
          value={statusFilter}
          onChange={(status) => { setStatusFilter(status); setPage(1); }}
          label="Status"
          options={[
            { value: "all", label: "All statuses" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "BLOCKED", label: "Blocked" },
          ]}
        />
      </FilterCard>

      <div className="border bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Loading restaurants...
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No restaurants found.
                  </td>
                </tr>
              ) : (
                restaurants.map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{restaurant.name}</div>
                      <div className="text-xs text-gray-500">{restaurant.publicId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div>{restaurant.email || "No email"}</div>
                      <div className="text-xs">{restaurant.phone || "No phone"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(restaurant.status)}`}>
                        {restaurant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {format(new Date(restaurant.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {restaurant.status !== "ACTIVE" && (
                          <button onClick={() => handleAction(restaurant.id, "activate")} className="text-green-600 hover:text-green-900 font-medium">
                            Activate
                          </button>
                        )}
                        {restaurant.status === "ACTIVE" && (
                          <button onClick={() => handleAction(restaurant.id, "deactivate")} className="text-orange-600 hover:text-orange-900 font-medium">
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
