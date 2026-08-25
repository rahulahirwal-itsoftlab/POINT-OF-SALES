import { PageHeader } from "@/components/common/page-header";
import { RestaurantEditForm } from "@/features/super-admin/restaurants/components/restaurant-edit-form";

export default async function EditRestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader title="Edit Restaurant" description="Update restaurant details, contact information, subscription rates, and status." />
      <RestaurantEditForm id={id} />
    </div>
  );
}
