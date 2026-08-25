import { and, count, desc, eq, ilike, or, lt, sql, type SQL } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { auditLogs, licenses, notifications, organizations, plans, restaurants, subscriptions } from "../../../db/schema/index.js";
import { AppError } from "../../../common/errors/app-error.js";
import type { ListLicensesQuery, RenewLicenseBody } from "./license.types.js";

const addMonthsUtc = (date: Date, months: number) => {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};

const addDaysUtc = (date: Date, days: number) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const calculateBilling = (basePrice: number, gstPercentage: number) => {
  const gstAmount = (basePrice * gstPercentage) / 100;
  return { basePrice, gstPercentage, gstAmount, finalAmount: basePrice + gstAmount };
};

const planRoleLimits = (plan: typeof plans.$inferSelect) => {
  const waiterLimit = plan.waiterLimit ?? Math.max((plan.maxUsers ?? 0) - 2, 1);
  const kitchenLimit = plan.kitchenLimit ?? 1;
  const receptionistLimit = plan.receptionistLimit ?? 1;
  return { waiterLimit, kitchenLimit, receptionistLimit };
};

export class LicenseRepository {
  async list(query: ListLicensesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const filters = [
      query.status ? eq(licenses.status, query.status) : undefined,
      query.restaurantId ? eq(licenses.restaurantId, query.restaurantId) : undefined,
      query.expiresInDays ? lt(licenses.expiresAt, sql`NOW() + (${query.expiresInDays} || ' days')::interval`) : undefined,
      query.subscriptionStatus ? eq(subscriptions.status, query.subscriptionStatus) : undefined,
      query.search ? or(
        ilike(licenses.licenseKey, `%${query.search}%`),
        ilike(restaurants.name, `%${query.search}%`),
        ilike(restaurants.email, `%${query.search}%`),
        ilike(plans.name, `%${query.search}%`),
        ilike(plans.planNumber, `%${query.search}%`),
      ) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({ license: licenses, restaurant: restaurants, organization: organizations, subscription: subscriptions, plan: plans })
      .from(licenses)
      .innerJoin(restaurants, eq(licenses.restaurantId, restaurants.id))
      .innerJoin(organizations, eq(licenses.organizationId, organizations.id))
      .innerJoin(subscriptions, eq(licenses.subscriptionId, subscriptions.id))
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(where)
      .orderBy(desc(licenses.issuedAt))
      .limit(limit)
      .offset(offset);
    const [total] = await db
      .select({ value: count() })
      .from(licenses)
      .innerJoin(restaurants, eq(licenses.restaurantId, restaurants.id))
      .innerJoin(subscriptions, eq(licenses.subscriptionId, subscriptions.id))
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(where);

    return { rows, total: total.value, page, limit };
  }

  async detail(id: string) {
    const [row] = await db
      .select({ license: licenses, restaurant: restaurants, organization: organizations, subscription: subscriptions, plan: plans })
      .from(licenses)
      .innerJoin(restaurants, eq(licenses.restaurantId, restaurants.id))
      .innerJoin(organizations, eq(licenses.organizationId, organizations.id))
      .innerJoin(subscriptions, eq(licenses.subscriptionId, subscriptions.id))
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(licenses.id, id));
    return row;
  }

  async history(id: string) {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id));
    if (!license) return null;

    const subscriptionRows = await db
      .select({ subscription: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.restaurantId, license.restaurantId))
      .orderBy(desc(subscriptions.createdAt));

    const licenseRows = await db
      .select()
      .from(licenses)
      .where(eq(licenses.restaurantId, license.restaurantId))
      .orderBy(desc(licenses.updatedAt));

    const auditRows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        newValues: auditLogs.newValues,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.restaurantId, license.restaurantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(30);

    return { subscriptions: subscriptionRows, licenses: licenseRows, auditLogs: auditRows };
  }

  async changeStatus(id: string, status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "BLOCKED" | "CANCELLED" | "REVOKED", actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(licenses)
        .set({ status, updatedAt: new Date() })
        .where(eq(licenses.id, id))
        .returning();
      if (!row) throw new AppError("License not found", 404, "LICENSE_NOT_FOUND");
      
      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: row.organizationId,
          restaurantId: row.restaurantId,
          action: `LICENSE_${status}`,
          module: "LICENSE",
          entityType: "license",
          entityId: row.id,
          licenseId: row.id,
          entityPublicId: id,
          newValues: { status },
        });
      }
      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: row.organizationId,
        restaurantId: row.restaurantId,
        type: `LICENSE_${status}`,
        title: "License status updated",
        message: `License ${row.licenseKey} changed to ${status}.`,
        entityType: "license",
        entityId: row.id,
        dedupeKey: `license:${row.id}:status:${status}:${row.updatedAt.toISOString()}`,
      }).onConflictDoNothing();
      return row;
    });
  }

  async extendLicense(id: string, additionalDays: number, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select({ expiresAt: licenses.expiresAt, restaurantId: licenses.restaurantId, organizationId: licenses.organizationId }).from(licenses).where(eq(licenses.id, id));
      if (!existing) throw new AppError("License not found", 404, "LICENSE_NOT_FOUND");
      
      const newExpiresAt = new Date(existing.expiresAt);
      newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);

      const [row] = await tx
        .update(licenses)
        .set({ expiresAt: newExpiresAt, updatedAt: new Date() })
        .where(eq(licenses.id, id))
        .returning();
        
      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: existing.organizationId,
          restaurantId: existing.restaurantId,
          action: "LICENSE_EXTENDED",
          module: "LICENSE",
          entityType: "license",
          entityId: row.id,
          licenseId: row.id,
          entityPublicId: id,
          newValues: { expiresAt: newExpiresAt, additionalDays },
        });
      }
      return row;
    });
  }

  async renewLicense(id: string, newExpiresAt: Date, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(licenses)
        .set({ expiresAt: newExpiresAt, status: "ACTIVE", updatedAt: new Date() })
        .where(eq(licenses.id, id))
        .returning();
      if (!row) throw new AppError("License not found", 404, "LICENSE_NOT_FOUND");
      
      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: row.organizationId,
          restaurantId: row.restaurantId,
          action: "LICENSE_RENEWED",
          module: "LICENSE",
          entityType: "license",
          entityId: row.id,
          licenseId: row.id,
          entityPublicId: id,
          newValues: { expiresAt: newExpiresAt, status: "ACTIVE" },
        });
      }
      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: row.organizationId,
        restaurantId: row.restaurantId,
        type: "LICENSE_RENEWED",
        title: "License renewed",
        message: `License ${row.licenseKey} was renewed.`,
        entityType: "license",
        entityId: row.id,
        dedupeKey: `license:${row.id}:renewed:${row.updatedAt.toISOString()}`,
      }).onConflictDoNothing();
      return row;
    });
  }

  async renewSubscription(id: string, body: RenewLicenseBody, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select({ license: licenses, restaurant: restaurants, organization: organizations, subscription: subscriptions, plan: plans })
        .from(licenses)
        .innerJoin(restaurants, eq(licenses.restaurantId, restaurants.id))
        .innerJoin(organizations, eq(licenses.organizationId, organizations.id))
        .innerJoin(subscriptions, eq(licenses.subscriptionId, subscriptions.id))
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(eq(licenses.id, id));

      if (!current) throw new AppError("License not found", 404, "LICENSE_NOT_FOUND");

      const now = new Date();
      const currentEndDate = current.subscription.endDate > current.license.expiresAt ? current.subscription.endDate : current.license.expiresAt;
      const startDate = body.startDate ?? (currentEndDate > now ? addDaysUtc(currentEndDate, 1) : now);

      let selectedPlan: typeof plans.$inferSelect;
      let basePrice: number;
      let gstPercentage: number;
      let durationMonths: number;
      let roleLimits: { waiterLimit: number; kitchenLimit: number; receptionistLimit: number };

      if (body.renewalType === "PREDEFINED") {
        const [plan] = await tx
          .select()
          .from(plans)
          .where(and(eq(plans.id, body.planId!), eq(plans.isActive, true), eq(plans.planType, "PREDEFINED")));
        if (!plan) throw new AppError("Selected predefined plan is not available", 400, "PLAN_NOT_SELECTABLE");

        selectedPlan = plan;
        durationMonths = body.durationMonths ?? plan.durationMonths ?? (body.billingCycle === "YEARLY" ? 12 : 1);
        basePrice = Number(body.billingCycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice);
        gstPercentage = Number(plan.gstPercentage ?? 18);
        roleLimits = planRoleLimits(plan);
      } else {
        if (!body.customPlan) throw new AppError("Custom plan details are required", 400, "CUSTOM_PLAN_REQUIRED");
        durationMonths = body.durationMonths ?? (body.billingCycle === "YEARLY" ? 12 : 1);
        const uniqueCode = `CUSTOM-RENEW-${current.restaurant.code}-${Date.now()}`;
        const [customPlan] = await tx
          .insert(plans)
          .values({
            code: uniqueCode,
            name: body.customPlan.name,
            description: body.customPlan.description ?? `Renewal custom plan for ${current.restaurant.name}`,
            planType: "CUSTOMIZED",
            organizationId: current.organization.id,
            restaurantId: current.restaurant.id,
            monthlyPrice: Number(body.customPlan.basePrice).toFixed(2),
            yearlyPrice: Number(body.customPlan.basePrice).toFixed(2),
            durationMonths,
            gstPercentage: Number(body.customPlan.gstPercentage).toFixed(2),
            features: body.customPlan.features,
            maxUsers: body.customPlan.waiterLimit + body.customPlan.kitchenLimit + body.customPlan.receptionistLimit,
            waiterLimit: body.customPlan.waiterLimit,
            kitchenLimit: body.customPlan.kitchenLimit,
            receptionistLimit: body.customPlan.receptionistLimit,
            isActive: false,
          })
          .returning();

        selectedPlan = customPlan;
        basePrice = Number(body.customPlan.basePrice);
        gstPercentage = Number(body.customPlan.gstPercentage);
        roleLimits = {
          waiterLimit: body.customPlan.waiterLimit,
          kitchenLimit: body.customPlan.kitchenLimit,
          receptionistLimit: body.customPlan.receptionistLimit,
        };
      }

      const billing = calculateBilling(basePrice, gstPercentage);
      const endDate = addMonthsUtc(startDate, durationMonths);

      await tx
        .update(subscriptions)
        .set({ status: "EXPIRED", updatedAt: now })
        .where(and(eq(subscriptions.restaurantId, current.restaurant.id), eq(subscriptions.status, "ACTIVE")));

      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          organizationId: current.organization.id,
          restaurantId: current.restaurant.id,
          planId: selectedPlan.id,
          planNameSnapshot: selectedPlan.name,
          waiterLimitSnapshot: roleLimits.waiterLimit,
          kitchenLimitSnapshot: roleLimits.kitchenLimit,
          receptionistLimitSnapshot: roleLimits.receptionistLimit,
          baseAmountSnapshot: billing.basePrice.toFixed(2),
          gstPercentageSnapshot: billing.gstPercentage.toFixed(2),
          gstAmountSnapshot: billing.gstAmount.toFixed(2),
          finalAmountSnapshot: billing.finalAmount.toFixed(2),
          durationMonthsSnapshot: durationMonths,
          billingCycle: body.billingCycle,
          price: billing.finalAmount.toFixed(2),
          currency: current.restaurant.currency ?? "INR",
          status: "ACTIVE",
          paymentStatus: "SUCCESS",
          startDate,
          endDate,
          renewalDate: endDate,
        })
        .returning();

      const [license] = await tx
        .update(licenses)
        .set({
          subscriptionId: subscription.id,
          status: "ACTIVE",
          issuedAt: startDate,
          expiresAt: endDate,
          updatedAt: now,
        })
        .where(eq(licenses.id, id))
        .returning();

      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: current.organization.id,
          restaurantId: current.restaurant.id,
          action: "SUBSCRIPTION_RENEWED_FROM_LICENSE",
          module: "SUBSCRIPTION",
          entityType: "subscription",
          entityId: subscription.id,
          subscriptionId: subscription.id,
          licenseId: license.id,
          entityPublicId: subscription.id,
          oldValues: {
            subscriptionId: current.subscription.id,
            plan: current.plan.planNumber ?? current.plan.code,
            expiresAt: current.license.expiresAt,
          },
          newValues: {
            subscriptionId: subscription.id,
            plan: selectedPlan.planNumber ?? selectedPlan.code,
            renewalType: body.renewalType,
            startDate,
            endDate,
            roleLimits,
            basePrice: billing.basePrice,
            gstPercentage: billing.gstPercentage,
            finalAmount: billing.finalAmount,
          },
        });
      }

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: current.organization.id,
        restaurantId: current.restaurant.id,
        recipientRole: "RESTAURANT_ADMIN",
        type: "SUBSCRIPTION_RENEWED",
        title: "Subscription renewed",
        message: `${current.restaurant.name} subscription was renewed until ${endDate.toISOString()}.`,
        entityType: "subscription",
        entityId: subscription.id,
        dedupeKey: `subscription:${subscription.id}:license-renewal`,
      }).onConflictDoNothing();

      return { subscription, license, plan: selectedPlan };
    });
  }

  async triggerExpiry(actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      // Find expiring licenses
      const expiredLicenses = await tx
        .select({ id: licenses.id, organizationId: licenses.organizationId, restaurantId: licenses.restaurantId })
        .from(licenses)
        .where(and(eq(licenses.status, "ACTIVE"), lt(licenses.expiresAt, sql`NOW()`)));

      if (expiredLicenses.length === 0) return 0;

      const licenseIds = expiredLicenses.map((l) => l.id);

      await tx
        .update(licenses)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(and(eq(licenses.status, "ACTIVE"), lt(licenses.expiresAt, sql`NOW()`)));

      // If actor is provided (or even SYSTEM), we can log them individually or in bulk
      const auditEntries = expiredLicenses.map(l => ({
        actorRole: "SUPER_ADMIN" as const,
        actorSuperAdminId: actorSuperAdminId || null,
        organizationId: l.organizationId,
        restaurantId: l.restaurantId,
        action: "LICENSE_EXPIRED_AUTO",
        module: "LICENSE",
        entityType: "license",
        entityId: l.id,
        licenseId: l.id,
        entityPublicId: l.id,
      }));

      // Assuming auditLogs table can handle bulk insert
      await tx.insert(auditLogs).values(auditEntries);
      await tx.insert(notifications).values(expiredLicenses.map((license) => ({
        scope: "SYSTEM" as const,
        organizationId: license.organizationId,
        restaurantId: license.restaurantId,
        type: "LICENSE_EXPIRED",
        title: "License expired",
        message: `License ${license.id} has expired.`,
        entityType: "license",
        entityId: license.id,
        dedupeKey: `license:${license.id}:expired`,
      }))).onConflictDoNothing();

      return licenseIds.length;
    });
  }
}
