"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { updateSubscription } from "../../restaurants/api/restaurant-api";

export type UpdateSubscriptionPayload = {
  subscriptionId: string;
  price?: number;
  billingCycle?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  restaurantId?: string;
};

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId, ...data }: UpdateSubscriptionPayload) => updateSubscription(subscriptionId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      if (variables.restaurantId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.restaurant(variables.restaurantId) });
      }
    },
  });
}

export function useDeactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId }: { subscriptionId: string; restaurantId?: string }) =>
      updateSubscription(subscriptionId, { status: "SUSPENDED" }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      if (variables.restaurantId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.restaurant(variables.restaurantId) });
      }
    },
  });
}
