import { PageHeader } from "@/components/common/page-header";

export default async function LicenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageHeader title="License Details" description={`License record: ${id}`} />;
}
