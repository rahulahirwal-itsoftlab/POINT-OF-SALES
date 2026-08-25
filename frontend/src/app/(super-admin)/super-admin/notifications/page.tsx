import { PageHeader } from "@/components/common/page-header";
import { NotificationsList } from "@/features/super-admin/notifications/components/notifications-list";

export default function SuperAdminNotificationsPage() {
  return (
    <div className="w-full space-y-6">
      <PageHeader title="Notifications" description="Platform alerts and system updates." />
      <NotificationsList />
    </div>
  );
}
