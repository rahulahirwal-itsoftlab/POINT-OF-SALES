import { useQuery } from "@tanstack/react-query";
import { getLicenseDetail, listLicenses } from "../api/license-api";

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

export function useLicenseDetail(id?: string) {
  return useQuery({
    queryKey: ["super-admin", "license-detail", id],
    queryFn: () => getLicenseDetail(id!),
    enabled: Boolean(id),
  });
}
