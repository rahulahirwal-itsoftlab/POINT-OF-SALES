import { PageHeader } from "@/components/common/page-header";

export default async function PlanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageHeader title="Plan Details" description={`Plan record: ${id}`} />;
}
