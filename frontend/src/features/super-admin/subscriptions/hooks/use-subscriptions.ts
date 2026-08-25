import { useQuery } from "@tanstack/react-query";
import { listSubscriptions } from "../api/subscription-api";
import { queryKeys } from "@/lib/query/query-keys";

export function useSubscriptions(params?: {
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
}) {
  return useQuery({
    queryKey: [...queryKeys.subscriptions, params],
    queryFn: () => listSubscriptions(params),
  });
}

