import { PageHeader } from "@/components/common/page-header";
import { RestaurantCreateForm } from "@/features/super-admin/restaurants/components/restaurant-create-form";

export default function CreateRestaurantPage() {
  return (
    <div>
      <PageHeader title="Add Restaurant" description="Create the restaurant, owner login, subscription, and license in one transaction." />
      <RestaurantCreateForm />
    </div>
  );
}
