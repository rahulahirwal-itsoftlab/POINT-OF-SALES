import { requireSuperAdmin } from "@/features/auth/server/require-current-user";
import { SuperAdminShell } from "@/components/layout/super-admin-shell";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin("/super-admin/dashboard");
  return <SuperAdminShell user={user}>{children}</SuperAdminShell>;
}
