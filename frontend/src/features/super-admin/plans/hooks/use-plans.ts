"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { listPlans } from "../api/plan-api";

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: listPlans,
  });
}
