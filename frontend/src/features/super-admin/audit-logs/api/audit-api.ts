import { apiClient } from "@/lib/api/client";

export type AuditLogListItem = {
  audit: {
    id: string;
    requestId: string | null;
    action: string;
    module: string | null;
    description: string | null;
    entityType: string;
    entityPublicId: string | null;
    actorRole: string;
    ipAddress: string | null;
    userAgent: string | null;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  };
  actor: {
    id: string;
    publicId: string;
    name: string;
    email: string;
  } | null;
  restaurant: {
    id: string;
    publicId: string;
    name: string;
  } | null;
};

export type AuditLogQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  module?: string;
  entityType?: string;
  actorRole?: string;
  restaurantId?: string;
  actorUserId?: string;
  requestId?: string;
  from?: string;
  to?: string;
};

export type AuditLogMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function listAuditLogs(
  params?: AuditLogQueryParams
): Promise<{ data: AuditLogListItem[]; meta: AuditLogMeta }> {
  const response = await apiClient.get("/super-admin/audit-logs", { params });
  return response.data;
}

export async function getAuditLogDetail(id: string): Promise<{ data: AuditLogListItem }> {
  const response = await apiClient.get(`/super-admin/audit-logs/${id}`);
  return response.data;
}

export async function getAuditLogFilters(): Promise<{
  data: { actions: string[]; modules: string[] };
}> {
  const response = await apiClient.get("/super-admin/audit-logs/filters");
  return response.data;
}
