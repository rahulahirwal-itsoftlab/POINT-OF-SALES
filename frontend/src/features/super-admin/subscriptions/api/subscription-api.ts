import { apiClient } from "@/lib/api/client";

export type SubscriptionListItem = {
  subscription: {
    id: string;
    status: string;
    billingCycle: string;
    price: string;
    currency: string;
    paymentStatus: string;
    startDate: string;
    endDate: string;
    renewalDate: string;
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
  };
};

export async function listSubscriptions(params?: {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  organizationId?: string;
  restaurantId?: string;
  planId?: string;
  billingCycle?: string;
  expiresInDays?: number;
  search?: string;
}): Promise<{ data: SubscriptionListItem[]; meta: { total: number; page: number; limit: number } }> {
  const response = await apiClient.get("/super-admin/subscriptions", { params });
  return response.data;
}
