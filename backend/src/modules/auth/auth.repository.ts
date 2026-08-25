import { and, eq, gt, isNull, desc, sql } from "drizzle-orm";
import { db } from "../../config/database.js";
import {
  authSessions,
  auditLogs,
  superAdmins,
  admins,
  employees,
  loginActivity,
  licenses,
  organizations,
  restaurants,
  subscriptions,
} from "../../db/schema/index.js";
import { getLoggerContext } from "../../common/logger/logger.context.js";
import { logger } from "../../common/logger/logger.js";

export class AuthRepository {
  async findActiveLicenseForRestaurant(restaurantId: string) {
    const [row] = await db
      .select({ license: licenses, subscription: subscriptions })
      .from(licenses)
      .leftJoin(subscriptions, eq(licenses.subscriptionId, subscriptions.id))
      .where(eq(licenses.restaurantId, restaurantId))
      .orderBy(desc(licenses.expiresAt))
      .limit(1);

    return row ?? null;
  }

  async findRestaurantById(restaurantId: string) {
    const [row] = await db
      .select({
        id: restaurants.id,
        organizationId: restaurants.organizationId,
        publicId: restaurants.publicId,
        name: restaurants.name,
        status: restaurants.status,
      })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));

    return row;
  }

  async findOrganizationById(organizationId: string) {
    const [row] = await db
      .select({
        id: organizations.id,
        publicId: organizations.publicId,
        name: organizations.name,
        status: organizations.status,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    return row;
  }

  async findSuperAdminByEmail(email: string) {
    const [row] = await db
      .select({
        id: superAdmins.id,
        publicId: superAdmins.publicId,
        name: superAdmins.name,
        email: superAdmins.email,
        phone: superAdmins.phone,
        passwordHash: superAdmins.passwordHash,
        status: superAdmins.status,
        role: sql<"SUPER_ADMIN">`'SUPER_ADMIN'`,
        lastLoginAt: superAdmins.lastLoginAt,
      })
      .from(superAdmins)
      .where(eq(superAdmins.email, email));

    return row;
  }

  async findAdminByEmail(email: string) {
    const [row] = await db
      .select({
        id: admins.id,
        publicId: admins.publicId,
        name: admins.fullName,
        email: admins.email,
        phone: admins.phone,
        passwordHash: admins.passwordHash,
        status: admins.status,
        role: sql<"RESTAURANT_ADMIN">`'RESTAURANT_ADMIN'`,
        organizationId: admins.organizationId,
        restaurantId: admins.restaurantId,
        lastLoginAt: admins.lastLoginAt,
      })
      .from(admins)
      .where(eq(admins.email, email));

    return row;
  }

  async findEmployeeByEmail(email: string) {
    const [row] = await db
      .select({
        id: employees.id,
        publicId: employees.publicId,
        name: employees.fullName,
        email: employees.email,
        phone: employees.phone,
        passwordHash: employees.passwordHash,
        status: employees.status,
        role: employees.role,
        organizationId: employees.organizationId,
        restaurantId: employees.restaurantId,
        lastLoginAt: employees.lastLoginAt,
      })
      .from(employees)
      .where(eq(employees.email, email));

    return row;
  }

  async findSuperAdminById(superAdminId: string) {
    const [row] = await db
      .select({
        id: superAdmins.id,
        publicId: superAdmins.publicId,
        name: superAdmins.name,
        email: superAdmins.email,
        phone: superAdmins.phone,
        status: superAdmins.status,
        role: sql<"SUPER_ADMIN">`'SUPER_ADMIN'`,
        lastLoginAt: superAdmins.lastLoginAt,
      })
      .from(superAdmins)
      .where(eq(superAdmins.id, superAdminId));

    return row;
  }

  async findAdminById(adminId: string) {
    const [row] = await db
      .select({
        id: admins.id,
        publicId: admins.publicId,
        name: admins.fullName,
        email: admins.email,
        phone: admins.phone,
        status: admins.status,
        role: sql<"RESTAURANT_ADMIN">`'RESTAURANT_ADMIN'`,
        organizationId: admins.organizationId,
        restaurantId: admins.restaurantId,
        lastLoginAt: admins.lastLoginAt,
      })
      .from(admins)
      .where(eq(admins.id, adminId));

    return row;
  }

  async findEmployeeById(employeeId: string) {
    const [row] = await db
      .select({
        id: employees.id,
        publicId: employees.publicId,
        name: employees.fullName,
        email: employees.email,
        phone: employees.phone,
        status: employees.status,
        role: employees.role,
        organizationId: employees.organizationId,
        restaurantId: employees.restaurantId,
        lastLoginAt: employees.lastLoginAt,
      })
      .from(employees)
      .where(eq(employees.id, employeeId));

    return row;
  }

  async createSession(input: {
    subjectType: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
    superAdminId?: string | null;
    adminId?: string | null;
    employeeId?: string | null;
    sessionTokenHash: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const [session] = await db.insert(authSessions).values(input).returning();
    return session;
  }

  async findValidSession(sessionTokenHash: string, now = new Date()) {
    const [session] = await db
      .select({
        id: authSessions.id,
        subjectType: authSessions.subjectType,
        superAdminId: authSessions.superAdminId,
        adminId: authSessions.adminId,
        employeeId: authSessions.employeeId,
        expiresAt: authSessions.expiresAt,
        revokedAt: authSessions.revokedAt,
      })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.sessionTokenHash, sessionTokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      );

    return session;
  }

  async touchSession(sessionId: string) {
    await db
      .update(authSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(authSessions.id, sessionId));
  }

  async revokeSession(sessionId: string) {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, sessionId));
  }

  async revokeSessionByTokenHash(sessionTokenHash: string) {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.sessionTokenHash, sessionTokenHash));
  }

  async revokeSuperAdminSessions(superAdminId: string) {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.superAdminId, superAdminId), isNull(authSessions.revokedAt)));
  }

  async touchSuperAdminLastLogin(superAdminId: string) {
    await db.update(superAdmins).set({ lastLoginAt: new Date() }).where(eq(superAdmins.id, superAdminId));
  }

  async touchAdminLastLogin(adminId: string) {
    await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, adminId));
  }

  async touchEmployeeLastLogin(employeeId: string) {
    await db.update(employees).set({ lastLoginAt: new Date() }).where(eq(employees.id, employeeId));
  }

  async recordLoginActivity(input: {
    superAdminId?: string;
    adminId?: string;
    employeeId?: string;
    status: "SUCCESS" | "FAILED" | "BLOCKED" | "LOGOUT";
    ipAddress?: string | null;
    userAgent?: string | null;
    failureReason?: string | null;
  }) {
    await db.insert(loginActivity).values(input);
  }

  async recordAudit(input: {
    actorSuperAdminId?: string | null;
    actorAdminId?: string | null;
    actorEmployeeId?: string | null;
    actorRole: "SUPER_ADMIN" | "ADMIN" | "RESTAURANT_ADMIN" | "WAITER" | "KITCHEN" | "RECEPTION";
    restaurantId?: string | null;
    action: string;
    module?: string;
    entityType: string;
    entityPublicId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const context = getLoggerContext();
    try {
      await db.insert(auditLogs).values({
        actorSuperAdminId: input.actorSuperAdminId,
        actorAdminId: input.actorAdminId,
        actorEmployeeId: input.actorEmployeeId,
        actorRole: input.actorRole,
        restaurantId: input.restaurantId,
        action: input.action,
        module: input.module,
        entityType: input.entityType,
        entityPublicId: input.entityPublicId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
        requestId: context?.requestId ?? undefined,
      });
    } catch (error) {
      logger.error(
        {
          error,
          requestId: context?.requestId,
          action: input.action,
          entityType: input.entityType,
        },
        "Failed to write auth audit log record",
      );
    }
  }
}
