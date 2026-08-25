import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { notifications, restaurants, superAdmins, admins, employees, organizations } from "../../../db/schema/index.js";
import type { ListNotificationsQuery } from "./notification.types.js";

export class NotificationRepository {
  async list(query: ListNotificationsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const superAdminCondition = query.recipientSuperAdminId
      ? or(eq(notifications.recipientSuperAdminId, query.recipientSuperAdminId), eq(notifications.recipientRole, "SUPER_ADMIN"))
      : eq(notifications.recipientRole, "SUPER_ADMIN");

    const filters = [
      superAdminCondition,
      query.scope ? eq(notifications.scope, query.scope) : undefined,
      query.isRead === undefined ? undefined : eq(notifications.isRead, query.isRead),
      query.organizationId ? eq(notifications.organizationId, query.organizationId) : undefined,
      query.restaurantId ? eq(notifications.restaurantId, query.restaurantId) : undefined,
      query.search ? or(ilike(notifications.title, `%${query.search}%`), ilike(notifications.message, `%${query.search}%`)) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = and(...filters);

    const rows = await db
      .select({ notification: notifications, organization: organizations, restaurant: restaurants, superAdmin: superAdmins, admin: admins, employee: employees })
      .from(notifications)
      .leftJoin(organizations, eq(notifications.organizationId, organizations.id))
      .leftJoin(superAdmins, eq(notifications.recipientSuperAdminId, superAdmins.id))
      .leftJoin(admins, eq(notifications.recipientAdminId, admins.id))
      .leftJoin(employees, eq(notifications.recipientEmployeeId, employees.id))
      .leftJoin(restaurants, eq(notifications.restaurantId, restaurants.id))
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await db.select({ value: count() }).from(notifications).where(where);
    return { rows, total: total.value, page, limit };
  }

  async detail(id: string) {
    const [row] = await db
      .select({ notification: notifications, organization: organizations, restaurant: restaurants, superAdmin: superAdmins, admin: admins, employee: employees })
      .from(notifications)
      .leftJoin(organizations, eq(notifications.organizationId, organizations.id))
      .leftJoin(superAdmins, eq(notifications.recipientSuperAdminId, superAdmins.id))
      .leftJoin(admins, eq(notifications.recipientAdminId, admins.id))
      .leftJoin(employees, eq(notifications.recipientEmployeeId, employees.id))
      .leftJoin(restaurants, eq(notifications.restaurantId, restaurants.id))
      .where(eq(notifications.id, id));
    return row;
  }

  async markRead(id: string) {
    const [row] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return row;
  }

  async markAllRead(query: ListNotificationsQuery) {
    const superAdminCondition = query.recipientSuperAdminId
      ? or(eq(notifications.recipientSuperAdminId, query.recipientSuperAdminId), eq(notifications.recipientRole, "SUPER_ADMIN"))
      : eq(notifications.recipientRole, "SUPER_ADMIN");

    const filters = [
      superAdminCondition,
      eq(notifications.isRead, false),
      query.scope ? eq(notifications.scope, query.scope) : undefined,
      query.organizationId ? eq(notifications.organizationId, query.organizationId) : undefined,
      query.restaurantId ? eq(notifications.restaurantId, query.restaurantId) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));

    const rows = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(...filters))
      .returning({ id: notifications.id });

    return rows.length;
  }
}
