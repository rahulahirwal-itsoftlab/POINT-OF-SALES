import { requireRole } from "@/features/auth/server/require-current-user";

export default async function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  await requireRole("/receptionist/dashboard", ["RECEPTION"]);
  return children;
}
