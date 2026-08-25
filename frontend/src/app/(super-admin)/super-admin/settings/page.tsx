import { PageHeader } from "@/components/common/page-header";
import { SettingsForm } from "@/features/super-admin/settings/components/settings-form";

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Platform-level settings and safeguards." />
      <SettingsForm />
    </div>
  );
}
