"use client";

import { useEffect, useState } from "react";
import { superAdminApi } from "@/lib/api/super-admin.api";
import { format } from "date-fns";
import { FilterCard, FilterSearchInput } from "@/components/common/filters";
import { useDebounce } from "@/hooks/use-debounce";

import { CommonPagination } from "@/components/common/pagination";

type AuditLog = {
  id: string;
  action: string;
  module: string;
  entityId: string;
  entityType: string;
  actorId: string;
  actorRole: string;
  restaurantId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export function AuditLogsTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchLogs = (currentPage: number, currentLimit: number, search: string) => {
    setLoading(true);
    superAdminApi.listAuditLogs({ page: currentPage, limit: currentLimit, search })
      .then((res) => {
        setLogs(res.data);
        setTotal(res.meta.total);
        setTotalPages(Math.ceil(res.meta.total / res.meta.limit) || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs(page, limit, debouncedSearch);
  }, [page, limit, debouncedSearch]);

  return (
    <div className="space-y-4">
      <FilterCard
        title="Audit Filters"
        activeCount={searchTerm ? 1 : 0}
        chips={searchTerm ? [{ key: "search", label: "Search", value: searchTerm, onRemove: () => { setSearchTerm(""); setPage(1); } }] : []}
        onClear={() => { setSearchTerm(""); setPage(1); }}
      >
        <FilterSearchInput value={searchTerm} onChange={(value) => { setSearchTerm(value); setPage(1); }} placeholder="Search by action, description, or ID..." />
      </FilterCard>

      <div className="border bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Actor</th>
                <th className="px-6 py-3 font-medium">Entity</th>
                <th className="px-6 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{log.actorRole}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={log.actorId}>{log.actorId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium capitalize">{log.entityType}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]" title={log.entityId}>{log.entityId}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {log.description}
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
