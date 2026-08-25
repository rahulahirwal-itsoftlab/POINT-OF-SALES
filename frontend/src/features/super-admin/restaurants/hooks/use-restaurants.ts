"use client";

import { useQuery } from "@tanstack/react-query";
import { listRestaurants, type ListRestaurantsParams } from "../api/restaurant-api";

export function useRestaurants(params?: ListRestaurantsParams) {
  return useQuery({
    queryKey: ["super-admin", "restaurants", params],
    queryFn: () => listRestaurants(params),
  });
}
