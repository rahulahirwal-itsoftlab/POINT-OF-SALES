import { apiClient } from "@/lib/api/client";

export async function listPlans() {
  const response = await apiClient.get("/super-admin/plans");
  return response.data;
}

export type PlanPayload = {
  code?: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  durationMonths: number;
  gstPercentage: number;
  features: string[];
  waiterLimit: number;
  kitchenLimit: number;
  receptionistLimit: number;
  maxUsers?: number;
  maxTables?: number;
  maxMenuItems?: number;
  isActive?: boolean;
};

export async function createPlan(input: PlanPayload) {
  const response = await apiClient.post("/super-admin/plans", input);
  return response.data;
}

export async function updatePlan(id: string, input: Partial<PlanPayload>) {
  const response = await apiClient.patch(`/super-admin/plans/${id}`, input);
  return response.data;
}

export async function updatePlanStatus(id: string, isActive: boolean) {
  const response = await apiClient.patch(`/super-admin/plans/${id}/status`, { isActive });
  return response.data;
}
