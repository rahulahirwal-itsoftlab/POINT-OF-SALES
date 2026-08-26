import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api/client";
import type { AuthUser } from "../types/auth.types";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error?: {
    code?: string;
  };
};

function loginRedirect(nextPath: string): never {
  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

export function getDashboardForRole(role: AuthUser["role"]): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "RESTAURANT_ADMIN":
      return "/restaurant-admin/dashboard";
    case "RECEPTION":
      return "/receptionist/dashboard";
    case "WAITER":
      return "/waiter/orders";
    case "KITCHEN":
      return "/kitchen/orders";
    default:
      return "/login";
  }
}

export async function requireCurrentUser(nextPath: string): Promise<AuthUser> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  if (!cookieHeader) {
    loginRedirect(nextPath);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      credentials: "include",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });
  } catch {
    loginRedirect(nextPath);
  }

  if (response.status === 401) {
    loginRedirect(nextPath);
  }

  if (response.status === 403) {
    redirect("/login?reason=forbidden");
  }

  if (response.status >= 500) {
    redirect("/login?reason=unavailable");
  }

  if (!response.ok) {
    loginRedirect(nextPath);
  }

  const payload = (await response.json()) as
    | ApiSuccess<{ user: AuthUser }>
    | ApiError;
  if (!payload.success) {
    loginRedirect(nextPath);
  }

  return payload.data.user;
}

export async function requireSuperAdmin(nextPath: string): Promise<AuthUser> {
  const user = await requireCurrentUser(nextPath);

  if (user.status !== "ACTIVE") {
    redirect("/login?reason=forbidden");
  }

  if (user.role !== "SUPER_ADMIN") {
    redirect(getDashboardForRole(user.role));
  }

  return user;
}

export async function requireRestaurantAdmin(
  nextPath: string,
): Promise<AuthUser> {
  const user = await requireCurrentUser(nextPath);

  if (user.status !== "ACTIVE") {
    redirect("/login?reason=forbidden");
  }

  if (user.role !== "RESTAURANT_ADMIN" || !user.restaurantIds?.length) {
    redirect(getDashboardForRole(user.role));
  }

  return user;
}

export async function requireRole(
  nextPath: string,
  roles: AuthUser["role"][],
): Promise<AuthUser> {
  const user = await requireCurrentUser(nextPath);

  if (user.status !== "ACTIVE") {
    redirect("/login?reason=forbidden");
  }

  if (
    !roles.includes(user.role) ||
    (user.role !== "SUPER_ADMIN" && !user.restaurantIds?.length)
  ) {
    redirect(getDashboardForRole(user.role));
  }

  return user;
}
