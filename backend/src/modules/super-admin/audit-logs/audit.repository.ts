import { and, between, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { auditLogs, restaurants, superAdmins, admins, employees } from "../../../db/schema/index.js";
import type { ListAuditLogsQuery } from "./audit.types.js";

export class AuditRepository {
  async list(query: ListAuditLogsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [];

    if (query.action) filters.push(eq(auditLogs.action, query.action));
    if (query.module) filters.push(eq(auditLogs.module, query.module));
    if (query.entityType) filters.push(eq(auditLogs.entityType, query.entityType));
    if (query.actorRole) filters.push(eq(auditLogs.actorRole, query.actorRole as "SUPER_ADMIN" | "RESTAURANT_ADMIN" | "WAITER" | "KITCHEN" | "RECEPTION"));
    if (query.restaurantId) filters.push(eq(auditLogs.restaurantId, query.restaurantId));
    if (query.requestId) filters.push(eq(auditLogs.requestId, query.requestId));
    // Note: actorUserId filtering is omitted or needs to be mapped to all 3 columns

    if (query.from && query.to) {
      filters.push(between(auditLogs.createdAt, new Date(query.from), new Date(query.to)));
    } else if (query.from) {
      filters.push(gte(auditLogs.createdAt, new Date(query.from)));
    } else if (query.to) {
      filters.push(lte(auditLogs.createdAt, new Date(query.to)));
    }

    if (query.search) {
      filters.push(
        or(
          ilike(auditLogs.action, `%${query.search}%`),
          ilike(auditLogs.entityPublicId, `%${query.search}%`),
          ilike(auditLogs.description, `%${query.search}%`),
          ilike(auditLogs.requestId, `%${query.search}%`)
        )!
      );
    }

    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({
        audit: auditLogs,
        superAdmin: {
          id: superAdmins.id,
          publicId: superAdmins.publicId,
          name: superAdmins.name,
          email: superAdmins.email,
        },
        admin: {
          id: admins.id,
          publicId: admins.publicId,
          name: admins.fullName,
          email: admins.email,
        },
        employee: {
          id: employees.id,
          publicId: employees.publicId,
          name: employees.fullName,
          email: employees.email,
        },
        restaurant: {
          id: restaurants.id,
          publicId: restaurants.publicId,
          name: restaurants.name,
        },
      })
      .from(auditLogs)
      .leftJoin(superAdmins, eq(auditLogs.actorSuperAdminId, superAdmins.id))
      .leftJoin(admins, eq(auditLogs.actorAdminId, admins.id))
      .leftJoin(employees, eq(auditLogs.actorEmployeeId, employees.id))
      .leftJoin(restaurants, eq(auditLogs.restaurantId, restaurants.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ value: count() }).from(auditLogs).where(where);

    const formattedRows = rows.map(row => ({
      ...row,
      actor: row.superAdmin || row.admin || row.employee || null
    }));

    return { rows: formattedRows, total: total?.value ?? 0, page, limit };
  }

  async detail(id: string) {
    const [row] = await db
      .select({
        audit: auditLogs,
        superAdmin: {
          id: superAdmins.id,
          publicId: superAdmins.publicId,
          name: superAdmins.name,
          email: superAdmins.email,
        },
        admin: {
          id: admins.id,
          publicId: admins.publicId,
          name: admins.fullName,
          email: admins.email,
        },
        employee: {
          id: employees.id,
          publicId: employees.publicId,
          name: employees.fullName,
          email: employees.email,
        },
        restaurant: {
          id: restaurants.id,
          publicId: restaurants.publicId,
          name: restaurants.name,
        },
      })
      .from(auditLogs)
      .leftJoin(superAdmins, eq(auditLogs.actorSuperAdminId, superAdmins.id))
      .leftJoin(admins, eq(auditLogs.actorAdminId, admins.id))
      .leftJoin(employees, eq(auditLogs.actorEmployeeId, employees.id))
      .leftJoin(restaurants, eq(auditLogs.restaurantId, restaurants.id))
      .where(eq(auditLogs.id, id));

    if (!row) return null;
    
    return {
      ...row,
      actor: row.superAdmin || row.admin || row.employee || null
    };
  }

  /** Get all distinct actions for use in filter dropdowns */
  async listDistinctActions() {
    const rows = await db.selectDistinct({ action: auditLogs.action }).from(auditLogs);
    return rows.map((r) => r.action);
  }

  /** Get all distinct modules for use in filter dropdowns */
  async listDistinctModules() {
    const rows = await db.selectDistinct({ module: auditLogs.module }).from(auditLogs);
    return rows.map((r) => r.module).filter(Boolean);
  }
}
