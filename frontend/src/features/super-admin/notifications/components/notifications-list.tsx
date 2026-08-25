"use client";

import { useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "../hooks/use-notifications";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { CommonPagination } from "@/components/common/pagination";
import { FilterCard, FilterSelect } from "@/components/common/filters";
import { StatusBadge } from "@/components/common/status-badge";
import { extractApiError } from "@/lib/api/client";

type NotificationItem = {
  notification: {
    id: string;
    scope: "SYSTEM" | "RESTAURANT" | "USER"; 
    type?: string;
    title: string; 
    message: string;
    isRead: boolean;
    entityType?: string | null;
    entityId?: string | null;
    createdAt: string;
  };
  organization?: { name: string } | null;
  restaurant?: { name: string } | null;
};

export function NotificationsList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading, isError } = useNotifications({
    page,
    limit,
    isRead: filter === "unread" ? false : undefined,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications: NotificationItem[] = data?.data ?? [];
  const totalPages = data?.meta ? Math.ceil(data.meta.total / data.meta.limit) : 1;
  const totalItems = data?.meta?.total ?? 0;

  const handleMarkRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync(filter === "unread" ? { isRead: false } : undefined);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error(extractApiError(err).message);
    }
  };

  return (
    <div className="space-y-4">
      <FilterCard
        title="Notification Filters"
        activeCount={filter === "all" ? 0 : 1}
        chips={filter === "all" ? [] : [{ key: "filter", label: "Status", value: filter, onRemove: () => setFilter("all") }]}
        onClear={() => setFilter("all")}
      >
        <FilterSelect
          value={filter}
          onChange={(val) => { setFilter(val as "all" | "unread"); setPage(1); }}
          label="Filter Status"
          options={[
            { value: "all", label: "All Notifications" },
            { value: "unread", label: "Unread Only" },
          ]}
        />
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={isLoading || markAllReadMutation.isPending || notifications.every((item) => item.notification.isRead)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm"
          >
            {markAllReadMutation.isPending ? "Updating..." : "Mark all read"}
          </button>
        </div>
      </FilterCard>

      <div className="bg-white shadow-sm border rounded-xl overflow-hidden divide-y">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <div className="p-8 text-center text-rose-600 font-semibold text-sm">Failed to load notifications.</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-900 font-bold mb-1">No notifications found</div>
            <p className="text-xs text-slate-500 font-medium">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div key={item.notification.id} className={`p-4 flex gap-4 transition-colors ${item.notification.isRead ? 'bg-white opacity-80' : 'bg-blue-50/40'}`}>
              <div className="mt-1">
                {!item.notification.isRead ? (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                ) : (
                  <span className="flex h-2.5 w-2.5 rounded-full bg-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className={`text-sm ${item.notification.isRead ? 'text-slate-800 font-medium' : 'text-slate-950 font-bold'}`}>
                      {item.notification.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">{item.notification.message}</p>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <span className="rounded-full bg-slate-100 border px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {item.notification.scope}
                      </span>
                      {item.notification.type ? (
                        <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                          {item.notification.type}
                        </span>
                      ) : null}
                      {item.organization?.name ? (
                        <span className="text-[11px] font-semibold text-slate-500">{item.organization.name}</span>
                      ) : null}
                      {item.restaurant?.name ? (
                        <span className="text-[11px] font-semibold text-slate-500">• {item.restaurant.name}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      {format(new Date(item.notification.createdAt), "MMM d, HH:mm")}
                    </span>
                    <StatusBadge status={item.notification.isRead ? "READ" : "UNREAD"} />
                  </div>
                </div>
                {!item.notification.isRead && (
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={markReadMutation.isPending}
                      onClick={() => void handleMarkRead(item.notification.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Mark as read
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <CommonPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
        showPageSize
        loading={isLoading}
      />
    </div>
  );
}
