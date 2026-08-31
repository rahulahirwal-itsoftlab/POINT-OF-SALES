import { useQuery } from "@tanstack/react-query";
import { getRestaurant, listRestaurants, type ListRestaurantsParams } from "../api/restaurant-api";

export function useRestaurants(params?: ListRestaurantsParams) {
  return useQuery({
    queryKey: ["super-admin", "restaurants", params],
    queryFn: () => listRestaurants(params),
  });
}

export function useRestaurantDetail(id?: string) {
  return useQuery({
    queryKey: ["super-admin", "restaurant-detail", id],
    queryFn: () => getRestaurant(id!),
    enabled: Boolean(id),
  });
}
