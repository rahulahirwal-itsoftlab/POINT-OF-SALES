"use client";

import { PageHeader } from "@/components/common/page-header";
import Link from "next/link";
import { RestaurantTable } from "./restaurant-table";

export function RestaurantListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Restaurants"
        description="Manage platform tenant restaurants. View status, contact details, subscriptions, and licenses."
        actions={
          <Link
            href="/super-admin/restaurants/create"
            className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            + Add Restaurant
          </Link>
        }
      />
      <RestaurantTable />
    </div>
  );
}

