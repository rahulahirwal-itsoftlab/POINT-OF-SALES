import { requireRestaurantAdmin } from "@/features/auth/server/require-current-user";

export default async function RestaurantAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRestaurantAdmin("/restaurant-admin/dashboard");
  return children;
}
