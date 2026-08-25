"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, UserCircle } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Sidebar } from "@/components/navigation/sidebar";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/use-auth";
import { useReadRestaurantAdminNotification, useRestaurantAdminNotifications } from "@/features/restaurant-admin/hooks";
import { useMarkNotificationRead, useNotifications } from "@/features/super-admin/notifications/hooks/use-notifications";
import { useReadStaffNotification, useStaffNotifications } from "@/features/staff-pos/hooks";

const roleTitles: Record<string, string> = {
  RESTAURANT_ADMIN: "Restaurant Admin",
  RECEPTION: "Reception Console",
  WAITER: "Waiter Console",
  KITCHEN: "Kitchen Display",
  SUPER_ADMIN: "Super Admin Console",
};

type GenericNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType?: string | null;
  entityId?: string | null;
};

function StaffNotificationBell({ role }: { role: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useStaffNotifications({ limit: 15 });
  const readNotification = useReadStaffNotification();

  const notificationsList: GenericNotification[] = data?.data ?? [];
  const unreadCount = data?.meta?.unread ?? 0;

  async function handleNotificationClick(item: GenericNotification) {
    try {
      if (!item.isRead) await readNotification.mutateAsync(item.id);
      setIsOpen(false);
      if (item.entityType === "bill" && item.entityId) {
        router.push(`/receptionist/bills/${item.entityId}`);
      } else if (item.entityType === "order" && item.entityId) {
        router.push(role === "KITCHEN" ? `/kitchen/orders/${item.entityId}` : `/waiter/customers/${item.entityId}`);
      }
    } catch {
      // Ignore click error
    }
  }

  return (
    <NotificationBellDropdown
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      unreadCount={unreadCount}
      notificationsList={notificationsList}
      onNotificationClick={handleNotificationClick}
      viewAllPath={
        role === "RECEPTION"
          ? "/receptionist/notifications"
          : role === "WAITER"
          ? "/waiter/notifications"
          : "/kitchen/notifications"
      }
    />
  );
}

function RestaurantAdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useRestaurantAdminNotifications({ limit: 15 });
  const readNotification = useReadRestaurantAdminNotification();

  const notificationsList: GenericNotification[] = (data?.data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    entityType: n.entityType,
    entityId: n.entityId,
  }));
  const unreadCount = data?.meta?.unread ?? (data as { unread?: number } | undefined)?.unread ?? 0;

  async function handleNotificationClick(item: GenericNotification) {
    try {
      if (!item.isRead) await readNotification.mutateAsync(item.id);
      setIsOpen(false);
    } catch {
      // Ignore click error
    }
  }

  return (
    <NotificationBellDropdown
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      unreadCount={unreadCount}
      notificationsList={notificationsList}
      onNotificationClick={handleNotificationClick}
      viewAllPath="/restaurant-admin/notifications"
    />
  );
}

function SuperAdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { data } = useNotifications({ limit: 15 });
  const markRead = useMarkNotificationRead();

  const rawRows: Array<{ notification: GenericNotification }> = data?.data ?? [];
  const notificationsList: GenericNotification[] = rawRows.map((r) => r.notification);
  const unreadCount = notificationsList.filter((n) => !n.isRead).length;

  async function handleNotificationClick(item: GenericNotification) {
    try {
      if (!item.isRead) await markRead.mutateAsync(item.id);
      setIsOpen(false);
    } catch {
      // Ignore click error
    }
  }

  return (
    <NotificationBellDropdown
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      unreadCount={unreadCount}
      notificationsList={notificationsList}
      onNotificationClick={handleNotificationClick}
      viewAllPath="/super-admin/notifications"
    />
  );
}

function NotificationBellDropdown({
  isOpen,
  setIsOpen,
  unreadCount,
  notificationsList,
  onNotificationClick,
  viewAllPath,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  unreadCount: number;
  notificationsList: GenericNotification[];
  onNotificationClick: (item: GenericNotification) => void;
  viewAllPath: string;
}) {
  const router = useRouter();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border transition hover:-translate-y-0.5"
        style={{ borderColor: "var(--border-soft)", background: "var(--surface)", color: "var(--text)" }}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border p-3 shadow-xl sm:w-96" style={{ borderColor: "var(--border-soft)", background: "var(--surface)", boxShadow: "var(--shadow)" }}>
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border-soft)" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "color-mix(in srgb, var(--burgundy) 18%, transparent)", color: "var(--burgundy)" }}>
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {!notificationsList.length ? (
              <p className="p-3 text-center text-xs" style={{ color: "var(--muted)" }}>No notifications</p>
            ) : (
              notificationsList.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onNotificationClick(n)}
                  className="w-full cursor-pointer rounded-lg border p-3 text-left text-xs transition hover:-translate-y-0.5"
                  style={{
                    borderColor: n.isRead ? "var(--border-soft)" : "var(--accent)",
                    background: n.isRead ? "var(--background-subtle)" : "color-mix(in srgb, var(--accent) 14%, var(--surface))",
                  }}
                >
                  <div className="flex items-center justify-between font-semibold" style={{ color: "var(--text)" }}>
                    <span>{n.title}</span>
                    {!n.isRead && <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent-strong)" }}></span>}
                  </div>
                  <p className="mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>{n.message}</p>
                  {n.entityType === "bill" && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNotificationClick(n);
                        }}
                        className="heritage-button-primary inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition"
                      >
                        View Bill
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-2 border-t pt-2 text-center" style={{ borderColor: "var(--border-soft)" }}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(viewAllPath);
              }}
              className="text-xs font-semibold transition"
              style={{ color: "var(--text)" }}
            >
              View All Notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationBell({ role }: { role?: string }) {
  if (role === "RESTAURANT_ADMIN") return <RestaurantAdminNotificationBell />;
  if (role === "SUPER_ADMIN") return <SuperAdminNotificationBell />;
  if (role === "RECEPTION" || role === "WAITER" || role === "KITCHEN") return <StaffNotificationBell role={role} />;
  return null;
}

function UserProfileDropdown({ role }: { role?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: userResponse } = useCurrentUser();
  const router = useRouter();
  const logout = useLogout();

  const user = userResponse?.data?.user;

  async function handleLogout() {
    await logout.mutateAsync();
    router.replace("/login");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border p-1.5 transition hover:bg-slate-50"
        style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}
      >
        <UserCircle className="h-5 w-5" style={{ color: "var(--muted)" }} />
        {user ? (
          <span className="hidden text-xs font-semibold sm:inline-block max-w-[120px] truncate" style={{ color: "var(--text)" }}>
            {user.name}
          </span>
        ) : null}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border p-4 shadow-xl"
          style={{ borderColor: "var(--border-soft)", background: "var(--surface)", boxShadow: "var(--shadow)" }}
        >
          <div className="border-b pb-3" style={{ borderColor: "var(--border-soft)" }}>
            <p className="font-bold text-sm" style={{ color: "var(--text)" }}>
              {user?.name ?? "User"}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email ?? ""}</p>
            {role ? (
              <span className="mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: "var(--border-soft)", background: "var(--background-subtle)", color: "var(--muted)" }}>
                {role}
              </span>
            ) : null}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children, role }: { children: React.ReactNode; role?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await logout.mutateAsync();
    router.replace("/login");
  }

  const segment = pathname.split("/").pop()?.replace(/-/g, " ") || "Overview";

  return (
    <div className="flex min-h-screen" style={{ color: "var(--text)" }}>
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0">
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
                <div className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                  {roleTitles[role ?? ""] ?? "Dashboard"}
                </div>
                <h1 className="heritage-heading text-2xl font-bold capitalize leading-none">{segment}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell role={role} />
              <ThemeToggle />
              <UserProfileDropdown role={role} />
              <button
                type="button"
                onClick={handleLogout}
                disabled={logout.isPending}
                className="heritage-button-primary hidden sm:inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6">
          <div className="animate-[fadeInUp_180ms_ease-out]">{children}</div>
        </main>
      </div>
    </div>
  );
}
