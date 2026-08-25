import { notifications } from "../../db/schema/index.js";
import type { Database } from "../../config/database.js";
import { db as defaultDb } from "../../config/database.js";
import type { NotificationInput } from "./notification.types.js";

export class NotificationService {
  constructor(private readonly database: Database = defaultDb) {}

  async create(input: NotificationInput) {
    await this.database.insert(notifications).values({
      scope: input.scope,
      organizationId: input.organizationId ?? undefined,
      restaurantId: input.restaurantId ?? undefined,
      recipientSuperAdminId: input.recipientSuperAdminId ?? undefined,
      recipientAdminId: input.recipientAdminId ?? undefined,
      recipientEmployeeId: input.recipientEmployeeId ?? undefined,
      recipientRole: input.recipientRole ?? undefined,
      type: input.type ?? undefined,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? undefined,
      entityId: input.entityId ?? undefined,
      dedupeKey: input.dedupeKey ?? undefined,
    }).onConflictDoNothing();
  }
}

export const notificationService = new NotificationService();
