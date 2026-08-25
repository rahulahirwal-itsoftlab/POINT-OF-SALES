import { and, count, desc, eq, gt, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { AppError } from "../../../common/errors/app-error.js";
import { db } from "../../../config/database.js";
import { appConfig } from "../../../config/app-config.js";
import { admins, auditLogs, licenses, notifications, organizations, plans, restaurants, subscriptions } from "../../../db/schema/index.js";
import type { ListSubscriptionsQuery, CreateSubscriptionBody, RenewSubscriptionBody, UpdateSubscriptionBody } from "./subscription.types.js";

const addMonthsUtc = (date: Date, months: number) => {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};

const calculateBilling = (basePrice: number, gstPercentage: number) => {
  const gstAmount = basePrice * gstPercentage / 100;
  return { basePrice, gstPercentage, gstAmount, finalAmount: basePrice + gstAmount };
};

const planLimits = (plan: typeof plans.$inferSelect) => {
  const waiterLimit = plan.waiterLimit ?? Math.max((plan.maxUsers ?? 0) - 2, 1);
  const kitchenLimit = plan.kitchenLimit ?? 1;
  const receptionistLimit = plan.receptionistLimit ?? 1;
  return { waiterLimit, kitchenLimit, receptionistLimit };
};

export class SubscriptionRepository {
  async list(query: ListSubscriptionsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const filters = [
      query.status ? eq(subscriptions.status, query.status) : undefined,
      query.paymentStatus ? eq(subscriptions.paymentStatus, query.paymentStatus) : undefined,
      query.organizationId ? eq(subscriptions.organizationId, query.organizationId) : undefined,
      query.restaurantId ? eq(subscriptions.restaurantId, query.restaurantId) : undefined,
      query.planId ? eq(subscriptions.planId, query.planId) : undefined,
      query.billingCycle ? eq(subscriptions.billingCycle, query.billingCycle) : undefined,
      query.expiresInDays ? and(eq(subscriptions.status, "ACTIVE"), lte(subscriptions.endDate, sql`NOW() + (${query.expiresInDays} || ' days')::interval`), gte(subscriptions.endDate, sql`NOW()`)) : undefined,
      query.startFrom ? gte(subscriptions.startDate, new Date(query.startFrom)) : undefined,
      query.startTo ? lte(subscriptions.startDate, new Date(query.startTo)) : undefined,
      query.expiryFrom ? gte(subscriptions.endDate, new Date(query.expiryFrom)) : undefined,
      query.expiryTo ? lte(subscriptions.endDate, new Date(query.expiryTo)) : undefined,
      query.search ? or(ilike(restaurants.name, `%${query.search}%`), ilike(organizations.name, `%${query.search}%`), ilike(admins.fullName, `%${query.search}%`), ilike(plans.name, `%${query.search}%`)) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({ subscription: subscriptions, organization: organizations, restaurant: restaurants, owner: admins, plan: plans })
      .from(subscriptions)
      .innerJoin(organizations, eq(subscriptions.organizationId, organizations.id))
      .innerJoin(restaurants, eq(subscriptions.restaurantId, restaurants.id))
      .leftJoin(admins, and(eq(admins.organizationId, subscriptions.organizationId), eq(admins.restaurantId, subscriptions.restaurantId)))
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(where)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await db
      .select({ value: count() })
      .from(subscriptions)
      .innerJoin(organizations, eq(subscriptions.organizationId, organizations.id))
      .innerJoin(restaurants, eq(subscriptions.restaurantId, restaurants.id))
      .leftJoin(admins, and(eq(admins.organizationId, subscriptions.organizationId), eq(admins.restaurantId, subscriptions.restaurantId)))
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(where);

    return { rows, total: total.value, page, limit };
  }

  async detail(id: string) {
    const [row] = await db
      .select({ subscription: subscriptions, organization: organizations, restaurant: restaurants, owner: admins, plan: plans })
      .from(subscriptions)
      .innerJoin(organizations, eq(subscriptions.organizationId, organizations.id))
      .innerJoin(restaurants, eq(subscriptions.restaurantId, restaurants.id))
      .leftJoin(admins, and(eq(admins.organizationId, subscriptions.organizationId), eq(admins.restaurantId, subscriptions.restaurantId)))
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.id, id));
    return row;
  }

  async create(body: CreateSubscriptionBody, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [restaurant] = await tx
        .select({ id: restaurants.id, organizationId: restaurants.organizationId })
        .from(restaurants)
        .where(
          body.restaurantId
            ? and(eq(restaurants.id, body.restaurantId), eq(restaurants.organizationId, body.organizationId))
            : eq(restaurants.organizationId, body.organizationId),
        );

      if (!restaurant) {
        throw new AppError("Restaurant not found for organization", 404, "RESTAURANT_NOT_FOUND");
      }

      const [owner] = await tx
        .select({ id: admins.id })
        .from(admins)
        .where(and(eq(admins.organizationId, body.organizationId), eq(admins.restaurantId, restaurant.id)))
        .limit(1);

      const startDate = new Date(body.startDate);
      const endDate = addMonthsUtc(startDate, body.durationMonths);
      const renewalDate = body.renewalDate ? new Date(body.renewalDate) : endDate;
      const paymentStatus = body.status === "ACTIVE" ? "SUCCESS" : "PENDING";
      const [plan] = await tx.select().from(plans).where(and(eq(plans.id, body.planId), eq(plans.isActive, true))).limit(1);
      if (!plan || plan.planType !== "PREDEFINED") {
        throw new AppError("Selected subscription plan is not available", 400, "PLAN_NOT_SELECTABLE");
      }
      const basePrice = Number(body.billingCycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice);
      const billing = calculateBilling(basePrice, Number(plan.gstPercentage ?? 18));
      const roleLimits = planLimits(plan);

      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          restaurantId: restaurant.id,
          organizationId: body.organizationId,
          planId: body.planId,
          planNameSnapshot: plan.name,
          waiterLimitSnapshot: roleLimits.waiterLimit,
          kitchenLimitSnapshot: roleLimits.kitchenLimit,
          receptionistLimitSnapshot: roleLimits.receptionistLimit,
          baseAmountSnapshot: billing.basePrice.toFixed(2),
          gstPercentageSnapshot: billing.gstPercentage.toFixed(2),
          gstAmountSnapshot: billing.gstAmount.toFixed(2),
          finalAmountSnapshot: billing.finalAmount.toFixed(2),
          durationMonthsSnapshot: body.durationMonths,
          billingCycle: body.billingCycle,
          price: billing.finalAmount.toFixed(2),
          currency: body.currency.toUpperCase(),
          status: body.status,
          paymentStatus,
          startDate,
          endDate,
          renewalDate,
        })
        .returning();
      
      const licenseKey = `LIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const [license] = await tx
        .insert(licenses)
        .values({
          restaurantId: restaurant.id,
          organizationId: body.organizationId,
          subscriptionId: subscription.id,
          licenseKey,
          status: body.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED",
          issuedAt: new Date(),
          expiresAt: endDate,
        })
        .returning();

      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: body.organizationId,
          restaurantId: restaurant.id,
          action: "SUBSCRIPTION_CREATED",
          module: "SUBSCRIPTION",
          entityType: "subscription",
          entityId: subscription.id,
          subscriptionId: subscription.id,
          licenseId: license.id,
          entityPublicId: subscription.id,
        });
      }

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: body.organizationId,
        restaurantId: restaurant.id,
        recipientAdminId: owner?.id,
        recipientRole: "RESTAURANT_ADMIN",
        type: "SUBSCRIPTION_CREATED",
        title: "Subscription created",
        message: `Subscription ${subscription.id} was created.`,
        entityType: "subscription",
        entityId: subscription.id,
        dedupeKey: `subscription:${subscription.id}:created`,
      }).onConflictDoNothing();

      return { subscription, license };
    });
  }

  async renew(id: string, body: RenewSubscriptionBody, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const renewalStartDate = body.startDate ? new Date(body.startDate) : new Date();
      const renewalEndDate = addMonthsUtc(renewalStartDate, body.durationMonths);
      const updateValues: Partial<typeof subscriptions.$inferInsert> = {
        billingCycle: body.billingCycle,
        status: "ACTIVE",
        startDate: renewalStartDate,
        endDate: renewalEndDate,
        renewalDate: body.renewalDate ? new Date(body.renewalDate) : new Date(),
        updatedAt: new Date(),
      };

      if (body.price !== undefined) {
        updateValues.price = body.price.toString();
      }
      if (body.currency) {
        updateValues.currency = body.currency.toUpperCase();
      }

      const [subscription] = await tx
        .update(subscriptions)
        .set(updateValues)
        .where(eq(subscriptions.id, id))
        .returning();
      
      const [license] = await tx
        .update(licenses)
        .set({ expiresAt: subscription.endDate, status: "ACTIVE", updatedAt: new Date() })
        .where(eq(licenses.subscriptionId, id))
        .returning();

      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: subscription.organizationId,
          restaurantId: subscription.restaurantId,
          action: "SUBSCRIPTION_RENEWED",
          module: "SUBSCRIPTION",
          entityType: "subscription",
          entityId: subscription.id,
          subscriptionId: subscription.id,
          licenseId: license?.id,
          entityPublicId: subscription.id,
        });
      }

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: subscription.organizationId,
        restaurantId: subscription.restaurantId,
        recipientRole: "RESTAURANT_ADMIN",
        type: "SUBSCRIPTION_RENEWED",
        title: "Subscription renewed",
        message: `Subscription ${subscription.id} was renewed until ${subscription.endDate.toISOString()}.`,
        entityType: "subscription",
        entityId: subscription.id,
        dedupeKey: `subscription:${subscription.id}:renewed:${subscription.renewalDate?.toISOString() ?? Date.now()}`,
      }).onConflictDoNothing();

      return { subscription, license };
    });
  }

  async changeStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "CANCELLED", actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [subscription] = await tx
        .update(subscriptions)
        .set({ status, updatedAt: new Date() })
        .where(eq(subscriptions.id, id))
        .returning();
      
      let licenseStatus: "ACTIVE" | "SUSPENDED" | "CANCELLED" = status;
      await tx
        .update(licenses)
        .set({ status: licenseStatus, updatedAt: new Date() })
        .where(eq(licenses.subscriptionId, id));

      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: subscription.organizationId,
          restaurantId: subscription.restaurantId,
          action: `SUBSCRIPTION_${status}`,
          module: "SUBSCRIPTION",
          entityType: "subscription",
          entityId: subscription.id,
          subscriptionId: subscription.id,
          entityPublicId: subscription.id,
        });
      }

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: subscription.organizationId,
        restaurantId: subscription.restaurantId,
        recipientRole: "RESTAURANT_ADMIN",
        type: `SUBSCRIPTION_${status}`,
        title: "Subscription status updated",
        message: `Subscription ${subscription.id} changed to ${status}.`,
        entityType: "subscription",
        entityId: subscription.id,
        dedupeKey: `subscription:${subscription.id}:status:${status}:${subscription.updatedAt.toISOString()}`,
      }).onConflictDoNothing();

      return subscription;
    });
  }

  async reactivate(id: string, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.id, id));
      if (!existing) {
        throw new AppError("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
      }

      const now = new Date();
      let endDate = existing.endDate;
      let renewalDate = existing.renewalDate;

      if (endDate <= now) {
        const months = existing.billingCycle === "YEARLY" ? 12 : 1;
        endDate = addMonthsUtc(now, months);
        renewalDate = endDate;
      }

      const [subscription] = await tx
        .update(subscriptions)
        .set({
          status: "ACTIVE",
          paymentStatus: "SUCCESS",
          endDate,
          renewalDate,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, id))
        .returning();

      await tx
        .update(licenses)
        .set({
          status: "ACTIVE",
          expiresAt: endDate,
          updatedAt: now,
        })
        .where(eq(licenses.subscriptionId, id));

      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: subscription.organizationId,
          restaurantId: subscription.restaurantId,
          action: "SUBSCRIPTION_REACTIVATED",
          module: "SUBSCRIPTION",
          entityType: "subscription",
          entityId: subscription.id,
          subscriptionId: subscription.id,
          entityPublicId: subscription.id,
        });
      }

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: subscription.organizationId,
        restaurantId: subscription.restaurantId,
        recipientRole: "RESTAURANT_ADMIN",
        type: "SUBSCRIPTION_REACTIVATED",
        title: "Subscription Reactivated",
        message: `Subscription ${subscription.id} was reactivated and is now ACTIVE.`,
        entityType: "subscription",
        entityId: subscription.id,
        dedupeKey: `subscription:${subscription.id}:reactivated:${now.getTime()}`,
      }).onConflictDoNothing();

      return subscription;
    });
  }

  async triggerExpiry(actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const expiredRows = await tx
        .select({
          id: subscriptions.id,
          organizationId: subscriptions.organizationId,
          restaurantId: subscriptions.restaurantId,
          endDate: subscriptions.endDate,
        })
        .from(subscriptions)
        .where(and(eq(subscriptions.status, "ACTIVE"), lte(subscriptions.endDate, sql`NOW()`)));

      if (expiredRows.length === 0) return 0;

      const subscriptionIds = expiredRows.map((subscription) => subscription.id);

      await tx
        .update(subscriptions)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(inArray(subscriptions.id, subscriptionIds));

      await tx
        .update(licenses)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(inArray(licenses.subscriptionId, subscriptionIds));

      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values(expiredRows.map((subscription) => ({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN" as const,
          organizationId: subscription.organizationId,
          restaurantId: subscription.restaurantId,
          action: "SUBSCRIPTION_EXPIRED_AUTO",
          module: "SUBSCRIPTION",
          entityType: "subscription",
          entityId: subscription.id,
          subscriptionId: subscription.id,
          entityPublicId: subscription.id,
        })));
      }

      await tx.insert(notifications).values(expiredRows.map((subscription) => ({
        scope: "SYSTEM" as const,
        organizationId: subscription.organizationId,
        restaurantId: subscription.restaurantId,
        recipientRole: "RESTAURANT_ADMIN",
        type: "SUBSCRIPTION_EXPIRED",
        title: "Subscription expired",
        message: `Subscription ${subscription.id} expired on ${subscription.endDate.toISOString()}.`,
        entityType: "subscription",
        entityId: subscription.id,
        dedupeKey: `subscription:${subscription.id}:expired`,
      }))).onConflictDoNothing();

      return subscriptionIds.length;
    });
  }

  async notifyExpiringSoon() {
    return db.transaction(async (tx) => {
      let created = 0;

      for (const days of appConfig.subscriptionExpiryWarningDays) {
        const rows = await tx
          .select({
            id: subscriptions.id,
            organizationId: subscriptions.organizationId,
            restaurantId: subscriptions.restaurantId,
            endDate: subscriptions.endDate,
            ownerId: admins.id,
          })
          .from(subscriptions)
          .leftJoin(admins, and(eq(admins.organizationId, subscriptions.organizationId), eq(admins.restaurantId, subscriptions.restaurantId)))
          .where(
            and(
              eq(subscriptions.status, "ACTIVE"),
              gt(subscriptions.endDate, sql`NOW()`),
              lte(subscriptions.endDate, sql`NOW() + (${days} || ' days')::interval`),
            ),
          );

        if (rows.length === 0) continue;

        await tx.insert(notifications).values(rows.map((subscription) => ({
          scope: "USER" as const,
          organizationId: subscription.organizationId,
          restaurantId: subscription.restaurantId,
          recipientAdminId: subscription.ownerId,
          recipientRole: "RESTAURANT_ADMIN",
          type: "SUBSCRIPTION_EXPIRING_SOON",
          title: "Subscription expiring soon",
          message: `Your subscription expires in ${days} day${days === 1 ? "" : "s"}.`,
          entityType: "subscription",
          entityId: subscription.id,
          dedupeKey: `subscription:${subscription.id}:expiring:${days}:${subscription.endDate.toISOString().slice(0, 10)}`,
        }))).onConflictDoNothing();

        created += rows.length;
      }

      return created;
    });
  }

  async update(id: string, body: UpdateSubscriptionBody, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.id, id));
      if (!existing) {
        throw new AppError("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
      }

      const updateValues: Partial<typeof subscriptions.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.planId) updateValues.planId = body.planId;
      if (body.billingCycle) updateValues.billingCycle = body.billingCycle;
      if (body.price !== undefined) updateValues.price = body.price.toFixed(2);
      if (body.currency) updateValues.currency = body.currency.toUpperCase();
      if (body.startDate) updateValues.startDate = new Date(body.startDate);

      if (body.endDate) {
        updateValues.endDate = new Date(body.endDate);
      } else if (body.durationMonths) {
        const refStartDate = updateValues.startDate || existing.startDate;
        const computedEndDate = addMonthsUtc(refStartDate, body.durationMonths);
        updateValues.endDate = computedEndDate;
        updateValues.renewalDate = computedEndDate;
      }

      if (body.renewalDate) updateValues.renewalDate = new Date(body.renewalDate);
      if (body.status) updateValues.status = body.status;

      const [updatedSubscription] = await tx
        .update(subscriptions)
        .set(updateValues)
        .where(eq(subscriptions.id, id))
        .returning();

      const finalEndDate = updateValues.endDate || body.endDate ? new Date(updateValues.endDate || body.endDate!) : undefined;

      if (finalEndDate || body.status) {
        const licenseUpdates: Partial<typeof licenses.$inferInsert> = { updatedAt: new Date() };
        if (finalEndDate) licenseUpdates.expiresAt = finalEndDate;
        if (body.status) {
          const statusMap: Record<string, "ACTIVE" | "SUSPENDED" | "CANCELLED" | "EXPIRED"> = {
            ACTIVE: "ACTIVE",
            SUSPENDED: "SUSPENDED",
            CANCELLED: "CANCELLED",
            EXPIRED: "EXPIRED",
            PENDING: "SUSPENDED",
          };
          licenseUpdates.status = statusMap[body.status] ?? "SUSPENDED";
        }

        await tx
          .update(licenses)
          .set(licenseUpdates)
          .where(eq(licenses.subscriptionId, id));
      }

      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          organizationId: updatedSubscription.organizationId,
          restaurantId: updatedSubscription.restaurantId,
          action: "SUBSCRIPTION_UPDATED",
          module: "SUBSCRIPTION",
          entityType: "subscription",
          entityId: updatedSubscription.id,
          subscriptionId: updatedSubscription.id,
          entityPublicId: updatedSubscription.id,
        });
      }

      const [owner] = await tx
        .select({ id: admins.id })
        .from(admins)
        .where(and(eq(admins.organizationId, updatedSubscription.organizationId), eq(admins.restaurantId, updatedSubscription.restaurantId)))
        .limit(1);

      const isDeactivation = body.status === "SUSPENDED" || body.status === "CANCELLED" || body.status === "EXPIRED";

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: updatedSubscription.organizationId,
        restaurantId: updatedSubscription.restaurantId,
        recipientAdminId: owner?.id,
        recipientRole: "RESTAURANT_ADMIN",
        type: isDeactivation ? "SUBSCRIPTION_DEACTIVATED" : "SUBSCRIPTION_UPDATED",
        title: isDeactivation ? "Subscription Deactivated" : "Subscription Updated",
        message: isDeactivation
          ? `The subscription for restaurant tenant ${updatedSubscription.restaurantId} was deactivated/suspended.`
          : `The subscription for restaurant tenant ${updatedSubscription.restaurantId} was updated. Rate: ${updatedSubscription.price}.`,
        entityType: "subscription",
        entityId: updatedSubscription.id,
        dedupeKey: `subscription:${updatedSubscription.id}:status:${body.status || "updated"}:${Date.now()}`,
      }).onConflictDoNothing();

      return updatedSubscription;
    });
  }
}
