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
    onSuccess: async (data) => {
      finishLogout();
      const accessToken = data?.data?.accessToken;
      const refreshToken = data?.data?.referenceToken;
      if (typeof document !== "undefined") {
        const isHttps = window.location.protocol === "https:";
        const secureFlag = isHttps ? "; Secure" : "";
        if (accessToken) {
          document.cookie = `pos_access_token=${accessToken}; Path=/; SameSite=Lax${secureFlag}`;
        }
        if (refreshToken) {
          document.cookie = `pos_refresh_token=${refreshToken}; Path=/; SameSite=Lax${secureFlag}`;
        }
      }
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
      if (typeof document !== "undefined") {
        document.cookie = "pos_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "pos_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      await queryClient.cancelQueries();
    },
    onSuccess: async () => {
      queryClient.clear();
    },
    onError: () => {
      finishLogout();
      if (typeof document !== "undefined") {
        document.cookie = "pos_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "pos_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      queryClient.clear();
    },
  });
}
