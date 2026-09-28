"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSuperAdmin,
  getFranchiseAuditLogs,
  getFranchiseDashboard,
  getFranchiseLicense,
  getFranchiseNotifications,
  getSuperAdmin,
  getSuperAdmins,
  renewFranchiseLicense,
  toggleSuperAdminStatus,
  updateSuperAdmin,
  type SuperAdminInput,
  type SuperAdminUpdateInput,
} from "./api";

export function useFranchiseDashboard() {
  return useQuery({
    queryKey: ["franchise-admin", "dashboard"],
    queryFn: getFranchiseDashboard,
    refetchInterval: 30_000,
  });
}

export function useSuperAdmins() {
  return useQuery({
    queryKey: ["franchise-admin", "super-admins"],
    queryFn: getSuperAdmins,
  });
}

export function useSuperAdmin(id: string) {
  return useQuery({
    queryKey: ["franchise-admin", "super-admins", id],
    queryFn: () => getSuperAdmin(id),
    enabled: Boolean(id),
  });
}

export function useCreateSuperAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SuperAdminInput) => createSuperAdmin(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "super-admins"] });
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "dashboard"] });
    },
  });
}

export function useUpdateSuperAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SuperAdminUpdateInput }) =>
      updateSuperAdmin({ id, data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "super-admins"] });
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "super-admins", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "dashboard"] });
    },
  });
}

export function useToggleSuperAdminStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      toggleSuperAdminStatus({ id, status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "super-admins"] });
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "super-admins", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "dashboard"] });
    },
  });
}

export function useFranchiseLicense() {
  return useQuery({
    queryKey: ["franchise-admin", "license"],
    queryFn: getFranchiseLicense,
  });
}

export function useRenewFranchiseLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (durationMonths: number) => renewFranchiseLicense(durationMonths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "license"] });
      queryClient.invalidateQueries({ queryKey: ["franchise-admin", "dashboard"] });
    },
  });
}

export function useFranchiseNotifications() {
  return useQuery({
    queryKey: ["franchise-admin", "notifications"],
    queryFn: getFranchiseNotifications,
    refetchInterval: 30_000,
  });
}

export function useFranchiseAuditLogs() {
  return useQuery({
    queryKey: ["franchise-admin", "audit-logs"],
    queryFn: getFranchiseAuditLogs,
  });
}
