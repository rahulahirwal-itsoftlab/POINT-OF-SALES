export type NotificationInput = {
  scope: "SYSTEM" | "RESTAURANT" | "USER";
  organizationId?: string | null;
  restaurantId?: string | null;
  recipientSuperAdminId?: string | null;
  recipientAdminId?: string | null;
  recipientEmployeeId?: string | null;
  recipientRole?: string | null;
  type?: string;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string;
  title: string;
  message: string;
};
