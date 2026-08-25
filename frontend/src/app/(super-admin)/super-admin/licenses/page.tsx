import { PageHeader } from "@/components/common/page-header";
import { LicensesTable } from "@/features/super-admin/licenses/components/licenses-table";

export default function SuperAdminLicensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Licenses" description="Manage restaurant licenses and access control." />
      <LicensesTable />
    </div>
  );
}
