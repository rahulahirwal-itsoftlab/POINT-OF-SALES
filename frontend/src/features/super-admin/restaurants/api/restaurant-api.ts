import { apiClient } from "@/lib/api/client";
import type { CreateRestaurantInput, UpdateRestaurantInput } from "../types/restaurant.types";

export type ListRestaurantsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  subscriptionStatus?: string;
  licenseStatus?: string;
};

export async function listRestaurants(params?: ListRestaurantsParams) {
  const response = await apiClient.get("/super-admin/restaurants", { params });
  return response.data;
}

export async function getRestaurant(id: string) {
  const response = await apiClient.get(`/super-admin/restaurants/${id}`);
  return response.data;
}

export async function createRestaurant(input: CreateRestaurantInput) {
  const response = await apiClient.post("/super-admin/restaurants", input);
  return response.data;
}

export async function updateRestaurant(id: string, input: UpdateRestaurantInput) {
  const response = await apiClient.patch(`/super-admin/restaurants/${id}`, input);
  return response.data;
}

export async function updateRestaurantStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED") {
  const response = await apiClient.patch(`/super-admin/restaurants/${id}/status`, { status });
  return response.data;
}

export async function activateRestaurant(id: string) {
  const response = await apiClient.patch(`/super-admin/restaurants/${id}/activate`);
  return response.data;
}

export async function deactivateRestaurant(id: string) {
  const response = await apiClient.patch(`/super-admin/restaurants/${id}/deactivate`);
  return response.data;
}

export async function blockRestaurant(id: string) {
  const response = await apiClient.patch(`/super-admin/restaurants/${id}/block`);
  return response.data;
}

export async function unblockRestaurant(id: string) {
  const response = await apiClient.patch(`/super-admin/restaurants/${id}/unblock`);
  return response.data;
}

export async function updateSubscription(
  id: string,
  input: {
    planId?: string;
    price?: number;
    billingCycle?: string;
    startDate?: string;
    endDate?: string;
    durationMonths?: number;
    status?: string;
    reason?: string;
  }
) {
  const response = await apiClient.patch(`/super-admin/subscriptions/${id}`, input);
  return response.data;
}

