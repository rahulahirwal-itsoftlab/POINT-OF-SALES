"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChefHat,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShieldCheck,
  Store,
  Table2,
  Users,
  X,
} from "lucide-react";
import { navigationSections } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";

import { RestaurantBranding } from "@/components/common/restaurant-branding";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Restaurants: Store,
  Subscriptions: ReceiptText,
  Licenses: ShieldCheck,
  Notifications: Bell,
  Settings: Settings,
  Staff: Users,
  Bills: ReceiptText,
  Subscription: ReceiptText,
  "Audit Logs": ClipboardList,
  Menu: ChefHat,
  Orders: ClipboardList,
  Tables: Table2,
  Customers: Users,
  "Kitchen Orders": ClipboardList,
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Platform Steward",
  RESTAURANT_ADMIN: "Restaurant Admin",
  RECEPTION: "Receptionist",
  WAITER: "Waiter",
  KITCHEN: "Kitchen",
};

export function Sidebar({ role, isOpen = false, onClose }: { role?: string; isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const sections = navigationSections
    .map((section) => ({
      ...section,
      items: section.roles.includes(role as never) ? section.items : [],
    }))
    .filter((section) => section.items.length > 0);

  const isSuperAdmin = role === "SUPER_ADMIN";

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-5" style={{ borderColor: "var(--border-soft)" }}>
        <div className="flex items-center justify-between gap-3">
          {isSuperAdmin ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl heritage-button-primary">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <div className="heritage-heading text-xl font-bold leading-none">Royal POS</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                  {roleLabels[role ?? ""] ?? "Restaurant"}
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <RestaurantBranding size="lg" />
              <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                {roleLabels[role ?? ""] ?? "Restaurant"}
              </div>
            </div>
          )}
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-lg p-2 lg:hidden" aria-label="Close navigation">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = iconMap[item.label] ?? LayoutDashboard;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition duration-200",
                      active ? "shadow-sm" : "hover:translate-x-0.5",
                    )}
                    style={{
                      background: active ? "var(--primary)" : "transparent",
                      color: active ? "#fffaf0" : "var(--text)",
                    }}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-md transition"
                      style={{
                        background: active ? "rgb(255 250 240 / 0.14)" : "color-mix(in srgb, var(--surface-strong) 55%, transparent)",
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                    {active ? (
                      <span className="absolute right-2 h-6 w-1 rounded-full" style={{ background: "var(--accent-strong)" }} />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-xl border p-3 text-xs" style={{ borderColor: "var(--border-soft)", background: "var(--background-subtle)", color: "var(--muted)" }}>
        <div className="font-bold" style={{ color: "var(--text)" }}>Service ready</div>
        <div className="mt-1">Role-aware navigation is synced with your session.</div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="sticky top-0 hidden h-screen max-h-screen w-72 shrink-0 border-r overflow-y-auto lg:block"
        style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}
      >
        {content}
      </aside>
      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-label="Close navigation overlay"
          />
          <aside
            className="relative h-full w-80 max-w-[86vw] overflow-y-auto border-r shadow-2xl"
            style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}
          >
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
