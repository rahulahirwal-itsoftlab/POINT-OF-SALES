import { PageHeader } from "@/components/common/page-header";
import { PlanListPage } from "@/features/super-admin/plans/components/plan-list-page";

export default function SuperAdminSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Manage restaurant plans and billing cycles." />
      <PlanListPage embedded />
    </div>
  );
}
