import { useQuery } from "@tanstack/react-query";
import { listPayments } from "../api/payment-api";
import type { ListPaymentsParams } from "../types/payment.types";

export function usePayments(params: ListPaymentsParams) {
  return useQuery({
    queryKey: ["super-admin-payments", params],
    queryFn: () => listPayments(params),
  });
}
