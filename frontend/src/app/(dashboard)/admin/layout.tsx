import { requireRestaurantAdmin } from "@/features/auth/server/require-current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRestaurantAdmin("/admin/dashboard");
  return children;
}
