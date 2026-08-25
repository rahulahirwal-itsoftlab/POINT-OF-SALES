import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/features/auth/server/require-current-user";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser("/dashboard");
  return <AppShell role={user.role}>{children}</AppShell>;
}
