import { PageHeader } from "@/components/common/page-header";
import { RevenueOverview } from "@/features/super-admin/revenue/components/revenue-overview";
import { RevenueChart } from "@/features/super-admin/revenue/components/revenue-chart";

export default function SuperAdminRevenuePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Revenue" description="Platform MRR, ARR, and payment history." />
      <RevenueOverview />
      <RevenueChart />
    </div>
  );
}
