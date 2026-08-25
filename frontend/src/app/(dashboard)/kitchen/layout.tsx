import { requireRole } from "@/features/auth/server/require-current-user";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  await requireRole("/kitchen/orders", ["KITCHEN"]);
  return children;
}
