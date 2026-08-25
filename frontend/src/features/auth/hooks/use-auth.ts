"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { beginLogout, finishLogout } from "@/lib/auth/session-state";
import { getCurrentUser, login, logout } from "../api/auth-api";
import type { LoginFormValues } from "../types/auth.types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LoginFormValues) => login(values),
    onSuccess: async () => {
      finishLogout();
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onMutate: async () => {
      beginLogout();
      await queryClient.cancelQueries();
    },
    onSuccess: async () => {
      queryClient.clear();
    },
    onError: () => {
      finishLogout();
      queryClient.clear();
    },
  });
}
