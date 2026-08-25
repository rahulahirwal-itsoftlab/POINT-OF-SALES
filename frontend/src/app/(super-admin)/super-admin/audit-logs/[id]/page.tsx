import { PageHeader } from "@/components/common/page-header";

export default async function AuditLogDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageHeader title="Audit Log Details" description={`Audit event: ${id}`} />;
}
