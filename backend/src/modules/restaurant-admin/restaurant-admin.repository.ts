import { and, count, desc, eq, gte, ilike, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { buildDashboardDateRange, createDateSeries, serializeDashboardDateRange, type dashboardDateRangeQuerySchema } from "../../common/dashboard/date-range.js";
import { db } from "../../config/database.js";
import { hashPassword } from "../../common/auth/password.js";
import { createPublicId } from "../../common/utils/id-generator.js";
import { AppError } from "../../common/errors/app-error.js";
import {
  admins,
  auditLogs,
  bills,
  customers,
  employees,
  licenses,
  notifications,
  orderItems,
  orders,
  payments,
  plans,
  restaurantTables,
  restaurants,
  subscriptions,
  superAdmins,
} from "../../db/schema/index.js";
import type { z } from "zod";
import type {
  restaurantAdminAuditSchema,
  restaurantAdminBillsSchema,
  restaurantAdminCreateStaffSchema,
  restaurantAdminListStaffSchema,
  restaurantAdminNotificationsSchema,
  restaurantAdminStaffStatusSchema,
  restaurantAdminUpdateStaffSchema,
} from "./restaurant-admin.validation.js";

type Tenant = { organizationId: string; restaurantId: string; adminId?: string; role?: string };
type DashboardRangeQuery = z.infer<typeof dashboardDateRangeQuerySchema>;

type StaffListQuery = z.infer<typeof restaurantAdminListStaffSchema>;
type StaffCreateInput = z.infer<typeof restaurantAdminCreateStaffSchema>;
type StaffRole = StaffCreateInput["role"];
type StaffUpdateInput = z.infer<typeof restaurantAdminUpdateStaffSchema>;
type StaffStatusInput = z.infer<typeof restaurantAdminStaffStatusSchema>;
type BillsQuery = z.infer<typeof restaurantAdminBillsSchema>;
type AuditQuery = z.infer<typeof restaurantAdminAuditSchema>;
type NotificationsQuery = z.infer<typeof restaurantAdminNotificationsSchema>;

function pageInput(query: { page?: number; limit?: number }) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  return { page, limit, offset: (page - 1) * limit };
}

function money(value: unknown) {
  return Number(value ?? 0);
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

type StaffLimitState = {
  allowed: boolean;
  role?: StaffRole;
  roleLabel?: string;
  limit: number | null;
  staffLimit: number | null;
  usedStaff: number;
  remainingStaff: number | null;
  usage?: {
    waiters: { used: number; limit: number | null; remaining: number | null };
    kitchen: { used: number; limit: number | null; remaining: number | null };
    receptionists: { used: number; limit: number | null; remaining: number | null };
  };
  subscriptionStatus?: string;
  subscriptionEndDate?: Date;
};

const staffRoleLabels: Record<StaffRole, string> = {
  WAITER: "waiters",
  KITCHEN: "kitchen staff",
  RECEPTION: "receptionists",
};

export class RestaurantAdminRepository {
  async dashboard(tenant: Tenant, query: DashboardRangeQuery) {
    const [restaurant] = await db.select({ timezone: restaurants.timezone }).from(restaurants).where(and(eq(restaurants.organizationId, tenant.organizationId), eq(restaurants.id, tenant.restaurantId))).limit(1);
    const dateRange = buildDashboardDateRange(query, restaurant?.timezone ?? "Asia/Kolkata");
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const trendStart = new Date(startOfDay);
    trendStart.setDate(startOfDay.getDate() - 13);

    const whereTenant = and(eq(bills.organizationId, tenant.organizationId), eq(bills.restaurantId, tenant.restaurantId));
    const orderTenant = and(eq(orders.organizationId, tenant.organizationId), eq(orders.restaurantId, tenant.restaurantId));
    const billRange = and(whereTenant, gte(bills.createdAt, dateRange.startDate), lt(bills.createdAt, dateRange.endExclusive));
    const orderRange = and(orderTenant, gte(orders.createdAt, dateRange.startDate), lt(orders.createdAt, dateRange.endExclusive));

    const [revenue] = await db.select({
      today: sql<string>`coalesce(sum(case when ${bills.createdAt} >= ${startOfDay} then ${bills.grandTotal} else 0 end), 0)`,
      week: sql<string>`coalesce(sum(case when ${bills.createdAt} >= ${startOfWeek} then ${bills.grandTotal} else 0 end), 0)`,
      month: sql<string>`coalesce(sum(case when ${bills.createdAt} >= ${startOfMonth} then ${bills.grandTotal} else 0 end), 0)`,
      selected: sql<string>`coalesce(sum(${bills.grandTotal}), 0)`,
    }).from(bills).where(whereTenant);

    const [selectedRevenue] = await db.select({
      selected: sql<string>`coalesce(sum(${bills.grandTotal}), 0)`,
    }).from(bills).where(billRange);

    const [orderCounts] = await db.select({
      today: sql<number>`count(*) filter (where ${orders.createdAt} >= ${startOfDay})`,
      week: sql<number>`count(*) filter (where ${orders.createdAt} >= ${startOfWeek})`,
      month: sql<number>`count(*) filter (where ${orders.createdAt} >= ${startOfMonth})`,
      total: count(),
      selected: count(),
      averageOrderValue: sql<string>`coalesce(avg(${orders.grandTotal}), 0)`,
    }).from(orders).where(orderRange);

    const [billCounts] = await db.select({
      total: count(),
      paid: sql<number>`count(*) filter (where ${bills.paymentStatus} = 'SUCCESS')`,
      pending: sql<number>`count(*) filter (where ${bills.paymentStatus} in ('PENDING', 'PARTIALLY_PAID'))`,
      cancelled: sql<number>`count(*) filter (where ${orders.status} = 'CANCELLED')`,
    }).from(bills).leftJoin(orders, eq(bills.orderId, orders.id)).where(billRange);

    const [staffCounts] = await db.select({
      total: count(),
      receptionists: sql<number>`count(*) filter (where ${employees.role} = 'RECEPTION')`,
      waiters: sql<number>`count(*) filter (where ${employees.role} = 'WAITER')`,
      kitchenStaff: sql<number>`count(*) filter (where ${employees.role} = 'KITCHEN')`,
      active: sql<number>`count(*) filter (where ${employees.status} = 'ACTIVE')`,
      inactive: sql<number>`count(*) filter (where ${employees.status} <> 'ACTIVE')`,
    }).from(employees).where(and(eq(employees.organizationId, tenant.organizationId), eq(employees.restaurantId, tenant.restaurantId)));

    const [subscription] = await db
      .select({
        id: subscriptions.id,
        billingCycle: subscriptions.billingCycle,
        price: subscriptions.price,
        currency: subscriptions.currency,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        planName: plans.name,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.organizationId, tenant.organizationId), eq(subscriptions.restaurantId, tenant.restaurantId)))
      .orderBy(desc(subscriptions.endDate))
      .limit(1);

    const [license] = await db
      .select({ status: licenses.status, expiresAt: licenses.expiresAt, licenseKey: licenses.licenseKey })
      .from(licenses)
      .where(and(eq(licenses.organizationId, tenant.organizationId), eq(licenses.restaurantId, tenant.restaurantId)))
      .orderBy(desc(licenses.expiresAt))
      .limit(1);

    const revenueBucket = this.bucketExpression(bills.createdAt, dateRange.grouping, dateRange.timezone);
    const orderBucket = this.bucketExpression(orders.createdAt, dateRange.grouping, dateRange.timezone);
    const series = createDateSeries(dateRange);
    const revenueTrendRows = await db.select({
      date: revenueBucket,
      revenue: sql<string>`coalesce(sum(${bills.grandTotal}), 0)`,
    }).from(bills).where(billRange).groupBy(sql`1`).orderBy(sql`1`);

    const orderTrendRows = await db.select({
      date: orderBucket,
      orders: count(),
    }).from(orders).where(orderRange).groupBy(sql`1`).orderBy(sql`1`);

    const paymentDistribution = await db.select({
      method: payments.method,
      total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      count: count(),
    }).from(payments).where(and(
      eq(payments.organizationId, tenant.organizationId),
      eq(payments.restaurantId, tenant.restaurantId),
      eq(payments.status, "SUCCESS"),
      gte(sql<Date>`coalesce(${payments.paidAt}, ${payments.createdAt})`, dateRange.startDate),
      lt(sql<Date>`coalesce(${payments.paidAt}, ${payments.createdAt})`, dateRange.endExclusive),
    )).groupBy(payments.method);
    const revenueByDate = new Map(revenueTrendRows.map((row) => [row.date, money(row.revenue)]));
    const ordersByDate = new Map(orderTrendRows.map((row) => [row.date, row.orders]));

    return {
      revenue: { today: money(revenue?.today), week: money(revenue?.week), month: money(revenue?.month), selected: money(selectedRevenue?.selected), averageOrderValue: money(orderCounts?.averageOrderValue) },
      orders: orderCounts,
      bills: billCounts,
      staff: staffCounts,
      subscription: subscription ? { ...subscription, remainingDays: daysBetween(now, subscription.endDate) } : null,
      license: license ? { ...license, remainingDays: daysBetween(now, license.expiresAt) } : null,
      charts: {
        revenueTrend: series.map((row) => ({ date: row.label, revenue: revenueByDate.get(row.key) ?? 0 })),
        orderTrend: series.map((row) => ({ date: row.label, orders: ordersByDate.get(row.key) ?? 0 })),
        paymentDistribution: paymentDistribution.map((row) => ({ method: row.method, total: money(row.total), count: row.count })),
        staffDistribution: [
          { role: "Receptionist", count: Number(staffCounts?.receptionists ?? 0) },
          { role: "Waiter", count: Number(staffCounts?.waiters ?? 0) },
          { role: "Kitchen Admin", count: Number(staffCounts?.kitchenStaff ?? 0) },
        ],
      },
      dateRange: serializeDashboardDateRange(dateRange),
    };
  }

  private bucketExpression(column: typeof bills.createdAt | typeof orders.createdAt, grouping: string, timezone: string) {
    if (grouping === "hourly") return sql<string>`to_char(${column} AT TIME ZONE ${timezone}, 'HH24')`;
    if (grouping === "monthly") return sql<string>`to_char(${column} AT TIME ZONE ${timezone}, 'YYYY-MM')`;
    if (grouping === "weekly") return sql<string>`to_char(date_trunc('week', ${column} AT TIME ZONE ${timezone}), 'YYYY-MM-DD')`;
    return sql<string>`to_char(${column} AT TIME ZONE ${timezone}, 'YYYY-MM-DD')`;
  }

  async listStaff(tenant: Tenant, query: StaffListQuery) {
    const { page, limit, offset } = pageInput(query);
    const filters = [
      eq(employees.organizationId, tenant.organizationId),
      eq(employees.restaurantId, tenant.restaurantId),
      query.role ? eq(employees.role, query.role) : undefined,
      query.status ? eq(employees.status, query.status) : undefined,
      query.search ? or(ilike(employees.fullName, `%${query.search}%`), ilike(employees.email, `%${query.search}%`), ilike(employees.phone, `%${query.search}%`), ilike(employees.employeeCode, `%${query.search}%`)) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = and(...filters);
    const rows = await db.select({
      id: employees.id,
      publicId: employees.publicId,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      phone: employees.phone,
      role: employees.role,
      status: employees.status,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
      lastLoginAt: employees.lastLoginAt,
    }).from(employees).where(where).orderBy(desc(employees.createdAt)).limit(limit).offset(offset);
    const [total] = await db.select({ value: count() }).from(employees).where(where);
    return { rows, total: total.value, page, limit };
  }

  async createStaff(tenant: Tenant, input: StaffCreateInput) {
    const email = input.email.trim().toLowerCase();
    return db.transaction(async (tx) => {
      const limitState = await this.checkStaffRoleLimit(tenant, input.role);
      if (!limitState.allowed) {
        await tx.insert(notifications).values({
          scope: "RESTAURANT",
          organizationId: tenant.organizationId,
          restaurantId: tenant.restaurantId,
          recipientAdminId: tenant.adminId,
          recipientRole: "RESTAURANT_ADMIN",
          type: "STAFF_LIMIT_REACHED",
          title: "Staff limit reached",
          message: limitState.subscriptionStatus && limitState.subscriptionStatus !== "ACTIVE"
            ? "Your subscription must be active to add staff members."
            : `Your subscription allows a maximum of ${limitState.limit ?? 0} ${limitState.roleLabel ?? "staff members"}. Please upgrade your subscription.`,
          entityType: "subscription",
          dedupeKey: `staff-limit:${tenant.restaurantId}:${limitState.usedStaff}:${limitState.staffLimit ?? "none"}`,
        }).onConflictDoNothing();

        if (limitState.subscriptionStatus && limitState.subscriptionStatus !== "ACTIVE") {
          throw new AppError("Your subscription must be active to add staff members.", 403, "SUBSCRIPTION_NOT_ACTIVE");
        }
        throw new AppError(`Your subscription allows a maximum of ${limitState.limit ?? 0} ${limitState.roleLabel ?? "staff members"}. Please upgrade your subscription.`, 403, "STAFF_ROLE_LIMIT_REACHED");
      }

      const [existingSuperAdmin] = await tx.select({ id: superAdmins.id }).from(superAdmins).where(eq(superAdmins.email, email));
      const [existingAdmin] = await tx.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
      const [existingEmployee] = await tx.select({ id: employees.id }).from(employees).where(and(eq(employees.restaurantId, tenant.restaurantId), eq(employees.email, email)));
      if (existingSuperAdmin || existingAdmin || existingEmployee) throw new AppError("Staff email already exists", 409, "STAFF_EMAIL_EXISTS");

      const [employee] = await tx.insert(employees).values({
        publicId: createPublicId("EMP"),
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        employeeCode: input.employeeCode ?? createPublicId("EMP-CODE"),
        fullName: input.fullName,
        email,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        status: "ACTIVE",
      }).returning();

      await tx.insert(auditLogs).values({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        actorAdminId: tenant.adminId,
        actorRole: "RESTAURANT_ADMIN",
        module: "STAFF",
        action: "STAFF_CREATED",
        entityType: "employee",
        entityId: employee.id,
        entityPublicId: employee.publicId,
        newValues: { role: employee.role, status: employee.status, shift: input.shift, assignedSection: input.assignedSection, kitchenStation: input.kitchenStation },
      });

      await tx.insert(notifications).values({
        scope: "RESTAURANT",
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        recipientAdminId: tenant.adminId,
        recipientRole: "RESTAURANT_ADMIN",
        type: "STAFF_CREATED",
        title: "Staff member created",
        message: `${employee.fullName} was added as ${employee.role}.`,
        entityType: "employee",
        entityId: employee.id,
        dedupeKey: `employee:${employee.id}:created`,
      }).onConflictDoNothing();

      return { ...employee, passwordHash: undefined };
    });
  }

  async updateStaff(tenant: Tenant, staffId: string, input: StaffUpdateInput) {
    const [existing] = await db.select().from(employees).where(and(eq(employees.id, staffId), eq(employees.organizationId, tenant.organizationId), eq(employees.restaurantId, tenant.restaurantId))).limit(1);
    if (!existing) throw new AppError("Staff member not found", 404, "STAFF_NOT_FOUND");
    const [updated] = await db.update(employees).set({
      fullName: input.fullName,
      email: input.email?.trim().toLowerCase(),
      phone: input.phone,
      role: input.role,
      employeeCode: input.employeeCode,
      updatedAt: new Date(),
    }).where(eq(employees.id, existing.id)).returning();
    await this.recordStaffAudit(tenant, updated.id, updated.publicId, "STAFF_UPDATED", { before: existing, after: updated });
    return { ...updated, passwordHash: undefined };
  }

  async changeStaffStatus(tenant: Tenant, staffId: string, input: StaffStatusInput) {
    const [updated] = await db.update(employees).set({ status: input.status, updatedAt: new Date() }).where(and(eq(employees.id, staffId), eq(employees.organizationId, tenant.organizationId), eq(employees.restaurantId, tenant.restaurantId))).returning();
    if (!updated) throw new AppError("Staff member not found", 404, "STAFF_NOT_FOUND");
    await this.recordStaffAudit(tenant, updated.id, updated.publicId, input.status === "ACTIVE" ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED", { status: input.status });
    return { ...updated, passwordHash: undefined };
  }

  async getStaff(tenant: Tenant, staffId: string) {
    const [row] = await db.select({
      id: employees.id,
      publicId: employees.publicId,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      phone: employees.phone,
      role: employees.role,
      status: employees.status,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
      lastLoginAt: employees.lastLoginAt,
    }).from(employees).where(and(eq(employees.id, staffId), eq(employees.organizationId, tenant.organizationId), eq(employees.restaurantId, tenant.restaurantId))).limit(1);
    if (!row) throw new AppError("Staff member not found", 404, "STAFF_NOT_FOUND");
    return row;
  }

  async listBills(tenant: Tenant, query: BillsQuery) {
    const { page, limit, offset } = pageInput(query);
    const filters = [
      eq(bills.organizationId, tenant.organizationId),
      eq(bills.restaurantId, tenant.restaurantId),
      query.paymentStatus ? eq(bills.paymentStatus, query.paymentStatus) : undefined,
      query.status ? eq(orders.status, query.status) : undefined,
      query.tableId ? eq(orders.tableId, query.tableId) : undefined,
      query.createdBy ? eq(payments.createdByEmployeeId, query.createdBy) : undefined,
      query.from ? gte(bills.createdAt, query.from) : undefined,
      query.to ? lte(bills.createdAt, query.to) : undefined,
      query.paymentMethod ? eq(payments.method, query.paymentMethod) : undefined,
      query.search ? or(ilike(bills.billNumber, `%${query.search}%`), ilike(orders.orderNumber, `%${query.search}%`), ilike(customers.name, `%${query.search}%`), ilike(restaurantTables.tableNumber, `%${query.search}%`)) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = and(...filters);

    const rows = await db.select({
      id: bills.id,
      billNumber: bills.billNumber,
      orderNumber: orders.orderNumber,
      table: restaurantTables.tableNumber,
      customer: customers.name,
      subtotal: bills.subtotal,
      discountTotal: bills.discountTotal,
      taxTotal: bills.taxTotal,
      grandTotal: bills.grandTotal,
      paidAmount: bills.paidAmount,
      remainingAmount: bills.remainingAmount,
      paymentStatus: bills.paymentStatus,
      paymentMethod: payments.method,
      orderStatus: orders.status,
      createdBy: employees.fullName,
      createdAt: bills.createdAt,
    }).from(bills)
      .innerJoin(orders, eq(bills.orderId, orders.id))
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(payments, eq(payments.billId, bills.id))
      .leftJoin(employees, eq(payments.createdByEmployeeId, employees.id))
      .where(where)
      .orderBy(desc(bills.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await db.select({ value: count() }).from(bills).innerJoin(orders, eq(bills.orderId, orders.id)).leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id)).leftJoin(customers, eq(orders.customerId, customers.id)).leftJoin(payments, eq(payments.billId, bills.id)).where(where);
    return { rows: rows.map((row) => ({ ...row, subtotal: money(row.subtotal), discountTotal: money(row.discountTotal), taxTotal: money(row.taxTotal), grandTotal: money(row.grandTotal), paidAmount: money(row.paidAmount), remainingAmount: money(row.remainingAmount) })), total: total.value, page, limit };
  }

  async getBill(tenant: Tenant, billId: string) {
    const [bill] = await db.select({
      id: bills.id,
      billNumber: bills.billNumber,
      subtotal: bills.subtotal,
      discountTotal: bills.discountTotal,
      taxTotal: bills.taxTotal,
      grandTotal: bills.grandTotal,
      paidAmount: bills.paidAmount,
      remainingAmount: bills.remainingAmount,
      paymentStatus: bills.paymentStatus,
      createdAt: bills.createdAt,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      table: restaurantTables.tableNumber,
      customer: customers.name,
      restaurantName: restaurants.name,
    }).from(bills)
      .innerJoin(orders, eq(bills.orderId, orders.id))
      .innerJoin(restaurants, eq(bills.restaurantId, restaurants.id))
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(bills.id, billId), eq(bills.organizationId, tenant.organizationId), eq(bills.restaurantId, tenant.restaurantId)))
      .limit(1);
    if (!bill) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
    const items = await db.select({
      itemName: orderItems.itemNameSnapshot,
      unitPrice: orderItems.unitPriceSnapshot,
      quantity: orderItems.quantity,
      discountAmount: orderItems.discountAmount,
      taxAmount: orderItems.taxAmount,
      lineTotal: orderItems.lineTotal,
    }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).innerJoin(bills, eq(bills.orderId, orders.id)).where(eq(bills.id, billId));
    const billPayments = await db.select().from(payments).where(and(eq(payments.billId, billId), eq(payments.restaurantId, tenant.restaurantId))).orderBy(desc(payments.createdAt));
    return {
      ...bill,
      subtotal: money(bill.subtotal),
      discountTotal: money(bill.discountTotal),
      taxTotal: money(bill.taxTotal),
      grandTotal: money(bill.grandTotal),
      paidAmount: money(bill.paidAmount),
      remainingAmount: money(bill.remainingAmount),
      items: items.map((item) => ({ ...item, unitPrice: money(item.unitPrice), discountAmount: money(item.discountAmount), taxAmount: money(item.taxAmount), lineTotal: money(item.lineTotal) })),
      payments: billPayments.map((payment) => ({ ...payment, amount: money(payment.amount) })),
    };
  }

  async subscription(tenant: Tenant) {
    const [row] = await db.select({
      id: subscriptions.id,
      planName: plans.name,
      planCode: plans.code,
      billingCycle: subscriptions.billingCycle,
      standardMonthlyPrice: plans.monthlyPrice,
      standardYearlyPrice: plans.yearlyPrice,
      waiterLimit: subscriptions.waiterLimitSnapshot,
      kitchenLimit: subscriptions.kitchenLimitSnapshot,
      receptionistLimit: subscriptions.receptionistLimitSnapshot,
      baseAmount: subscriptions.baseAmountSnapshot,
      gstPercentage: subscriptions.gstPercentageSnapshot,
      gstAmount: subscriptions.gstAmountSnapshot,
      finalAmountSnapshot: subscriptions.finalAmountSnapshot,
      durationMonths: subscriptions.durationMonthsSnapshot,
      finalPrice: subscriptions.price,
      currency: subscriptions.currency,
      status: subscriptions.status,
      paymentStatus: subscriptions.paymentStatus,
      startDate: subscriptions.startDate,
      endDate: subscriptions.endDate,
      renewalDate: subscriptions.renewalDate,
      licenseStatus: licenses.status,
      licenseKey: licenses.licenseKey,
      licenseExpiresAt: licenses.expiresAt,
    }).from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .leftJoin(licenses, eq(licenses.subscriptionId, subscriptions.id))
      .where(and(eq(subscriptions.organizationId, tenant.organizationId), eq(subscriptions.restaurantId, tenant.restaurantId)))
      .orderBy(desc(subscriptions.endDate))
      .limit(1);
    if (!row) throw new AppError("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
    const standardPrice = row.billingCycle === "YEARLY" ? row.standardYearlyPrice : row.standardMonthlyPrice;
    const staffLimitState = await this.checkStaffRoleLimit(tenant);
    const finalPrice = money(row.finalPrice);
    const basePrice = row.baseAmount === null ? finalPrice / 1.18 : money(row.baseAmount);
    const gstPercentage = row.gstPercentage === null ? 18 : money(row.gstPercentage);
    const gstAmount = row.gstAmount === null ? finalPrice - basePrice : money(row.gstAmount);
    return {
      ...row,
      planType: row.planCode.startsWith("CUSTOM-") ? "CUSTOMIZED" : "PREDEFINED",
      standardPrice: money(standardPrice),
      finalPrice,
      basePrice,
      gstPercentage,
      gstAmount,
      customPrice: money(row.finalPrice) !== money(standardPrice) ? money(row.finalPrice) : null,
      waiterLimit: row.waiterLimit,
      kitchenLimit: row.kitchenLimit,
      receptionistLimit: row.receptionistLimit,
      durationMonths: row.durationMonths,
      staffLimit: staffLimitState.staffLimit,
      usedStaff: staffLimitState.usedStaff,
      remainingStaff: staffLimitState.remainingStaff,
      roleUsage: staffLimitState.usage,
      remainingDays: daysBetween(new Date(), row.endDate),
    };
  }

  async checkStaffRoleLimit(tenant: Tenant, role?: StaffRole): Promise<StaffLimitState> {
    const [subscription] = await db
      .select({
        status: subscriptions.status,
        endDate: subscriptions.endDate,
        waiterLimit: subscriptions.waiterLimitSnapshot,
        kitchenLimit: subscriptions.kitchenLimitSnapshot,
        receptionistLimit: subscriptions.receptionistLimitSnapshot,
        planWaiterLimit: plans.waiterLimit,
        planKitchenLimit: plans.kitchenLimit,
        planReceptionistLimit: plans.receptionistLimit,
        maxUsers: plans.maxUsers,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.organizationId, tenant.organizationId), eq(subscriptions.restaurantId, tenant.restaurantId)))
      .orderBy(desc(subscriptions.endDate))
      .limit(1);

    const [staff] = await db.select({
      total: count(),
      waiters: sql<number>`count(*) filter (where ${employees.role} = 'WAITER')`,
      kitchen: sql<number>`count(*) filter (where ${employees.role} = 'KITCHEN')`,
      receptionists: sql<number>`count(*) filter (where ${employees.role} = 'RECEPTION')`,
    }).from(employees).where(and(eq(employees.organizationId, tenant.organizationId), eq(employees.restaurantId, tenant.restaurantId), eq(employees.status, "ACTIVE")));

    const usedStaff = Number(staff?.total ?? 0);
    if (!subscription) {
      return { allowed: false, limit: 0, staffLimit: 0, usedStaff, remainingStaff: 0 };
    }

    const waiterLimit = subscription.waiterLimit ?? subscription.planWaiterLimit ?? Math.max((subscription.maxUsers ?? 0) - 2, 1);
    const kitchenLimit = subscription.kitchenLimit ?? subscription.planKitchenLimit ?? 1;
    const receptionistLimit = subscription.receptionistLimit ?? subscription.planReceptionistLimit ?? 1;
    const totalLimit = waiterLimit + kitchenLimit + receptionistLimit;
    const usage = {
      waiters: { used: Number(staff?.waiters ?? 0), limit: waiterLimit, remaining: Math.max(0, waiterLimit - Number(staff?.waiters ?? 0)) },
      kitchen: { used: Number(staff?.kitchen ?? 0), limit: kitchenLimit, remaining: Math.max(0, kitchenLimit - Number(staff?.kitchen ?? 0)) },
      receptionists: { used: Number(staff?.receptionists ?? 0), limit: receptionistLimit, remaining: Math.max(0, receptionistLimit - Number(staff?.receptionists ?? 0)) },
    };

    if (subscription.status !== "ACTIVE" || subscription.endDate <= new Date()) {
      return { allowed: false, limit: 0, staffLimit: totalLimit, usedStaff, remainingStaff: 0, usage, subscriptionStatus: subscription.status, subscriptionEndDate: subscription.endDate };
    }

    if (!role) {
      return {
        allowed: usedStaff < totalLimit,
        limit: totalLimit,
        staffLimit: totalLimit,
        usedStaff,
        remainingStaff: Math.max(0, totalLimit - usedStaff),
        usage,
        subscriptionStatus: subscription.status,
        subscriptionEndDate: subscription.endDate,
      };
    }

    const roleLimit = role === "WAITER" ? waiterLimit : role === "KITCHEN" ? kitchenLimit : receptionistLimit;
    const roleUsed = role === "WAITER" ? usage.waiters.used : role === "KITCHEN" ? usage.kitchen.used : usage.receptionists.used;
    const remainingStaff = Math.max(0, roleLimit - roleUsed);
    return {
      allowed: roleUsed < roleLimit,
      role,
      roleLabel: staffRoleLabels[role],
      limit: roleLimit,
      staffLimit: totalLimit,
      usedStaff: roleUsed,
      remainingStaff,
      usage,
      subscriptionStatus: subscription.status,
      subscriptionEndDate: subscription.endDate,
    };
  }

  async auditLogs(tenant: Tenant, query: AuditQuery) {
    const { page, limit, offset } = pageInput(query);
    const filters = [
      eq(auditLogs.organizationId, tenant.organizationId),
      eq(auditLogs.restaurantId, tenant.restaurantId),
      query.module ? ilike(auditLogs.module, `%${query.module}%`) : undefined,
      query.action ? ilike(auditLogs.action, `%${query.action}%`) : undefined,
      query.search ? or(ilike(auditLogs.action, `%${query.search}%`), ilike(auditLogs.description, `%${query.search}%`), ilike(auditLogs.entityType, `%${query.search}%`)) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = and(...filters);
    const rows = await db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
    const [total] = await db.select({ value: count() }).from(auditLogs).where(where);
    return { rows, total: total.value, page, limit };
  }

  async activityLogs(tenant: Tenant, query: AuditQuery) {
    const data = await this.auditLogs(tenant, { ...query, module: query.module ?? "STAFF" });
    return data;
  }

  async notifications(tenant: Tenant, query: NotificationsQuery) {
    const { page, limit, offset } = pageInput(query);
    const recipientCondition = tenant.adminId
      ? or(eq(notifications.recipientAdminId, tenant.adminId), eq(notifications.recipientRole, "RESTAURANT_ADMIN"))
      : eq(notifications.recipientRole, "RESTAURANT_ADMIN");
    const filters = [
      eq(notifications.organizationId, tenant.organizationId),
      eq(notifications.restaurantId, tenant.restaurantId),
      recipientCondition,
      query.status === "read" ? eq(notifications.isRead, true) : undefined,
      query.status === "unread" ? eq(notifications.isRead, false) : undefined,
      query.search ? or(ilike(notifications.title, `%${query.search}%`), ilike(notifications.message, `%${query.search}%`), ilike(notifications.type, `%${query.search}%`)) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = and(...filters);
    const rows = await db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
    const [total] = await db.select({ value: count() }).from(notifications).where(where);
    const [unread] = await db.select({ value: count() }).from(notifications).where(and(eq(notifications.organizationId, tenant.organizationId), eq(notifications.restaurantId, tenant.restaurantId), recipientCondition, eq(notifications.isRead, false)));
    return { rows, unread: unread.value, total: total.value, page, limit };
  }

  async markNotificationRead(tenant: Tenant, notificationId: string) {
    const recipientCondition = tenant.adminId
      ? or(eq(notifications.recipientAdminId, tenant.adminId), eq(notifications.recipientRole, "RESTAURANT_ADMIN"))
      : eq(notifications.recipientRole, "RESTAURANT_ADMIN");
    const [row] = await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.organizationId, tenant.organizationId),
        eq(notifications.restaurantId, tenant.restaurantId),
        recipientCondition,
      ))
      .returning();
    if (!row) throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    return row;
  }

  async markAllNotificationsRead(tenant: Tenant) {
    const recipientCondition = tenant.adminId
      ? or(eq(notifications.recipientAdminId, tenant.adminId), eq(notifications.recipientRole, "RESTAURANT_ADMIN"))
      : eq(notifications.recipientRole, "RESTAURANT_ADMIN");
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.organizationId, tenant.organizationId),
        eq(notifications.restaurantId, tenant.restaurantId),
        eq(notifications.isRead, false),
        recipientCondition,
      ));
    return { read: true };
  }

  private async recordStaffAudit(tenant: Tenant, entityId: string, entityPublicId: string, action: string, metadata: Record<string, unknown>) {
    await db.insert(auditLogs).values({
      organizationId: tenant.organizationId,
      restaurantId: tenant.restaurantId,
      actorAdminId: tenant.adminId,
      actorRole: "RESTAURANT_ADMIN",
      module: "STAFF",
      action,
      entityType: "employee",
      entityId,
      entityPublicId,
      metadata,
    });
  }
}
