import { apiClient } from "@/lib/api/client";

export interface FranchiseInfo {
  id: string;
  publicId?: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  maxSuperAdmins: number;
  status: string;
  licenseKey: string;
  licenseStatus: string;
  licenseExpiresAt: string;
  remainingDays: number;
}

export interface FranchiseMetrics {
  totalSuperAdmins: number;
  activeSuperAdmins: number;
  inactiveSuperAdmins: number;
}

export interface FranchiseDashboardData {
  franchise: FranchiseInfo;
  metrics: FranchiseMetrics;
}

export interface SuperAdminListItem {
  id: string;
  publicId?: string;
  name: string;
  email: string;
  phone?: string | null;
  status: "ACTIVE" | "INACTIVE";
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  restaurantCount?: number;
  restaurants?: Array<{ id: string; name: string }>;
}

export interface SuperAdminInput {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface SuperAdminUpdateInput {
  name?: string;
  phone?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface FranchiseLicenseData extends FranchiseInfo {
  daysRemaining?: number;
  calculatedStatus?: string;
}

export interface FranchiseNotification {
  id: string;
  title?: string;
  message?: string;
  type: string;
  scope?: string;
  createdAt: string;
  read?: boolean;
  [key: string]: any;
}

export interface FranchiseAuditLog {
  id: string;
  actorRole?: string;
  action: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  entityPublicId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export const getFranchiseDashboard = async (): Promise<FranchiseDashboardData> => {
  const res = await apiClient.get("/franchise-admin/dashboard");
  return res.data.data;
};

export const getSuperAdmins = async (): Promise<SuperAdminListItem[]> => {
  const res = await apiClient.get("/franchise-admin/super-admins");
  return res.data.data;
};

export const getSuperAdmin = async (id: string): Promise<SuperAdminListItem> => {
  const res = await apiClient.get(`/franchise-admin/super-admins/${id}`);
  return res.data.data;
};

export const createSuperAdmin = async (input: SuperAdminInput): Promise<SuperAdminListItem> => {
  const res = await apiClient.post("/franchise-admin/super-admins", input);
  return res.data.data;
};

export const updateSuperAdmin = async ({
  id,
  data,
}: {
  id: string;
  data: SuperAdminUpdateInput;
}): Promise<SuperAdminListItem> => {
  const res = await apiClient.patch(`/franchise-admin/super-admins/${id}`, data);
  return res.data.data;
};

export const toggleSuperAdminStatus = async ({
  id,
  status,
}: {
  id: string;
  status: "ACTIVE" | "INACTIVE";
}): Promise<SuperAdminListItem> => {
  const res = await apiClient.patch(`/franchise-admin/super-admins/${id}/status`, { status });
  return res.data.data;
};

export const getFranchiseLicense = async (): Promise<FranchiseLicenseData> => {
  const res = await apiClient.get("/franchise-admin/license");
  return res.data.data;
};

export const renewFranchiseLicense = async (durationMonths: number): Promise<any> => {
  const res = await apiClient.post("/franchise-admin/license/renew", { durationMonths });
  return res.data.data;
};

export const getFranchiseNotifications = async (): Promise<FranchiseNotification[]> => {
  const res = await apiClient.get("/franchise-admin/notifications");
  return res.data.data;
};

export const getFranchiseAuditLogs = async (): Promise<FranchiseAuditLog[]> => {
  const res = await apiClient.get("/franchise-admin/audit-logs");
  return res.data.data;
};
