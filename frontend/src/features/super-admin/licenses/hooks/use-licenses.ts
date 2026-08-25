import { useQuery } from "@tanstack/react-query";
import { listLicenses } from "../api/license-api";

export function useLicenses(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  expiresInDays?: string;
}) {
  return useQuery({
    queryKey: ["super-admin-licenses", params],
    queryFn: () => listLicenses(params),
  });
}
