import { and, count, desc, eq, exists, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { AppError } from "../../../common/errors/app-error.js";
import { createPublicId } from "../../../common/utils/id-generator.js";
import {
  admins,
  auditLogs,
  employees,
  licenses,
  notifications,
  organizations,
  plans,
  restaurants,
  subscriptions,
  superAdmins,
} from "../../../db/schema/index.js";
import type { CreateRestaurantInput, ListRestaurantQuery, UpdateRestaurantInput } from "./restaurant.types.js";

const DEFAULT_GST_PERCENTAGE = 18;

function addMonthsUtc(date: Date, months: number) {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function calculateFinalAmount(basePrice: number, gstPercentage = DEFAULT_GST_PERCENTAGE) {
  const gstAmount = basePrice * (gstPercentage / 100);
  return {
    basePrice,
    gstPercentage,
    gstAmount,
    finalAmount: basePrice + gstAmount,
  };
}

function planRoleLimits(plan: typeof plans.$inferSelect, customPlan?: NonNullable<CreateRestaurantInput["customPlan"]>) {
  const waiterLimit = customPlan?.waiterLimit ?? plan.waiterLimit ?? Math.max((plan.maxUsers ?? 0) - 2, 1);
  const kitchenLimit = customPlan?.kitchenLimit ?? plan.kitchenLimit ?? 1;
  const receptionistLimit = customPlan?.receptionistLimit ?? plan.receptionistLimit ?? 1;
  return { waiterLimit, kitchenLimit, receptionistLimit, total: waiterLimit + kitchenLimit + receptionistLimit };
}

export class RestaurantRepository {
  async list(query: ListRestaurantQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const filters = [
      query.status ? eq(restaurants.status, query.status) : undefined,
      query.subscriptionStatus
        ? exists(db.select({ id: subscriptions.id }).from(subscriptions).where(and(eq(subscriptions.restaurantId, restaurants.id), eq(subscriptions.status, query.subscriptionStatus))))
        : undefined,
      query.licenseStatus
        ? exists(db.select({ id: licenses.id }).from(licenses).where(and(eq(licenses.restaurantId, restaurants.id), eq(licenses.status, query.licenseStatus))))
        : undefined,
      query.search
        ? or(ilike(restaurants.name, `%${query.search}%`), ilike(restaurants.email, `%${query.search}%`), ilike(restaurants.publicId, `%${query.search}%`))
        : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));

    const where = filters.length ? and(...filters) : undefined;
    const restaurantRows = await db
      .select()
      .from(restaurants)
      .where(where)
      .orderBy(desc(restaurants.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await db.select({ value: count() }).from(restaurants).where(where);
    const restaurantIds = restaurantRows.map((restaurant) => restaurant.id);

    if (restaurantIds.length === 0) {
      return { rows: [], total: total.value, page, limit };
    }

    const ownerRows = await db
      .select({
        restaurantId: admins.restaurantId,
        id: admins.publicId,
        name: admins.fullName,
        email: admins.email,
        phone: admins.phone,
        status: admins.status,
        createdAt: admins.createdAt,
      })
      .from(admins)
      .where(inArray(admins.restaurantId, restaurantIds))
      .orderBy(desc(admins.createdAt));

    const subscriptionRows = await db
      .select({
        restaurantId: subscriptions.restaurantId,
        id: subscriptions.id,
        status: subscriptions.status,
        billingCycle: subscriptions.billingCycle,
        endDate: subscriptions.endDate,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .where(inArray(subscriptions.restaurantId, restaurantIds))
      .orderBy(desc(subscriptions.createdAt));

    const licenseRows = await db
      .select({
        restaurantId: licenses.restaurantId,
        id: licenses.id,
        licenseKey: licenses.licenseKey,
        status: licenses.status,
        issuedAt: licenses.issuedAt,
        expiresAt: licenses.expiresAt,
      })
      .from(licenses)
      .where(inArray(licenses.restaurantId, restaurantIds))
      .orderBy(desc(licenses.expiresAt));

    const ownersByRestaurant = new Map<string, (typeof ownerRows)[number]>();
    for (const owner of ownerRows) {
      if (!ownersByRestaurant.has(owner.restaurantId)) ownersByRestaurant.set(owner.restaurantId, owner);
    }

    const subscriptionsByRestaurant = new Map<string, (typeof subscriptionRows)[number]>();
    for (const subscription of subscriptionRows) {
      if (!subscriptionsByRestaurant.has(subscription.restaurantId)) subscriptionsByRestaurant.set(subscription.restaurantId, subscription);
    }

    const licensesByRestaurant = new Map<string, (typeof licenseRows)[number]>();
    for (const license of licenseRows) {
      if (!licensesByRestaurant.has(license.restaurantId)) licensesByRestaurant.set(license.restaurantId, license);
    }

    const rows = restaurantRows.map((restaurant) => {
        const owner = ownersByRestaurant.get(restaurant.id);
        const subscription = subscriptionsByRestaurant.get(restaurant.id);
        const license = licensesByRestaurant.get(restaurant.id);

        return {
          id: restaurant.id,
          publicId: restaurant.publicId,
          organizationId: restaurant.organizationId,
          code: restaurant.code,
          name: restaurant.name,
          ownerName: owner?.name ?? restaurant.ownerName,
          ownerEmail: owner?.email ?? null,
          ownerPhone: owner?.phone ?? null,
          email: restaurant.email,
          phone: restaurant.phone,
          alternatePhone: restaurant.alternatePhone,
          addressLine1: restaurant.addressLine1,
          addressLine2: restaurant.addressLine2,
          city: restaurant.city,
          state: restaurant.state,
          country: restaurant.country,
          postalCode: restaurant.postalCode,
          taxNumber: restaurant.taxNumber,
          businessType: restaurant.businessType,
          cuisineType: restaurant.cuisineType,
          timezone: restaurant.timezone,
          currency: restaurant.currency,
          logo: restaurant.logo,
          website: restaurant.website,
          status: restaurant.status,
          subscriptionStatus: subscription?.status ?? null,
          subscriptionBillingCycle: subscription?.billingCycle ?? null,
          subscriptionExpiry: subscription?.endDate ?? null,
          licenseStatus: license?.status ?? null,
          licenseKey: license?.licenseKey ?? null,
          licenseIssuedAt: license?.issuedAt ?? null,
          licenseExpiry: license?.expiresAt ?? null,
          createdAt: restaurant.createdAt,
          updatedAt: restaurant.updatedAt,
        };
      });

    return { rows, total: total.value, page, limit };
  }

  async detail(id: string) {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    if (!restaurant) return null;

    const subscriptionRows = await db
      .select({ subscription: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.restaurantId, id))
      .orderBy(desc(subscriptions.createdAt));

    const licenseRows = await db.select().from(licenses).where(eq(licenses.restaurantId, id)).orderBy(desc(licenses.expiresAt));
    const adminRows = await db
      .select({
        id: admins.publicId,
        name: admins.fullName,
        email: admins.email,
        phone: admins.phone,
        status: admins.status,
        lastLoginAt: admins.lastLoginAt,
        createdAt: admins.createdAt,
        updatedAt: admins.updatedAt,
      })
      .from(admins)
      .where(eq(admins.restaurantId, id))
      .orderBy(desc(admins.createdAt));
    const employeeRows = await db.select().from(employees).where(eq(employees.restaurantId, id));

    const auditRows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.restaurantId, id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    return {
      restaurant,
      owner: adminRows[0] ?? null,
      subscriptions: subscriptionRows,
      currentSubscription: subscriptionRows[0] ?? null,
      licenses: licenseRows,
      currentLicense: licenseRows[0] ?? null,
      restaurantAdmins: adminRows,
      employees: employeeRows,
      recentAuditActivity: auditRows,
    };
  }

  async createTransactional(input: CreateRestaurantInput, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const ownerEmail = input.adminEmail.trim().toLowerCase();
      const restaurantEmail = input.email.trim().toLowerCase();
      const [existingAdmin] = await tx.select({ id: admins.id }).from(admins).where(eq(admins.email, ownerEmail));
      const [existingEmployee] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.email, ownerEmail));
      const [existingSuperAdmin] = await tx.select({ id: superAdmins.id }).from(superAdmins).where(eq(superAdmins.email, ownerEmail));
      if (existingAdmin || existingEmployee || existingSuperAdmin) {
        throw new AppError("Restaurant owner login email already exists", 409, "RESTAURANT_OWNER_EMAIL_ALREADY_EXISTS");
      }
      const [existingRestaurantByEmail] = await tx.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.email, restaurantEmail));
      if (existingRestaurantByEmail) {
        throw new AppError("Restaurant email already exists", 409, "RESTAURANT_EMAIL_ALREADY_EXISTS");
      }
      const [existingRestaurantByCode] = await tx.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.code, input.restaurantCode));
      if (existingRestaurantByCode) {
        throw new AppError("Restaurant code already exists", 409, "RESTAURANT_CODE_ALREADY_EXISTS");
      }

      const isCustomPlan = input.planType === "CUSTOMIZED";
      let selectedPlan: typeof plans.$inferSelect | undefined;
      if (!isCustomPlan) {
        if (!input.planId) throw new AppError("Select an active predefined plan", 400, "MISSING_PLAN");
        const [plan] = await tx.select().from(plans).where(and(eq(plans.id, input.planId), eq(plans.isActive, true)));
        if (!plan || plan.code.startsWith("CUSTOM-")) {
          throw new AppError("Selected subscription plan is not available for new restaurants", 400, "PLAN_NOT_SELECTABLE");
        }
        selectedPlan = plan;
      }

      const startDate = new Date(input.startDate);
      const durationMonths = input.durationMonths ?? (input.billingCycle === "YEARLY" ? 12 : 1);
      const endDate = input.expiryDate ? new Date(input.expiryDate) : addMonthsUtc(startDate, durationMonths);
      const renewalDate = input.renewalDate ? new Date(input.renewalDate) : endDate;

      const [organization] = await tx
        .insert(organizations)
        .values({
          publicId: createPublicId("ORG"),
          name: input.restaurantName,
          email: input.email,
          phone: input.phone,
          status: input.status ?? "ACTIVE",
        })
        .returning();

      const [restaurant] = await tx
        .insert(restaurants)
        .values({
          organizationId: organization.id,
          publicId: input.publicId,
          code: input.restaurantCode,
          name: input.restaurantName,
          ownerName: input.ownerName,
          email: restaurantEmail,
          phone: input.phone,
          alternatePhone: input.alternatePhone,
          address: input.address ?? input.addressLine1,
          addressLine1: input.addressLine1 ?? input.address,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          country: input.country,
          postalCode: input.postalCode,
          taxNumber: input.taxNumber,
          businessType: input.businessType,
          cuisineType: input.cuisineType,
          timezone: input.timezone,
          currency: input.currency ?? "INR",
          logo: input.logo,
          website: input.website,
          status: input.status ?? "ACTIVE",
        })
        .returning();

      if (isCustomPlan) {
        if (!input.customPlan) throw new AppError("Custom plan details are required", 400, "CUSTOM_PLAN_REQUIRED");
        const [customPlan] = await tx
          .insert(plans)
          .values({
            code: `CUSTOM-${restaurant.code}`,
            name: input.customPlan.name,
            description: input.customPlan.description ?? `Customized plan for ${restaurant.name}`,
            monthlyPrice: Number(input.customPlan.basePrice).toFixed(2),
            yearlyPrice: Number(input.customPlan.basePrice).toFixed(2),
            durationMonths,
            gstPercentage: Number(input.customPlan.gstPercentage).toFixed(2),
            features: input.customPlan.features,
            maxUsers: input.customPlan.waiterLimit + input.customPlan.kitchenLimit + input.customPlan.receptionistLimit,
            waiterLimit: input.customPlan.waiterLimit,
            kitchenLimit: input.customPlan.kitchenLimit,
            receptionistLimit: input.customPlan.receptionistLimit,
            planType: "CUSTOMIZED",
            organizationId: organization.id,
            restaurantId: restaurant.id,
            isActive: false,
          })
          .returning();
        selectedPlan = customPlan;
      }

      if (!selectedPlan) {
        throw new AppError("Required plan missing", 400, "MISSING_PLAN");
      }

      const basePrice = isCustomPlan
        ? Number(input.customPlan?.basePrice ?? 0)
        : Number(input.billingCycle === "YEARLY" ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice);
      const billing = calculateFinalAmount(basePrice, isCustomPlan ? input.customPlan?.gstPercentage : Number(selectedPlan.gstPercentage ?? DEFAULT_GST_PERCENTAGE));
      const price = billing.finalAmount.toFixed(2);
      const roleLimits = planRoleLimits(selectedPlan, input.customPlan);

      const [admin] = await tx
        .insert(admins)
        .values({
          publicId: input.adminPublicId,
          organizationId: organization.id,
          restaurantId: restaurant.id,
          fullName: input.adminName,
          email: ownerEmail,
          phone: input.adminPhone,
          passwordHash: input.adminPasswordHash,
          status: "ACTIVE",
        })
        .returning();

      let actorUuid: string | undefined = undefined;
      if (actorSuperAdminId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorSuperAdminId);
        const [actor] = await tx
          .select({ id: superAdmins.id })
          .from(superAdmins)
          .where(isUuid ? eq(superAdmins.id, actorSuperAdminId) : eq(superAdmins.publicId, actorSuperAdminId));
        if (actor) actorUuid = actor.id;
      }

      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          restaurantId: restaurant.id,
          organizationId: organization.id,
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
          billingCycle: input.billingCycle,
          price,
          currency: input.currency ?? "INR",
          status: "ACTIVE",
          paymentStatus: "PENDING",
          startDate,
          endDate,
          renewalDate,
        })
        .returning();

      const [license] = await tx
        .insert(licenses)
        .values({
          licenseKey: input.licenseKey,
          organizationId: organization.id,
          restaurantId: restaurant.id,
          subscriptionId: subscription.id,
          status: input.licenseStatus ?? "ACTIVE",
          issuedAt: startDate,
          expiresAt: endDate,
        })
        .returning();

      await tx.insert(auditLogs).values({
        actorSuperAdminId: actorUuid,
        actorRole: "SUPER_ADMIN",
        organizationId: organization.id,
        restaurantId: restaurant.id,
        action: "RESTAURANT_CREATED",
        module: "RESTAURANT",
        entityType: "restaurant",
        entityPublicId: restaurant.publicId,
        newValues: {
          restaurant: restaurant.publicId,
          owner: admin.publicId,
          subscription: subscription.id,
          license: license.licenseKey,
          planType: isCustomPlan ? "CUSTOMIZED" : "PREDEFINED",
          plan: selectedPlan.code,
          basePrice: billing.basePrice,
          gstPercentage: billing.gstPercentage,
          gstAmount: billing.gstAmount,
          finalAmount: billing.finalAmount,
          waiterLimit: roleLimits.waiterLimit,
          kitchenLimit: roleLimits.kitchenLimit,
          receptionistLimit: roleLimits.receptionistLimit,
        },
      });

      if (isCustomPlan) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId: actorUuid,
          actorRole: "SUPER_ADMIN",
          organizationId: organization.id,
          restaurantId: restaurant.id,
          action: "CREATE_CUSTOM_PLAN",
          module: "SUBSCRIPTION",
          entityType: "subscription_plan",
          entityId: selectedPlan.id,
          entityPublicId: selectedPlan.code,
          newValues: { plan: selectedPlan.code, roleLimits, finalAmount: billing.finalAmount },
        });
      }

      await tx.insert(auditLogs).values({
        actorSuperAdminId: actorUuid,
        actorRole: "SUPER_ADMIN",
        organizationId: organization.id,
        restaurantId: restaurant.id,
        action: "RESTAURANT_OWNER_CREATED",
        module: "RESTAURANT",
        entityType: "restaurant_admin",
        entityPublicId: admin.publicId,
        newValues: { ownerEmail: admin.email, ownerStatus: admin.status },
      });

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: organization.id,
        restaurantId: restaurant.id,
        recipientAdminId: admin.id,
        recipientRole: "RESTAURANT_ADMIN",
        type: "RESTAURANT_CREATED",
        title: "Restaurant created",
        message: `${restaurant.name} was created with restaurant owner ${admin.email}.`,
        entityType: "restaurant",
        entityId: restaurant.id,
        dedupeKey: `restaurant:${restaurant.id}:created`,
      }).onConflictDoNothing();

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: organization.id,
        restaurantId: restaurant.id,
        recipientAdminId: admin.id,
        recipientRole: "RESTAURANT_ADMIN",
        type: "SUBSCRIPTION_CREATED",
        title: "Subscription created",
        message: `${restaurant.name} subscription was created and is valid until ${endDate.toISOString()}.`,
        entityType: "subscription",
        entityId: subscription.id,
        dedupeKey: `subscription:${subscription.id}:created`,
      }).onConflictDoNothing();

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: organization.id,
        restaurantId: restaurant.id,
        recipientAdminId: admin.id,
        recipientRole: "RESTAURANT_ADMIN",
        type: "LICENSE_CREATED",
        title: "License created",
        message: `${restaurant.name} license was created and is valid until ${endDate.toISOString()}.`,
        entityType: "license",
        entityId: license.id,
        dedupeKey: `license:${license.id}:created`,
      }).onConflictDoNothing();

      return {
        restaurant,
        organization,
        admin: { id: admin.publicId, name: admin.fullName, email: admin.email, phone: admin.phone, role: "RESTAURANT_ADMIN", status: admin.status },
        owner: { id: admin.publicId, name: admin.fullName, email: admin.email, phone: admin.phone, role: "RESTAURANT_ADMIN", status: admin.status },
        subscription,
        license,
      };
    });
  }

  async update(id: string, input: UpdateRestaurantInput) {
    const [row] = await db
      .update(restaurants)
      .set({
        name: input.restaurantName,
        code: input.restaurantCode,
        ownerName: input.ownerName,
        email: input.email,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        address: input.address ?? input.addressLine1,
        addressLine1: input.addressLine1 ?? input.address,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        country: input.country,
        postalCode: input.postalCode,
        taxNumber: input.taxNumber,
        businessType: input.businessType,
        cuisineType: input.cuisineType,
        timezone: input.timezone,
        currency: input.currency,
        logo: input.logo,
        website: input.website,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id))
      .returning();
    return row;
  }

  async changeStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED", actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(restaurants)
        .set({ status, archivedAt: status === "ARCHIVED" ? new Date() : null, updatedAt: new Date() })
        .where(eq(restaurants.id, id))
        .returning();

      if (!row) return row;

      let actorUuid: string | undefined = undefined;
      if (actorSuperAdminId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorSuperAdminId);
        const [actor] = await tx
          .select({ id: superAdmins.id })
          .from(superAdmins)
          .where(isUuid ? eq(superAdmins.id, actorSuperAdminId) : eq(superAdmins.publicId, actorSuperAdminId));
        if (actor) actorUuid = actor.id;
      }

      const actionMap = {
        ACTIVE: "RESTAURANT_ACTIVATED",
        INACTIVE: "RESTAURANT_DEACTIVATED",
        SUSPENDED: "RESTAURANT_SUSPENDED",
        BLOCKED: "RESTAURANT_BLOCKED",
        ARCHIVED: "RESTAURANT_ARCHIVED",
      } as const;

      await tx.insert(auditLogs).values({
        actorSuperAdminId: actorUuid,
        actorRole: "SUPER_ADMIN",
        organizationId: row.organizationId,
        restaurantId: row.id,
        action: actionMap[status],
        module: "RESTAURANT",
        entityType: "restaurant",
        entityPublicId: row.publicId,
        newValues: { status },
      });

      await tx.insert(notifications).values({
        scope: "SYSTEM",
        organizationId: row.organizationId,
        restaurantId: row.id,
        type: actionMap[status],
        title: `Restaurant ${status.toLowerCase()}`,
        message: `${row.name} status changed to ${status}.`,
        entityType: "restaurant",
        entityId: row.id,
        dedupeKey: `restaurant:${row.id}:status:${status}:${row.updatedAt.toISOString()}`,
      }).onConflictDoNothing();

      return row;
    });
  }
}
