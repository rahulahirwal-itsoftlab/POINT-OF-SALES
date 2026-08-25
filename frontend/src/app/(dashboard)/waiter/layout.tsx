import { requireRole } from "@/features/auth/server/require-current-user";

export default async function WaiterLayout({ children }: { children: React.ReactNode }) {
  await requireRole("/waiter/dashboard", ["WAITER"]);
  return children;
}
