"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Gauge,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  UserCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLogout } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/super-admin.api";
import type { AuthUser } from "@/features/auth/types/auth.types";
import { useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";

const items = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: Gauge },
  { label: "Restaurants", href: "/super-admin/restaurants", icon: Building2 },
  { label: "Subscriptions", href: "/super-admin/subscriptions", icon: Receipt },
  { label: "Licenses", href: "/super-admin/licenses", icon: ShieldCheck },
  { label: "Notifications", href: "/super-admin/notifications", icon: Bell },
  { label: "Settings", href: "/super-admin/settings", icon: Settings },
] as const;

function titleForPath(pathname: string) {
  if (pathname.startsWith("/super-admin/revenue")) return "Revenue";
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => pathname.startsWith(item.href));
  return current?.label ?? "Super Admin";
}

export function SuperAdminShell({ children, user }: { children: React.ReactNode; user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const unread = useQuery({
    queryKey: ["super-admin", "notifications", "unread-count"],
    queryFn: () => superAdminApi.listNotifications({ page: 1, limit: 1, isRead: false }),
    staleTime: 30_000,
  });

  const unreadCount = Number(unread.data?.meta?.total ?? 0);
  async function handleLogout() {
    await logout.mutateAsync();
    router.replace("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
        <div className="border-b px-6 py-5" style={{ borderColor: "var(--border-soft)" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl heritage-button-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="heritage-heading text-xl font-bold leading-none">Royal POS</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>Super Admin Console</div>
              </div>
            </div>
            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 lg:hidden" aria-label="Close navigation">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/super-admin/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:translate-x-0.5",
                  active && "shadow-sm",
                )}
                style={{
                  background: active ? "var(--primary)" : "transparent",
                  color: active ? "#fffaf0" : "var(--text)",
                }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: active ? "rgb(255 250 240 / 0.14)" : "color-mix(in srgb, var(--surface-strong) 55%, transparent)" }}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
                {item.label === "Notifications" && unreadCount > 0 ? (
                  <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px]", active ? "bg-white text-slate-950" : "")} style={!active ? { background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)" } : undefined}>
                    {unreadCount}
                  </span>
                ) : null}
                {active ? <span className="absolute right-2 h-6 w-1 rounded-full" style={{ background: "var(--accent-strong)" }} /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
  );

  return (
    <div className="min-h-screen" style={{ color: "var(--text)" }}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r lg:flex lg:flex-col" style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
        {sidebar}
      </aside>
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />
          <aside className="relative h-full w-80 max-w-[86vw] border-r shadow-2xl" style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b backdrop-blur-xl" style={{ borderColor: "var(--border-soft)", background: "color-mix(in srgb, var(--surface) 92%, transparent)" }}>
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border lg:hidden"
                style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>Super Admin</div>
                <h1 className="heritage-heading text-2xl font-bold leading-none">{titleForPath(pathname)}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/super-admin/notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border transition hover:-translate-y-0.5" style={{ borderColor: "var(--border-soft)", background: "var(--surface)", color: "var(--text)" }}>
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-center text-[10px] font-bold text-white" style={{ background: "var(--burgundy)" }}>{unreadCount}</span> : null}
              </Link>
              <ThemeToggle />
              <Link href="/super-admin/profile" className="hidden items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:-translate-y-0.5 sm:flex" style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}>
                <UserCircle className="h-4 w-4" style={{ color: "var(--muted)" }} />
                <span className="max-w-36 truncate">{user?.name ?? "Super Admin"}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logout.isPending}
                className="heritage-button-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="animate-[fadeInUp_180ms_ease-out]">{children}</div>
        </main>
      </div>
    </div>
  );
}
