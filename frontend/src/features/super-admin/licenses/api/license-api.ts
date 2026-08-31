import { apiClient } from "@/lib/api/client";

export type LicenseListItem = {
  license: {
    id: string;
    licenseKey: string;
    status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "BLOCKED" | "CANCELLED" | "REVOKED";
    issuedAt: string;
    expiresAt: string;
  };
  restaurant: {
    name: string;
    publicId: string;
    email?: string | null;
    phone?: string | null;
  };
  organization?: { name: string; publicId: string };
  subscription: {
    id: string;
    planNameSnapshot?: string | null;
    billingCycle: string;
    status: string;
    startDate: string;
    endDate: string;
    price: string;
    currency: string;
    waiterLimitSnapshot?: number | null;
    kitchenLimitSnapshot?: number | null;
    receptionistLimitSnapshot?: number | null;
    baseAmountSnapshot?: string | null;
    gstPercentageSnapshot?: string | null;
    gstAmountSnapshot?: string | null;
    finalAmountSnapshot?: string | null;
    durationMonthsSnapshot?: number | null;
  };
  plan: {
    planNumber?: string;
    name: string;
    planType?: string;
  };
};

export type RenewLicenseInput = {
  renewalType: "PREDEFINED" | "CUSTOMIZED";
  planId?: string;
  billingCycle: "MONTHLY" | "YEARLY";
  durationMonths?: number;
  startDate?: string;
  customPlan?: {
    name: string;
    description?: string;
    waiterLimit: number;
    kitchenLimit: number;
    receptionistLimit: number;
    basePrice: number;
    gstPercentage: number;
    features: string[];
  };
};

export type LicenseHistoryResponse = {
  subscriptions: Array<{
    subscription: LicenseListItem["subscription"] & { id: string };
    plan: LicenseListItem["plan"] & { code?: string; monthlyPrice?: string; yearlyPrice?: string };
  }>;
  licenses: LicenseListItem["license"][];
  auditLogs: Array<{ id: string; action: string; entityType: string; createdAt: string; newValues?: Record<string, unknown> | null }>;
};

export async function listLicenses(params?: {
  page?: number;
  limit?: number;
  status?: string;
  subscriptionStatus?: string;
  search?: string;
  expiresInDays?: string;
}): Promise<{ data: LicenseListItem[]; meta: { total: number; page: number; limit: number } }> {
  const response = await apiClient.get("/super-admin/licenses", { params });
  return response.data;
}

export async function activateLicense(id: string) {
  const response = await apiClient.post(`/super-admin/licenses/${id}/activate`);
  return response.data;
}

export async function suspendLicense(id: string) {
  const response = await apiClient.post(`/super-admin/licenses/${id}/suspend`);
  return response.data;
}

export async function revokeLicense(id: string) {
  const response = await apiClient.post(`/super-admin/licenses/${id}/revoke`);
  return response.data;
}

export async function renewLicense(id: string, input: RenewLicenseInput) {
  const response = await apiClient.post(`/super-admin/licenses/${id}/renew`, input);
  return response.data;
}

export async function getLicenseHistory(id: string): Promise<{ data: LicenseHistoryResponse }> {
  const response = await apiClient.get(`/super-admin/licenses/${id}/history`);
  return response.data;
}

export async function getLicenseDetail(id: string): Promise<{ data: LicenseListItem }> {
  const response = await apiClient.get(`/super-admin/licenses/${id}`);
  return response.data;
}

export async function triggerLicenseExpiry() {
  const response = await apiClient.post("/super-admin/licenses/trigger-expiry");
  return response.data;
}
