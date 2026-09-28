"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { loginFormSchema } from "../schemas/auth.schema";
import type { LoginFormValues } from "../types/auth.types";
import { useCurrentUser, useLogin } from "../hooks/use-auth";
import { extractApiError } from "@/lib/api/client";

function defaultRouteForRole(role?: string) {
  if (role === "FRANCHISE_STEWARD") return "/franchise-steward/dashboard";
  if (role === "SUPER_ADMIN") return "/super-admin/dashboard";
  if (role === "RESTAURANT_ADMIN") return "/restaurant-admin/dashboard";
  if (role === "WAITER") return "/waiter/dashboard";
  if (role === "KITCHEN") return "/kitchen/orders";
  if (role === "RECEPTION") return "/receptionist/dashboard";
  return "/super-admin/dashboard";
}

function safeNextPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value === "/login") return null;
  return value;
}

function resolveRedirectPath(nextPath: string | null, role?: string) {
  const defaultRoute = defaultRouteForRole(role);
  if (!nextPath || nextPath === "/dashboard") {
    return defaultRoute;
  }
  if (role === "FRANCHISE_STEWARD" && (nextPath.startsWith("/franchise-steward") || nextPath.startsWith("/dashboard"))) return nextPath;
  if (role === "SUPER_ADMIN" && (nextPath.startsWith("/super-admin") || nextPath.startsWith("/dashboard"))) return nextPath;
  if (role === "RESTAURANT_ADMIN" && (nextPath.startsWith("/restaurant-admin") || nextPath.startsWith("/admin") || nextPath.startsWith("/dashboard"))) return nextPath;
  if (role === "WAITER" && (nextPath.startsWith("/waiter") || nextPath.startsWith("/dashboard"))) return nextPath;
  if (role === "KITCHEN" && (nextPath.startsWith("/kitchen") || nextPath.startsWith("/dashboard"))) return nextPath;
  if (role === "RECEPTION" && (nextPath.startsWith("/reception") || nextPath.startsWith("/dashboard"))) return nextPath;
  
  return defaultRoute;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = useLogin();
  const currentUser = useCurrentUser();
  const [showPassword, setShowPassword] = useState(false);
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);
  const loginError = loginMutation.isError ? extractApiError(loginMutation.error) : null;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
    // Let the currentUser effect handle the redirection once auth/me is refetched
  });

  useEffect(() => {
    const user = currentUser.data?.data?.user;
    if (!user) return;
    const targetRoute = resolveRedirectPath(nextPath, user.role);
    router.replace(targetRoute);
  }, [currentUser.data, nextPath, router]);

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label htmlFor="email" className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="superadmin@example.com"
          className="heritage-input mt-2 w-full rounded-xl px-4 py-3.5 text-sm outline-none transition duration-200"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="mt-2 text-sm text-red-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Password
        </label>
        <div className="relative mt-2">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="heritage-input w-full rounded-xl px-4 py-3.5 pr-12 text-sm outline-none transition duration-200"
            {...form.register("password")}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
            style={{ color: "var(--muted)" }}
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {form.formState.errors.password ? (
          <p className="mt-2 text-sm text-red-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      {loginMutation.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{loginError?.message ?? "Unable to sign in. Check your credentials and account status."}</p>
          {loginError?.requestId ? (
            <p className="mt-1 text-xs text-red-600">Reference ID: {loginError.requestId}</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="heritage-button-primary group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl px-4 py-3.5 text-sm font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
          <div className="relative h-full w-8 bg-white/20" />
        </div>
        {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        <span className="relative">Sign in</span>
      </button>
    </form>
  );
}
