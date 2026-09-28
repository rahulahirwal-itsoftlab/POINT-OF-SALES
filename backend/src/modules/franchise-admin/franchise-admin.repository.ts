import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { AppError } from "../../common/errors/app-error.js";
import { createPublicId } from "../../common/utils/id-generator.js";
import { db } from "../../config/database.js";
import {
  admins,
  auditLogs,
  employees,
  franchiseAdmins,
  franchises,
  notifications,
  superAdmins,
} from "../../db/schema/index.js";
import type { z } from "zod";
import type {
  licenseRenewalSchema,
  superAdminInputSchema,
  superAdminStatusSchema,
  superAdminUpdateSchema,
} from "./franchise-admin.validation.js";

type SuperAdminInput = z.infer<typeof superAdminInputSchema>;
type SuperAdminUpdate = z.infer<typeof superAdminUpdateSchema>;
type SuperAdminStatus = z.infer<typeof superAdminStatusSchema>;
type LicenseRenewal = z.infer<typeof licenseRenewalSchema>;

export class FranchiseAdminRepository {
  async getFranchise(franchiseId: string) {
    const [row] = await db
      .select()
      .from(franchises)
      .where(eq(franchises.id, franchiseId))
      .limit(1);

    if (!row) {
      throw new AppError("Franchise context not found", 404, "FRANCHISE_NOT_FOUND");
    }

    const now = new Date();
    const expiresAt = new Date(row.licenseExpiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    let calculatedStatus: string = row.licenseStatus;
    if (daysRemaining <= 0) {
      calculatedStatus = "EXPIRED";
    } else if (daysRemaining <= 30 && row.licenseStatus === "ACTIVE") {
      calculatedStatus = "EXPIRING_SOON";
    }

    return {
      ...row,
      daysRemaining,
      calculatedStatus,
    };
  }

  async getDashboard(franchiseId: string) {
    const franchise = await this.getFranchise(franchiseId);

    const [superAdminStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${superAdmins.status} = 'ACTIVE')`,
        inactive: sql<number>`count(*) filter (where ${superAdmins.status} != 'ACTIVE')`,
      })
      .from(superAdmins)
      .where(eq(superAdmins.franchiseId, franchiseId));

    return {
      franchise: {
        id: franchise.id,
        publicId: franchise.publicId,
        code: franchise.code,
        name: franchise.name,
        email: franchise.email ?? null,
        phone: franchise.phone ?? null,
        maxSuperAdmins: franchise.maxSuperAdmins,
        status: franchise.status,
        licenseKey: franchise.licenseKey,
        licenseStatus: franchise.calculatedStatus,
        licenseExpiresAt: franchise.licenseExpiresAt,
        remainingDays: franchise.daysRemaining,
      },
      metrics: {
        totalSuperAdmins: superAdminStats?.total ?? 0,
        activeSuperAdmins: Number(superAdminStats?.active ?? 0),
        inactiveSuperAdmins: Number(superAdminStats?.inactive ?? 0),
      },
    };
  }

  async listSuperAdmins(franchiseId: string) {
    const saRows = await db
      .select({
        id: superAdmins.id,
        publicId: superAdmins.publicId,
        name: superAdmins.name,
        email: superAdmins.email,
        phone: superAdmins.phone,
        status: superAdmins.status,
        lastLoginAt: superAdmins.lastLoginAt,
        createdAt: superAdmins.createdAt,
        updatedAt: superAdmins.updatedAt,
      })
      .from(superAdmins)
      .where(eq(superAdmins.franchiseId, franchiseId))
      .orderBy(desc(superAdmins.createdAt));

    return saRows.map((sa) => ({
      ...sa,
      restaurantCount: 0,
      restaurants: [], 
    }));
  }

  async getSuperAdmin(franchiseId: string, superAdminId: string) {
    const [row] = await db
      .select({
        id: superAdmins.id,
        publicId: superAdmins.publicId,
        name: superAdmins.name,
        email: superAdmins.email,
        phone: superAdmins.phone,
        status: superAdmins.status,
        lastLoginAt: superAdmins.lastLoginAt,
        createdAt: superAdmins.createdAt,
        updatedAt: superAdmins.updatedAt,
      })
      .from(superAdmins)
      .where(and(eq(superAdmins.id, superAdminId), eq(superAdmins.franchiseId, franchiseId)))
      .limit(1);

    if (!row) {
      throw new AppError("Super Admin not found in your franchise", 404, "SUPER_ADMIN_NOT_FOUND");
    }

    return {
      ...row,
      restaurantCount: 0,
      restaurants: [],
    };
  }

  async assertEmailAvailable(email: string, ignoreId?: string) {
    const normalized = email.trim().toLowerCase();
    const [existingSA] = await db.select({ id: superAdmins.id }).from(superAdmins).where(eq(superAdmins.email, normalized)).limit(1);
    if (existingSA && existingSA.id !== ignoreId) throw new AppError("Email is already registered", 409, "EMAIL_ALREADY_EXISTS");

    const [existingFA] = await db.select({ id: franchiseAdmins.id }).from(franchiseAdmins).where(eq(franchiseAdmins.email, normalized)).limit(1);
    if (existingFA) throw new AppError("Email is already registered", 409, "EMAIL_ALREADY_EXISTS");

    const [existingAdmin] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, normalized)).limit(1);
    if (existingAdmin) throw new AppError("Email is already registered", 409, "EMAIL_ALREADY_EXISTS");

    const [existingEmp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.email, normalized)).limit(1);
    if (existingEmp) throw new AppError("Email is already registered", 409, "EMAIL_ALREADY_EXISTS");
  }

  async createSuperAdmin(franchiseId: string, input: SuperAdminInput, passwordHash: string, adminUserId?: string) {
    const franchise = await this.getFranchise(franchiseId);
    if (franchise.calculatedStatus === "EXPIRED" || franchise.calculatedStatus === "SUSPENDED") {
      throw new AppError("Cannot create Super Admin because franchise license is inactive or expired", 403, "FRANCHISE_LICENSE_INACTIVE");
    }

    const [currentCount] = await db
      .select({ value: count() })
      .from(superAdmins)
      .where(eq(superAdmins.franchiseId, franchiseId));

    if (currentCount.value >= franchise.maxSuperAdmins) {
      throw new AppError(
        `Super Admin limit reached for this franchise plan (max ${franchise.maxSuperAdmins}).`,
        409,
        "SUPER_ADMIN_LIMIT_EXCEEDED",
      );
    }

    await this.assertEmailAvailable(input.email);

    const [row] = await db
      .insert(superAdmins)
      .values({
        publicId: createPublicId("SAD"),
        franchiseId,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        passwordHash,
        status: input.status ?? "ACTIVE",
      })
      .returning();

    await this.audit(franchiseId, adminUserId, "SUPER_ADMIN_CREATED", "SUPER_ADMIN", "super_admin", row.id, row.email);

    return {
      id: row.id,
      publicId: row.publicId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      lastLoginAt: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      restaurantCount: 0,
      restaurants: [],
    };
  }

  async updateSuperAdmin(franchiseId: string, superAdminId: string, input: SuperAdminUpdate, adminUserId?: string) {
    const existing = await this.getSuperAdmin(franchiseId, superAdminId);

    const [row] = await db
      .update(superAdmins)
      .set({
        name: input.name ? input.name.trim() : existing.name,
        phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
        status: input.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(and(eq(superAdmins.id, superAdminId), eq(superAdmins.franchiseId, franchiseId)))
      .returning();

    await this.audit(franchiseId, adminUserId, "SUPER_ADMIN_UPDATED", "SUPER_ADMIN", "super_admin", row.id, row.email);

    return {
      ...existing,
      name: row.name,
      phone: row.phone,
      status: row.status,
      updatedAt: row.updatedAt,
    };
  }

  async toggleSuperAdminStatus(franchiseId: string, superAdminId: string, input: SuperAdminStatus, adminUserId?: string) {
    const existing = await this.getSuperAdmin(franchiseId, superAdminId);

    const [row] = await db
      .update(superAdmins)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(and(eq(superAdmins.id, superAdminId), eq(superAdmins.franchiseId, franchiseId)))
      .returning();

    await this.audit(
      franchiseId,
      adminUserId,
      input.status === "ACTIVE" ? "SUPER_ADMIN_ACTIVATED" : "SUPER_ADMIN_DEACTIVATED",
      "SUPER_ADMIN",
      "super_admin",
      row.id,
      row.email,
    );

    return {
      ...existing,
      status: row.status,
      updatedAt: row.updatedAt,
    };
  }

  async renewLicense(franchiseId: string, input: LicenseRenewal, adminUserId?: string) {
    const franchise = await this.getFranchise(franchiseId);

    const baseDate = franchise.daysRemaining > 0 ? new Date(franchise.licenseExpiresAt) : new Date();
    baseDate.setMonth(baseDate.getMonth() + input.durationMonths);

    const [row] = await db
      .update(franchises)
      .set({
        licenseExpiresAt: baseDate,
        licenseStatus: "ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(franchises.id, franchiseId))
      .returning();

    await this.audit(franchiseId, adminUserId, "FRANCHISE_LICENSE_RENEWED", "FRANCHISE", "franchise", row.id, row.code);

    return {
      id: row.id,
      code: row.code,
      licenseStatus: row.licenseStatus,
      licenseExpiresAt: row.licenseExpiresAt,
      durationMonths: input.durationMonths,
    };
  }

  async listNotifications(franchiseId: string) {
    const rows = await db
      .select()
      .from(notifications)
      .where(or(eq(notifications.scope, "SYSTEM"), eq(notifications.dedupeKey, `franchise:${franchiseId}`)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return rows;
  }

  async listAuditLogs(franchiseId: string) {
    void franchiseId;
    const rows = await db
      .select({
        id: auditLogs.id,
        actorRole: auditLogs.actorRole,
        action: auditLogs.action,
        module: auditLogs.module,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        entityPublicId: auditLogs.entityPublicId,
        details: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    return rows;
  }

  private async audit(
    franchiseId: string,
    adminUserId: string | undefined,
    action: string,
    module: string,
    entityType: string,
    entityId: string,
    entityPublicId?: string,
  ) {
    await db.insert(auditLogs).values({
      actorRole: "FRANCHISE_STEWARD",
      actorAdminId: adminUserId,
      action,
      module,
      entityType,
      entityId,
      entityPublicId,
      metadata: { franchiseId },
    });
  }
}
