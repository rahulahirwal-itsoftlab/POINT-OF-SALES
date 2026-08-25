import { WaiterNewOrderPage } from "@/features/staff-pos/components";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WaiterNewOrderPage initialOrderId={id} />;
}
