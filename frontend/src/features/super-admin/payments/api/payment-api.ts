import { apiClient } from "@/lib/api/client";
import type { ListPaymentsParams, PaymentListItem } from "../types/payment.types";

export async function listPayments(params?: ListPaymentsParams): Promise<{ data: PaymentListItem[]; meta: { total: number; page: number; limit: number } }> {
  const response = await apiClient.get("/super-admin/payments", { params });
  return response.data;
}
