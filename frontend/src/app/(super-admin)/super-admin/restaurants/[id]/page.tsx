import { PageHeader } from "@/components/common/page-header";
import { RestaurantDetails } from "@/features/super-admin/restaurants/components/restaurant-details";

export default async function RestaurantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <PageHeader title="Restaurant Details" description="Restaurant, owner, subscription, license, and audit context." />
      <RestaurantDetails id={id} />
    </div>
  );
}
