"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { createRestaurant } from "../api/restaurant-api";

export function useCreateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRestaurant,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "dashboard"] });
    },
  });
}
