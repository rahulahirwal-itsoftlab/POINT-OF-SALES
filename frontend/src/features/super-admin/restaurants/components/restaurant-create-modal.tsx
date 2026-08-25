"use client";

import { CommonModal } from "@/components/common/modal";
import { RestaurantCreateForm } from "./restaurant-create-form";

type RestaurantCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function RestaurantCreateModal({ isOpen, onClose }: RestaurantCreateModalProps) {
  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Restaurant"
      description="Create the restaurant tenant, initial admin credentials, subscription plan, and license in a single transaction."
      variant="form"
      size="xl"
      showFooter={false}
    >
      <RestaurantCreateForm onSuccess={onClose} />
    </CommonModal>
  );
}
