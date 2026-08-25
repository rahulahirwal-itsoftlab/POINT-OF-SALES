import { count, eq, and, gt, lt, isNotNull, gte, sql } from "drizzle-orm";
import { serializeDashboardDateRange, type DashboardDateRange } from "../../../common/dashboard/date-range.js";
import { db } from "../../../config/database.js";
import { admins, subscriptions, licenses, payments, organizations, notifications, platformSettings } from "../../../db/schema/index.js";

export class DashboardRepository {
  async getOverview(dateRange: DashboardDateRange) {
    const [settings] = await db
      .select({ licenseWarningDays: platformSettings.licenseWarningDays })
      .from(platformSettings)
      .limit(1);
    const warningDays = settings?.licenseWarningDays ?? 30;

    const [
      [total],
      [active],
      [blocked],
      [inactive],
      [organizationTotal],
      [organizationActive],
      [organizationInactive],
      [organizationBlocked],
      [newOrganizations],
      [subscriptionsActive],
      [subscriptionsExpired],
      [subscriptionsMonthly],
      [subscriptionsYearly],
      [subscriptionsExpiringSoon],
      [licensesActive],
      [licensesExpired],
      [licensesExpiringSoon],
      [revenueTotalQuery],
      [revenueMonthlyQuery],
      [revenueYearlyQuery],
      [revenueSelectedQuery],
      [activeSubPriceTotalQuery],
      [selectedSubPriceTotalQuery],
      [recentUnreadNotifications],
    ] = await Promise.all([
      db.select({ value: count() }).from(admins),
      db.select({ value: count() }).from(admins).where(eq(admins.status, "ACTIVE")),
      db.select({ value: count() }).from(admins).where(eq(admins.status, "BLOCKED")),
      db.select({ value: count() }).from(admins).where(eq(admins.status, "INACTIVE")),
      db.select({ value: count() }).from(organizations),
      db.select({ value: count() }).from(organizations).where(eq(organizations.status, "ACTIVE")),
      db.select({ value: count() }).from(organizations).where(eq(organizations.status, "INACTIVE")),
      db.select({ value: count() }).from(organizations).where(eq(organizations.status, "BLOCKED")),
      db.select({ value: count() }).from(organizations).where(and(gte(organizations.createdAt, dateRange.startDate), lt(organizations.createdAt, dateRange.endExclusive))),
      db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.status, "ACTIVE")),
      db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.status, "EXPIRED")),
      db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.billingCycle, "MONTHLY")),
      db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.billingCycle, "YEARLY")),
      db.select({ value: count() }).from(subscriptions).where(
        and(
          eq(subscriptions.status, "ACTIVE"),
          gt(subscriptions.endDate, sql`NOW()`),
          lt(subscriptions.endDate, sql`NOW() + (${warningDays} || ' days')::interval`),
        ),
      ),
      db.select({ value: count() }).from(licenses).where(eq(licenses.status, "ACTIVE")),
      db.select({ value: count() }).from(licenses).where(eq(licenses.status, "EXPIRED")),
      db.select({ value: count() }).from(licenses).where(
        and(
          eq(licenses.status, "ACTIVE"),
          gt(licenses.expiresAt, sql`NOW()`),
          lt(licenses.expiresAt, sql`NOW() + (${warningDays} || ' days')::interval`),
        ),
      ),
      db.select({ total: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS NUMERIC)), 0)` })
        .from(payments)
        .where(and(isNotNull(payments.subscriptionId), eq(payments.status, "SUCCESS"))),
      db.select({ total: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS NUMERIC)), 0)` })
        .from(payments)
        .where(and(
          isNotNull(payments.subscriptionId),
          eq(payments.status, "SUCCESS"),
          sql`date_trunc('month', ${payments.createdAt}) = date_trunc('month', CURRENT_DATE)`,
        )),
      db.select({ total: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS NUMERIC)), 0)` })
        .from(payments)
        .where(and(
          isNotNull(payments.subscriptionId),
          eq(payments.status, "SUCCESS"),
          sql`date_trunc('year', ${payments.createdAt}) = date_trunc('year', CURRENT_DATE)`,
        )),
      db.select({ total: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS NUMERIC)), 0)` })
        .from(payments)
        .where(and(
          isNotNull(payments.subscriptionId),
          eq(payments.status, "SUCCESS"),
          gte(payments.createdAt, dateRange.startDate),
          lt(payments.createdAt, dateRange.endExclusive),
        )),
      db.select({ total: sql<number>`COALESCE(SUM(CAST(${subscriptions.price} AS NUMERIC)), 0)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "ACTIVE")),
      db.select({ total: sql<number>`COALESCE(SUM(CAST(${subscriptions.price} AS NUMERIC)), 0)` })
        .from(subscriptions)
        .where(and(
          eq(subscriptions.status, "ACTIVE"),
          gte(subscriptions.startDate, dateRange.startDate),
          lt(subscriptions.startDate, dateRange.endExclusive),
        )),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.isRead, false), gte(notifications.createdAt, dateRange.startDate), lt(notifications.createdAt, dateRange.endExclusive))),
    ]);

    const totalRestaurantAdmins = total?.value ?? 0;
    const activeRestaurantAdmins = active?.value ?? 0;
    const blockedRestaurantAdmins = blocked?.value ?? 0;
    const inactiveRestaurantAdmins = inactive?.value ?? 0;

    const paymentTotal = Number(revenueTotalQuery?.total ?? 0);
    const subTotal = Number(activeSubPriceTotalQuery?.total ?? 0);
    const totalRev = paymentTotal > 0 ? paymentTotal : subTotal;

    const paymentMonthly = Number(revenueMonthlyQuery?.total ?? 0);
    const monthlyRev = paymentMonthly > 0 ? paymentMonthly : subTotal;

    const paymentYearly = Number(revenueYearlyQuery?.total ?? 0);
    const yearlyRev = paymentYearly > 0 ? paymentYearly : subTotal;

    const paymentSelected = Number(revenueSelectedQuery?.total ?? 0);
    const selectedSubTotal = Number(selectedSubPriceTotalQuery?.total ?? 0);
    const selectedRev = paymentSelected > 0 ? paymentSelected : (selectedSubTotal > 0 ? selectedSubTotal : subTotal);

    return {
      organizations: {
        total: organizationTotal?.value ?? 0,
        active: organizationActive?.value ?? 0,
        inactive: organizationInactive?.value ?? 0,
        blocked: organizationBlocked?.value ?? 0,
        new: newOrganizations?.value ?? 0,
      },
      admins: {
        total: totalRestaurantAdmins,
        active: activeRestaurantAdmins,
        blocked: blockedRestaurantAdmins,
        inactive: inactiveRestaurantAdmins,
      },
      subscriptions: {
        active: subscriptionsActive?.value ?? 0,
        expired: subscriptionsExpired?.value ?? 0,
        expiringSoon: subscriptionsExpiringSoon?.value ?? 0,
        monthly: subscriptionsMonthly?.value ?? 0,
        yearly: subscriptionsYearly?.value ?? 0,
      },
      licenses: {
        active: licensesActive?.value ?? 0,
        expired: licensesExpired?.value ?? 0,
        expiringSoon: licensesExpiringSoon?.value ?? 0,
      },
      revenue: {
        total: totalRev,
        monthly: monthlyRev,
        yearly: yearlyRev,
        selected: selectedRev,
      },
      notifications: {
        unread: recentUnreadNotifications?.value ?? 0,
      },
      dateRange: serializeDashboardDateRange(dateRange),
    };
  }
}
