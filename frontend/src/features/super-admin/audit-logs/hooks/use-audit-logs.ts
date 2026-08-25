import { useQuery } from "@tanstack/react-query";
import { getAuditLogDetail, getAuditLogFilters, listAuditLogs, type AuditLogQueryParams } from "../api/audit-api";

export function useAuditLogs(params: AuditLogQueryParams) {
  return useQuery({
    queryKey: ["super-admin-audit-logs", params],
    queryFn: () => listAuditLogs(params),
    staleTime: 30_000,
  });
}

export function useAuditLogDetail(id: string | null) {
  return useQuery({
    queryKey: ["super-admin-audit-log-detail", id],
    queryFn: () => getAuditLogDetail(id!),
    enabled: !!id,
  });
}

export function useAuditLogFilters() {
  return useQuery({
    queryKey: ["super-admin-audit-log-filters"],
    queryFn: getAuditLogFilters,
    staleTime: 5 * 60_000,
  });
}
