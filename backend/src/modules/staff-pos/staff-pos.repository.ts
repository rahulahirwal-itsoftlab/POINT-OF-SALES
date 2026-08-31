import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { AppError } from "../../common/errors/app-error.js";
import { buildDashboardDateRange, serializeDashboardDateRange, type DashboardDateRange, type dashboardDateRangeQuerySchema } from "../../common/dashboard/date-range.js";
import { createPublicId } from "../../common/utils/id-generator.js";
import { deleteImageFromCloudinary, uploadImageToCloudinary } from "../../config/cloudinary.js";
import { db } from "../../config/database.js";
import { auditLogs, bills, customers, customerTableAssignments, employees, menuCategories, menuItems, notifications, orderItems, orders, payments, restaurants, restaurantTables } from "../../db/schema/index.js";
import type { z } from "zod";
import type { addOrderItemsSchema, assignTableSchema, createCategorySchema, createMenuItemSchema, createOrderSchema, createTableSchema, listOrdersSchema, orderStatusSchema, paymentSchema, updateMenuItemSchema, updateTableSchema } from "./staff-pos.validation.js";

type Tenant = { organizationId: string; restaurantId: string; userId: string; role: "RESTAURANT_ADMIN" | "RECEPTION" | "WAITER" | "KITCHEN" };
type DashboardRangeQuery = z.infer<typeof dashboardDateRangeQuerySchema>;
type CreateCategory = z.infer<typeof createCategorySchema>;
type CreateMenuItem = z.infer<typeof createMenuItemSchema>;
type UpdateMenuItem = z.infer<typeof updateMenuItemSchema>;
type CreateOrder = z.infer<typeof createOrderSchema>;
type AssignTable = z.infer<typeof assignTableSchema>;
type CreateTable = z.infer<typeof createTableSchema>;
type UpdateTable = z.infer<typeof updateTableSchema>;
type AddOrderItems = z.infer<typeof addOrderItemsSchema>;
type OrderStatus = z.infer<typeof orderStatusSchema>["status"];
type ListOrders = z.infer<typeof listOrdersSchema>;
type ListOrdersWithRange = ListOrders & { dateRange?: DashboardDateRange };
type PaymentInput = z.infer<typeof paymentSchema>;

const orderTransitions: Record<string, OrderStatus[]> = {
  DRAFT: ["PLACED", "CANCELLED"],
  PLACED: ["CONFIRMED", "PREPARING", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "COMPLETED"],
  SERVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function money(value: unknown) {
  return Number(value ?? 0);
}

function page(query: { page?: number; limit?: number }) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  return { page, limit, offset: (page - 1) * limit };
}

export class StaffPosRepository {
  async roleDashboard(tenant: Tenant, query: DashboardRangeQuery) {
    const [restaurant] = await db.select({ timezone: restaurants.timezone }).from(restaurants).where(and(eq(restaurants.organizationId, tenant.organizationId), eq(restaurants.id, tenant.restaurantId))).limit(1);
    const dateRange = buildDashboardDateRange(query, restaurant?.timezone ?? "Asia/Kolkata");
    const base = and(
      eq(orders.organizationId, tenant.organizationId),
      eq(orders.restaurantId, tenant.restaurantId),
      gte(orders.createdAt, dateRange.startDate),
      lt(orders.createdAt, dateRange.endExclusive),
      tenant.role === "WAITER" ? eq(orders.waiterId, tenant.userId) : undefined,
    );
    const [orderStats] = await db.select({
      todayOrders: count(),
      pendingOrders: sql<number>`count(*) filter (where ${orders.status} in ('PLACED','CONFIRMED','PREPARING'))`,
      completedOrders: sql<number>`count(*) filter (where ${orders.status} = 'COMPLETED')`,
      readyOrders: sql<number>`count(*) filter (where ${orders.status} = 'READY')`,
    }).from(orders).where(base);
    const [billStats] = await db.select({
      todayBills: count(),
      todaySales: sql<string>`coalesce(sum(${bills.grandTotal}), 0)`,
      paidBills: sql<number>`count(*) filter (where ${bills.paymentStatus} = 'SUCCESS')`,
      pendingBills: sql<number>`count(*) filter (where ${bills.paymentStatus} in ('PENDING','PARTIALLY_PAID'))`,
    }).from(bills).where(and(
      eq(bills.organizationId, tenant.organizationId),
      eq(bills.restaurantId, tenant.restaurantId),
      gte(bills.createdAt, dateRange.startDate),
      lt(bills.createdAt, dateRange.endExclusive),
    ));
    const [staff] = await db.select({ active: count() }).from(employees).where(and(eq(employees.restaurantId, tenant.restaurantId), eq(employees.status, "ACTIVE")));
    const [menu] = await db.select({ total: count() }).from(menuItems).where(and(eq(menuItems.restaurantId, tenant.restaurantId), eq(menuItems.isActive, true)));
    const [tables] = await db.select({
      active: count(),
      available: sql<number>`count(*) filter (where ${restaurantTables.status} = 'AVAILABLE')`,
      occupied: sql<number>`count(*) filter (where ${restaurantTables.status} = 'OCCUPIED')`,
    }).from(restaurantTables).where(eq(restaurantTables.restaurantId, tenant.restaurantId));
    const recentOrders = await this.listOrders(tenant, { page: 1, limit: 5, dateRange });
    const recentBills = await this.listBills(tenant, { page: 1, limit: 5, dateRange });
    return {
      orders: orderStats,
      bills: { ...billStats, todaySales: money(billStats?.todaySales) },
      staff,
      menu,
      tables,
      recentOrders: recentOrders.rows,
      recentBills: recentBills.rows,
      dateRange: serializeDashboardDateRange(dateRange),
    };
  }

  async categories(tenant: Tenant) {
    return db.select().from(menuCategories).where(and(eq(menuCategories.organizationId, tenant.organizationId), eq(menuCategories.restaurantId, tenant.restaurantId))).orderBy(desc(menuCategories.createdAt));
  }

  async createCategory(tenant: Tenant, input: CreateCategory) {
    const [row] = await db.insert(menuCategories).values({ organizationId: tenant.organizationId, restaurantId: tenant.restaurantId, name: input.name, description: input.description, isActive: input.isActive ?? true }).returning();
    await this.audit(tenant, "MENU_CATEGORY_CREATED", "MENU", "menu_category", row.id, row.name);
    return row;
  }

  async menu(tenant: Tenant) {
    return db.select({ item: menuItems, category: menuCategories }).from(menuItems).innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id)).where(and(eq(menuItems.organizationId, tenant.organizationId), eq(menuItems.restaurantId, tenant.restaurantId))).orderBy(desc(menuItems.createdAt));
  }

  async tables(tenant: Tenant) {
    const tableRows = await db
      .select({
        id: restaurantTables.id,
        tableNumber: restaurantTables.tableNumber,
        capacity: restaurantTables.capacity,
        status: restaurantTables.status,
        createdAt: restaurantTables.createdAt,
        updatedAt: restaurantTables.updatedAt,
        activeOrderId: orders.id,
        activeOrderNumber: orders.orderNumber,
        activeOrderStatus: orders.status,
        activeOrderTotal: orders.grandTotal,
        activeBillNumber: bills.billNumber,
        activePaymentStatus: bills.paymentStatus,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
      })
      .from(restaurantTables)
      .leftJoin(orders, and(eq(orders.tableId, restaurantTables.id), inArray(orders.status, ["DRAFT", "PLACED", "CONFIRMED", "PREPARING", "READY", "SERVED"])))
      .leftJoin(bills, eq(bills.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(restaurantTables.organizationId, tenant.organizationId), eq(restaurantTables.restaurantId, tenant.restaurantId)))
      .orderBy(restaurantTables.tableNumber);

    const activeAssignments = await db
      .select({
        tableId: customerTableAssignments.tableId,
        customerId: customerTableAssignments.customerId,
        orderId: customerTableAssignments.orderId,
        assignedTableNumber: restaurantTables.tableNumber,
        customerName: customers.name,
        customerPhone: customers.phone,
        orderIdRef: orders.id,
        orderNumber: orders.orderNumber,
        orderStatus: orders.status,
        orderGrandTotal: orders.grandTotal,
        billNumber: bills.billNumber,
        paymentStatus: bills.paymentStatus,
      })
      .from(customerTableAssignments)
      .innerJoin(restaurantTables, eq(customerTableAssignments.tableId, restaurantTables.id))
      .innerJoin(customers, eq(customerTableAssignments.customerId, customers.id))
      .leftJoin(orders, eq(customerTableAssignments.orderId, orders.id))
      .leftJoin(bills, eq(bills.orderId, orders.id))
      .where(and(
        eq(customerTableAssignments.organizationId, tenant.organizationId),
        eq(customerTableAssignments.restaurantId, tenant.restaurantId),
        eq(customerTableAssignments.status, "ACTIVE")
      ));

    const customerGroupTablesMap = new Map<string, string[]>();
    for (const a of activeAssignments) {
      const key = a.orderId ?? a.customerId;
      if (!customerGroupTablesMap.has(key)) {
        customerGroupTablesMap.set(key, []);
      }
      customerGroupTablesMap.get(key)!.push(a.assignedTableNumber);
    }

    const tableAssignmentMap = new Map<string, typeof activeAssignments[0]>();
    for (const a of activeAssignments) {
      tableAssignmentMap.set(a.tableId, a);
    }

    return tableRows.map((t) => {
      const assignment = tableAssignmentMap.get(t.id);
      const activeCustId = t.customerId ?? assignment?.customerId;
      const activeOrdId = t.activeOrderId ?? assignment?.orderId;
      const groupKey = activeOrdId ?? activeCustId;
      const groupTables = groupKey ? (customerGroupTablesMap.get(groupKey) ?? [t.tableNumber]) : [t.tableNumber];
      const uniqueGroupTables = Array.from(new Set(groupTables)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      return {
        ...t,
        activeOrderId: t.activeOrderId ?? assignment?.orderIdRef ?? null,
        activeOrderNumber: t.activeOrderNumber ?? assignment?.orderNumber ?? null,
        activeOrderStatus: t.activeOrderStatus ?? assignment?.orderStatus ?? null,
        activeOrderTotal: t.activeOrderTotal ?? assignment?.orderGrandTotal ?? null,
        activeBillNumber: t.activeBillNumber ?? assignment?.billNumber ?? null,
        activePaymentStatus: t.activePaymentStatus ?? assignment?.paymentStatus ?? null,
        customerId: activeCustId ?? null,
        customerName: t.customerName ?? assignment?.customerName ?? null,
        customerPhone: t.customerPhone ?? assignment?.customerPhone ?? null,
        groupTables: uniqueGroupTables,
      };
    });
  }

  async createTable(tenant: Tenant, input: CreateTable) {
    await this.assertTableNumberAvailable(tenant, input.tableNumber);
    const [row] = await db.insert(restaurantTables).values({
      organizationId: tenant.organizationId,
      restaurantId: tenant.restaurantId,
      tableNumber: input.tableNumber,
      capacity: input.capacity,
      status: "AVAILABLE",
    }).returning();
    await this.audit(tenant, "TABLE_CREATED", "TABLE", "table", row.id, row.tableNumber);
    return row;
  }

  async tableDetail(tenant: Tenant, tableId: string) {
    const [table] = await db.select().from(restaurantTables).where(and(eq(restaurantTables.id, tableId), eq(restaurantTables.organizationId, tenant.organizationId), eq(restaurantTables.restaurantId, tenant.restaurantId))).limit(1);
    if (!table) throw new AppError("Table not found", 404, "TABLE_NOT_FOUND");
    const [order] = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      subtotal: orders.subtotal,
      taxTotal: orders.taxTotal,
      grandTotal: orders.grandTotal,
      createdAt: orders.createdAt,
      customer: customers.name,
      customerPhone: customers.phone,
      billNumber: bills.billNumber,
      paymentStatus: bills.paymentStatus,
    }).from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(bills, eq(bills.orderId, orders.id))
      .where(and(eq(orders.tableId, table.id), eq(orders.restaurantId, tenant.restaurantId), inArray(orders.status, ["DRAFT", "PLACED", "CONFIRMED", "PREPARING", "READY", "SERVED"])))
      .orderBy(desc(orders.createdAt))
      .limit(1);
    const items = order ? await db.select({
      id: orderItems.id,
      itemName: orderItems.itemNameSnapshot,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPriceSnapshot,
      lineTotal: orderItems.lineTotal,
      notes: orderItems.notes,
    }).from(orderItems).where(and(eq(orderItems.orderId, order.id), eq(orderItems.restaurantId, tenant.restaurantId))) : [];
    return {
      ...table,
      activeOrder: order ? {
        ...order,
        subtotal: money(order.subtotal),
        taxTotal: money(order.taxTotal),
        grandTotal: money(order.grandTotal),
        items: items.map((item) => ({ ...item, unitPrice: money(item.unitPrice), lineTotal: money(item.lineTotal) })),
      } : null,
    };
  }

  async updateTable(tenant: Tenant, tableId: string, input: UpdateTable) {
    const [table] = await db.select().from(restaurantTables).where(and(eq(restaurantTables.id, tableId), eq(restaurantTables.organizationId, tenant.organizationId), eq(restaurantTables.restaurantId, tenant.restaurantId))).limit(1);
    if (!table) throw new AppError("Table not found", 404, "TABLE_NOT_FOUND");
    const hasActive = await this.tableHasActiveOrder(tenant, tableId);
    if (hasActive && (input.tableNumber || input.capacity)) throw new AppError("Cannot modify this table while it has an active order", 409, "TABLE_HAS_ACTIVE_ORDER");
    if (input.tableNumber && input.tableNumber !== table.tableNumber) await this.assertTableNumberAvailable(tenant, input.tableNumber, tableId);
    const [row] = await db.update(restaurantTables).set({
      tableNumber: input.tableNumber,
      capacity: input.capacity,
      updatedAt: new Date(),
    }).where(eq(restaurantTables.id, table.id)).returning();
    await this.audit(tenant, "TABLE_UPDATED", "TABLE", "table", row.id, row.tableNumber);
    return row;
  }

  async deleteTable(tenant: Tenant, tableId: string) {
    const [table] = await db.select().from(restaurantTables).where(and(eq(restaurantTables.id, tableId), eq(restaurantTables.organizationId, tenant.organizationId), eq(restaurantTables.restaurantId, tenant.restaurantId))).limit(1);
    if (!table) throw new AppError("Table not found", 404, "TABLE_NOT_FOUND");
    const [anyOrder] = await db.select({ id: orders.id, status: orders.status }).from(orders).where(and(eq(orders.tableId, table.id), eq(orders.restaurantId, tenant.restaurantId))).limit(1);
    if (anyOrder) throw new AppError("This table cannot be deleted because it has order history or an active order", 409, "TABLE_HAS_ORDERS");
    const [row] = await db.delete(restaurantTables).where(eq(restaurantTables.id, table.id)).returning();
    await this.audit(tenant, "TABLE_DELETED", "TABLE", "table", row.id, row.tableNumber);
    return row;
  }

  async assignTable(tenant: Tenant, tableIdOrNull: string | null, input: AssignTable) {
    const rawIds = input.tableIds && input.tableIds.length > 0 ? input.tableIds : tableIdOrNull ? [tableIdOrNull] : input.tableId ? [input.tableId] : [];
    const targetTableIds = Array.from(new Set(rawIds));
    if (!targetTableIds.length) {
      throw new AppError("At least one table must be selected", 400, "NO_TABLE_SELECTED");
    }

    return db.transaction(async (tx) => {
      const selectedTables = await tx
        .select()
        .from(restaurantTables)
        .where(and(inArray(restaurantTables.id, targetTableIds), eq(restaurantTables.organizationId, tenant.organizationId), eq(restaurantTables.restaurantId, tenant.restaurantId)));

      if (selectedTables.length !== targetTableIds.length) {
        throw new AppError("One or more selected tables were not found", 404, "TABLE_NOT_FOUND");
      }

      const unavailableTables = selectedTables.filter((t) => t.status !== "AVAILABLE");
      if (unavailableTables.length > 0) {
        const unavailableNumbers = unavailableTables.map((t) => `Table ${t.tableNumber}`).join(", ");
        throw new AppError(`This table is no longer available (${unavailableNumbers}). Please select another table.`, 409, "TABLE_NOT_AVAILABLE");
      }

      const [existingCustomer] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.organizationId, tenant.organizationId), eq(customers.restaurantId, tenant.restaurantId), eq(customers.phone, input.customerPhone)))
        .limit(1);

      const customer = existingCustomer ?? (await tx.insert(customers).values({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        customerCode: createPublicId("CUST"),
        name: input.customerName,
        phone: input.customerPhone,
        email: input.customerEmail,
      }).returning())[0];

      const updatedTables = await tx
        .update(restaurantTables)
        .set({ status: "OCCUPIED", updatedAt: new Date() })
        .where(and(inArray(restaurantTables.id, targetTableIds), eq(restaurantTables.status, "AVAILABLE")))
        .returning();

      if (updatedTables.length !== targetTableIds.length) {
        throw new AppError("This table has already been reserved by another customer. Please select available tables.", 409, "TABLE_NOT_AVAILABLE");
      }

      const [employee] = tenant.role === "WAITER" ? await tx.select({ id: employees.id }).from(employees).where(eq(employees.id, tenant.userId)).limit(1) : [undefined];
      const primaryTable = updatedTables[0];

      const [order] = await tx.insert(orders).values({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        orderNumber: createPublicId("ORD"),
        customerId: customer.id,
        tableId: primaryTable.id,
        waiterId: employee?.id,
        status: "DRAFT",
        subtotal: "0.00",
        discountTotal: "0.00",
        taxTotal: "0.00",
        grandTotal: "0.00",
      }).returning();

      for (const tbl of updatedTables) {
        await tx.insert(customerTableAssignments).values({
          organizationId: tenant.organizationId,
          restaurantId: tenant.restaurantId,
          customerId: customer.id,
          tableId: tbl.id,
          orderId: order.id,
          status: "ACTIVE",
          assignedAt: new Date(),
        });
        await tx.insert(auditLogs).values(this.auditValues(tenant, "TABLE_ASSIGNED", "TABLE", "table", tbl.id, tbl.tableNumber));
      }

      await tx.insert(auditLogs).values(this.auditValues(tenant, "ORDER_SESSION_CREATED", "ORDER", "order", order.id, order.orderNumber));
      return { table: primaryTable, tables: updatedTables, customer, order };
    });
  }

  async createMenuItem(tenant: Tenant, input: CreateMenuItem) {
    await this.assertCategory(tenant, input.categoryId);
    const [row] = await db.insert(menuItems).values({
      organizationId: tenant.organizationId,
      restaurantId: tenant.restaurantId,
      categoryId: input.categoryId,
      itemCode: createPublicId("ITEM"),
      name: input.name,
      description: input.description,
      price: input.price.toFixed(2),
      taxRate: (input.taxRate ?? 0).toFixed(2),
      imageUrl: input.imageUrl,
      imagePublicId: input.imagePublicId,
      isAvailable: input.isAvailable ?? true,
      isActive: input.isActive ?? true,
    }).returning();
    await this.audit(tenant, "MENU_ITEM_CREATED", "MENU", "menu_item", row.id, row.name);
    return row;
  }

  async updateMenuItem(tenant: Tenant, id: string, input: UpdateMenuItem) {
    if (input.categoryId) await this.assertCategory(tenant, input.categoryId);
    const [existing] = await db.select({ imagePublicId: menuItems.imagePublicId }).from(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.organizationId, tenant.organizationId), eq(menuItems.restaurantId, tenant.restaurantId))).limit(1);

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (input.categoryId !== undefined) updateValues.categoryId = input.categoryId;
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.description !== undefined) updateValues.description = input.description;
    if (input.price !== undefined) updateValues.price = input.price.toFixed(2);
    if (input.taxRate !== undefined) updateValues.taxRate = input.taxRate.toFixed(2);
    if (input.imageUrl !== undefined) updateValues.imageUrl = input.imageUrl;
    if (input.imagePublicId !== undefined) updateValues.imagePublicId = input.imagePublicId;
    if (input.isAvailable !== undefined) updateValues.isAvailable = input.isAvailable;
    if (input.isActive !== undefined) updateValues.isActive = input.isActive;

    const [row] = await db.update(menuItems)
      .set(updateValues)
      .where(and(eq(menuItems.id, id), eq(menuItems.organizationId, tenant.organizationId), eq(menuItems.restaurantId, tenant.restaurantId)))
      .returning();
    if (!row) throw new AppError("Menu item not found", 404, "MENU_ITEM_NOT_FOUND");
    if (input.imagePublicId !== undefined && existing?.imagePublicId && existing.imagePublicId !== input.imagePublicId) {
      await this.deleteCloudinaryImage(existing.imagePublicId);
    }
    await this.audit(tenant, "MENU_ITEM_UPDATED", "MENU", "menu_item", row.id, row.name);
    return row;
  }

  async deleteMenuItem(tenant: Tenant, id: string) {
    const [row] = await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.organizationId, tenant.organizationId), eq(menuItems.restaurantId, tenant.restaurantId))).returning();
    if (!row) throw new AppError("Menu item not found", 404, "MENU_ITEM_NOT_FOUND");
    if (row.imagePublicId) {
      await this.deleteCloudinaryImage(row.imagePublicId);
    }
    await this.audit(tenant, "MENU_ITEM_DELETED", "MENU", "menu_item", row.id, row.name);
    return row;
  }

  async createOrder(tenant: Tenant, input: CreateOrder) {
    return db.transaction(async (tx) => {
      if (input.tableId) await this.assertTableBelongsToTenant(tx, tenant, input.tableId, true);
      if (input.customerId) await this.assertCustomerBelongsToTenant(tx, tenant, input.customerId);
      const lines = await this.prepareOrderLines(tx, tenant, input.items);
      const subtotal = lines.reduce((sum, line) => sum + line.unit * line.item.quantity, 0);
      const taxTotal = lines.reduce((sum, line) => sum + line.tax, 0);
      const [employee] = tenant.role === "WAITER" ? await tx.select({ id: employees.id }).from(employees).where(eq(employees.id, tenant.userId)).limit(1) : [undefined];
      const [draft] = input.tableId && input.customerId ? await tx.select().from(orders).where(and(eq(orders.organizationId, tenant.organizationId), eq(orders.restaurantId, tenant.restaurantId), eq(orders.tableId, input.tableId), eq(orders.customerId, input.customerId), eq(orders.status, "DRAFT"))).orderBy(desc(orders.createdAt)).limit(1) : [undefined];
      const [order] = draft ? await tx.update(orders).set({
        waiterId: employee?.id ?? draft.waiterId,
        status: "PLACED",
        subtotal: subtotal.toFixed(2),
        discountTotal: "0.00",
        taxTotal: taxTotal.toFixed(2),
        grandTotal: (subtotal + taxTotal).toFixed(2),
        notes: input.notes,
        updatedAt: new Date(),
      }).where(eq(orders.id, draft.id)).returning() : await tx.insert(orders).values({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        orderNumber: createPublicId("ORD"),
        customerId: input.customerId,
        tableId: input.tableId,
        waiterId: employee?.id,
        status: "PLACED",
        subtotal: subtotal.toFixed(2),
        discountTotal: "0.00",
        taxTotal: taxTotal.toFixed(2),
        grandTotal: (subtotal + taxTotal).toFixed(2),
        notes: input.notes,
      }).returning();
      for (const line of lines) {
        const [existingItem] = await tx
          .select()
          .from(orderItems)
          .where(and(eq(orderItems.orderId, order.id), eq(orderItems.menuItemId, line.menuItem.id), eq(orderItems.restaurantId, tenant.restaurantId)))
          .limit(1);
        if (existingItem) {
          const quantity = existingItem.quantity + line.item.quantity;
          const taxAmount = money(existingItem.taxAmount) + line.tax;
          const lineTotal = money(existingItem.lineTotal) + line.lineTotal;
          await tx.update(orderItems).set({
            quantity,
            taxAmount: taxAmount.toFixed(2),
            lineTotal: lineTotal.toFixed(2),
            notes: line.item.notes ?? existingItem.notes,
          }).where(eq(orderItems.id, existingItem.id));
        } else {
          await tx.insert(orderItems).values({
            organizationId: tenant.organizationId,
            restaurantId: tenant.restaurantId,
            orderId: order.id,
            menuItemId: line.menuItem.id,
            itemNameSnapshot: line.menuItem.name,
            unitPriceSnapshot: line.unit.toFixed(2),
            quantity: line.item.quantity,
            discountAmount: "0.00",
            taxAmount: line.tax.toFixed(2),
            lineTotal: line.lineTotal.toFixed(2),
            notes: line.item.notes,
          });
        }
      }
      if (input.tableId) await tx.update(restaurantTables).set({ status: "OCCUPIED", updatedAt: new Date() }).where(eq(restaurantTables.id, input.tableId));
      await tx.insert(auditLogs).values(this.auditValues(tenant, "ORDER_CREATED", "ORDER", "order", order.id, order.orderNumber));
      await this.notifyKitchenOrder(tx, tenant, order.id, "KITCHEN_NEW_ORDER", "New Order Received", "created");
      return order;
    });
  }

  async addOrderItems(tenant: Tenant, orderId: string, input: AddOrderItems) {
    return db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.organizationId, tenant.organizationId), eq(orders.restaurantId, tenant.restaurantId)))
        .limit(1);
      if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
      if (["COMPLETED", "CANCELLED"].includes(order.status)) throw new AppError("Cannot add items to a closed order", 409, "ORDER_CLOSED");

      const lines = await this.prepareOrderLines(tx, tenant, input.items);
      const addSubtotal = lines.reduce((sum, line) => sum + line.unit * line.item.quantity, 0);
      const addTaxTotal = lines.reduce((sum, line) => sum + line.tax, 0);

      for (const line of lines) {
        const [existingItem] = await tx
          .select()
          .from(orderItems)
          .where(and(eq(orderItems.orderId, order.id), eq(orderItems.menuItemId, line.menuItem.id), eq(orderItems.restaurantId, tenant.restaurantId)))
          .limit(1);
        if (existingItem) {
          const quantity = existingItem.quantity + line.item.quantity;
          const taxAmount = money(existingItem.taxAmount) + line.tax;
          const lineTotal = money(existingItem.lineTotal) + line.lineTotal;
          await tx.update(orderItems).set({
            quantity,
            taxAmount: taxAmount.toFixed(2),
            lineTotal: lineTotal.toFixed(2),
            notes: line.item.notes ?? existingItem.notes,
          }).where(eq(orderItems.id, existingItem.id));
        } else {
          await tx.insert(orderItems).values({
            organizationId: tenant.organizationId,
            restaurantId: tenant.restaurantId,
            orderId: order.id,
            menuItemId: line.menuItem.id,
            itemNameSnapshot: line.menuItem.name,
            unitPriceSnapshot: line.unit.toFixed(2),
            quantity: line.item.quantity,
            discountAmount: "0.00",
            taxAmount: line.tax.toFixed(2),
            lineTotal: line.lineTotal.toFixed(2),
            notes: line.item.notes,
          });
        }
      }

      const [updated] = await tx.update(orders).set({
        status: "PLACED",
        subtotal: (money(order.subtotal) + addSubtotal).toFixed(2),
        taxTotal: (money(order.taxTotal) + addTaxTotal).toFixed(2),
        grandTotal: (money(order.grandTotal) + addSubtotal + addTaxTotal).toFixed(2),
        updatedAt: new Date(),
      }).where(eq(orders.id, order.id)).returning();

      await tx.insert(auditLogs).values(this.auditValues(tenant, "ORDER_ITEMS_ADDED", "ORDER", "order", order.id, order.orderNumber));
      await this.notifyKitchenOrder(tx, tenant, order.id, "KITCHEN_ORDER_ITEMS_ADDED", "Additional Items Sent to Kitchen", `items:${Date.now()}`);
      return updated;
    });
  }

  async listOrders(tenant: Tenant, query: ListOrdersWithRange) {
    const p = page(query);
    const where = and(
      eq(orders.organizationId, tenant.organizationId),
      eq(orders.restaurantId, tenant.restaurantId),
      query.status ? eq(orders.status, query.status) : undefined,
      tenant.role === "WAITER" ? eq(orders.waiterId, tenant.userId) : undefined,
      query.dateRange ? gte(orders.createdAt, query.dateRange.startDate) : undefined,
      query.dateRange ? lt(orders.createdAt, query.dateRange.endExclusive) : undefined,
    );
    const rows = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      grandTotal: orders.grandTotal,
      createdAt: orders.createdAt,
      tableId: orders.tableId,
      table: restaurantTables.tableNumber,
      customerId: orders.customerId,
      customer: customers.name,
      customerPhone: customers.phone,
      waiter: employees.fullName,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
    }).from(orders)
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(employees, eq(orders.waiterId, employees.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(where)
      .groupBy(orders.id, restaurantTables.tableNumber, customers.name, customers.phone, employees.fullName)
      .orderBy(desc(orders.createdAt)).limit(p.limit).offset(p.offset);
    const [total] = await db.select({ value: count() }).from(orders).where(where);
    return { rows: rows.map((row) => ({ ...row, grandTotal: money(row.grandTotal) })), total: total.value, page: p.page, limit: p.limit };
  }

  async listKitchenOrders(tenant: Tenant, query: ListOrders) {
    const p = page(query);
    const kitchenStatuses: OrderStatus[] = ["PLACED", "PREPARING", "READY"];
    const where = and(
      eq(orders.organizationId, tenant.organizationId),
      eq(orders.restaurantId, tenant.restaurantId),
      query.status ? eq(orders.status, query.status) : inArray(orders.status, kitchenStatuses),
    );
    const rows = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      grandTotal: orders.grandTotal,
      createdAt: orders.createdAt,
      tableId: orders.tableId,
      table: restaurantTables.tableNumber,
      customerId: orders.customerId,
      customer: customers.name,
      customerPhone: customers.phone,
      waiter: employees.fullName,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
    }).from(orders)
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(employees, eq(orders.waiterId, employees.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(where)
      .groupBy(orders.id, restaurantTables.tableNumber, customers.name, customers.phone, employees.fullName)
      .orderBy(desc(orders.createdAt)).limit(p.limit).offset(p.offset);
    const [total] = await db.select({ value: count() }).from(orders).where(where);
    return { rows: rows.map((row) => ({ ...row, grandTotal: money(row.grandTotal) })), total: total.value, page: p.page, limit: p.limit };
  }

  async orderDetail(tenant: Tenant, orderId: string) {
    const [order] = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      subtotal: orders.subtotal,
      discountTotal: orders.discountTotal,
      taxTotal: orders.taxTotal,
      grandTotal: orders.grandTotal,
      createdAt: orders.createdAt,
      tableId: orders.tableId,
      table: restaurantTables.tableNumber,
      customerId: orders.customerId,
      customer: customers.name,
      customerPhone: customers.phone,
      waiter: employees.fullName,
      billNumber: bills.billNumber,
      paymentStatus: bills.paymentStatus,
    }).from(orders)
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(employees, eq(orders.waiterId, employees.id))
      .leftJoin(bills, eq(bills.orderId, orders.id))
      .where(and(eq(orders.id, orderId), eq(orders.organizationId, tenant.organizationId), eq(orders.restaurantId, tenant.restaurantId)))
      .limit(1);
    if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");

    const items = await db.select({
      id: orderItems.id,
      itemName: orderItems.itemNameSnapshot,
      unitPrice: orderItems.unitPriceSnapshot,
      quantity: orderItems.quantity,
      taxAmount: orderItems.taxAmount,
      lineTotal: orderItems.lineTotal,
      notes: orderItems.notes,
      imageUrl: menuItems.imageUrl,
    }).from(orderItems).leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id)).where(and(eq(orderItems.orderId, orderId), eq(orderItems.restaurantId, tenant.restaurantId)));

    return {
      ...order,
      subtotal: money(order.subtotal),
      discountTotal: money(order.discountTotal),
      taxTotal: money(order.taxTotal),
      grandTotal: money(order.grandTotal),
      items: items.map((item) => ({ ...item, unitPrice: money(item.unitPrice), taxAmount: money(item.taxAmount), lineTotal: money(item.lineTotal) })),
    };
  }

  async updateOrderStatus(tenant: Tenant, orderId: string, status: OrderStatus) {
    const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.organizationId, tenant.organizationId), eq(orders.restaurantId, tenant.restaurantId))).limit(1);
    if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    if (!orderTransitions[order.status]?.includes(status)) throw new AppError(`Cannot change order from ${order.status} to ${status}`, 422, "ORDER_STATUS_INVALID");
    const [updated] = await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, order.id)).returning();
    await this.audit(tenant, `ORDER_${status}`, "ORDER", "order", order.id, order.orderNumber);
    if (status === "READY") {
      const context = await this.orderNotificationContext(db, tenant, order.id);
      const tableLabel = context?.tableNumber ? `Table ${context.tableNumber}` : "the table";
      if (order.waiterId) {
        await db.insert(notifications).values({
          scope: "USER",
          organizationId: tenant.organizationId,
          restaurantId: tenant.restaurantId,
          recipientEmployeeId: order.waiterId,
          type: "ORDER_READY",
          title: "Order Ready",
          message: `Order ${order.orderNumber} for ${tableLabel} is ready to serve.`,
          entityType: "order",
          entityId: order.id,
          dedupeKey: `order:${order.id}:ready`,
        }).onConflictDoNothing();
      }
      await db.insert(notifications).values({
        scope: "RESTAURANT",
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        recipientRole: "RECEPTION",
        type: "ORDER_READY_RECEPTION",
        title: "Order Ready for Service",
        message: `Order ${order.orderNumber} for ${tableLabel} is marked READY by kitchen.`,
        entityType: "order",
        entityId: order.id,
        dedupeKey: `order:${order.id}:ready:reception`,
      }).onConflictDoNothing();
    }
    return updated;
  }

  async sendToBilling(tenant: Tenant, orderId: string) {
    const bill = await this.generateBill(tenant, orderId);
    const context = await this.orderNotificationContext(db, tenant, orderId);
    const tableLabel = context?.tableNumber ? `Table T-${context.tableNumber}` : "Order";
    await db.insert(notifications).values({
      scope: "RESTAURANT",
      organizationId: tenant.organizationId,
      restaurantId: tenant.restaurantId,
      recipientRole: "RECEPTION",
      type: "BILL_SENT",
      title: "New Bill Waiting",
      message: `New bill received for ${tableLabel}. (${context?.customerName ?? "Customer"}, Amount: ₹${money(bill.grandTotal)})`,
      entityType: "bill",
      entityId: bill.id,
      dedupeKey: `bill:${bill.id}:sent`,
    }).onConflictDoNothing();
    await this.audit(tenant, "ORDER_SENT_TO_BILLING", "BILLING", "order", orderId);
    return bill;
  }

  async listNotifications(tenant: Tenant, query: { page?: number; limit?: number }) {
    const p = page(query);
    const recipientCondition = or(
      eq(notifications.recipientEmployeeId, tenant.userId),
      eq(notifications.recipientRole, tenant.role)
    );
    const where = and(
      eq(notifications.organizationId, tenant.organizationId),
      eq(notifications.restaurantId, tenant.restaurantId),
      recipientCondition,
    );
    const rows = await db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(p.limit).offset(p.offset);
    const [total] = await db.select({ value: count() }).from(notifications).where(where);
    const [unread] = await db.select({ value: count() }).from(notifications).where(and(where, eq(notifications.isRead, false)));
    return { rows, total: total.value, unread: unread.value, page: p.page, limit: p.limit };
  }

  async readNotification(tenant: Tenant, notificationId: string) {
    const recipientCondition = or(
      eq(notifications.recipientEmployeeId, tenant.userId),
      eq(notifications.recipientRole, tenant.role)
    );
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

  async readAllNotifications(tenant: Tenant) {
    const recipientCondition = or(
      eq(notifications.recipientEmployeeId, tenant.userId),
      eq(notifications.recipientRole, tenant.role)
    );
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.organizationId, tenant.organizationId),
        eq(notifications.restaurantId, tenant.restaurantId),
        eq(notifications.isRead, false),
        recipientCondition,
      ));
    return { count: true };
  }

  async listBills(tenant: Tenant, query: { page?: number; limit?: number; paymentStatus?: string; search?: string; dateRange?: DashboardDateRange }) {
    const p = page(query);
    const conditions = [
      eq(bills.organizationId, tenant.organizationId),
      eq(bills.restaurantId, tenant.restaurantId),
    ];
    if (query.paymentStatus) {
      conditions.push(eq(bills.paymentStatus, query.paymentStatus as "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "PARTIALLY_PAID"));
    }
    if (query.dateRange) {
      conditions.push(gte(bills.createdAt, query.dateRange.startDate));
      conditions.push(lt(bills.createdAt, query.dateRange.endExclusive));
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(bills.billNumber, pattern),
          ilike(orders.orderNumber, pattern),
          ilike(customers.name, pattern),
          ilike(customers.phone, pattern),
          ilike(restaurantTables.tableNumber, pattern),
        )!
      );
    }
    const where = and(...conditions);
    const rows = await db.select({
      id: bills.id,
      billNumber: bills.billNumber,
      grandTotal: bills.grandTotal,
      paymentStatus: bills.paymentStatus,
      createdAt: bills.createdAt,
      orderNumber: orders.orderNumber,
      table: restaurantTables.tableNumber,
      customer: customers.name,
      customerPhone: customers.phone,
      waiter: employees.fullName,
    })
      .from(bills)
      .innerJoin(orders, eq(bills.orderId, orders.id))
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(employees, eq(orders.waiterId, employees.id))
      .where(where)
      .orderBy(desc(bills.createdAt))
      .limit(p.limit)
      .offset(p.offset);
    const [total] = await db.select({ value: count() }).from(bills).innerJoin(orders, eq(bills.orderId, orders.id)).leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id)).leftJoin(customers, eq(orders.customerId, customers.id)).where(where);
    return { rows: rows.map((row) => ({ ...row, grandTotal: money(row.grandTotal) })), total: total.value, page: p.page, limit: p.limit };
  }

  async billDetail(tenant: Tenant, billId: string) {
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
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      tableId: restaurantTables.id,
      table: restaurantTables.tableNumber,
      customerId: customers.id,
      customer: customers.name,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      customerAddress: customers.address,
      waiter: employees.fullName,
      restaurantName: restaurants.name,
      restaurantLegalName: restaurants.legalName,
      restaurantAddress: restaurants.address,
      restaurantAddressLine1: restaurants.addressLine1,
      restaurantAddressLine2: restaurants.addressLine2,
      restaurantCity: restaurants.city,
      restaurantState: restaurants.state,
      restaurantCountry: restaurants.country,
      restaurantPostalCode: restaurants.postalCode,
      restaurantPhone: restaurants.phone,
      restaurantTaxNumber: restaurants.taxNumber,
    }).from(bills)
      .innerJoin(orders, eq(bills.orderId, orders.id))
      .innerJoin(restaurants, eq(bills.restaurantId, restaurants.id))
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(employees, eq(orders.waiterId, employees.id))
      .where(and(eq(bills.id, billId), eq(bills.organizationId, tenant.organizationId), eq(bills.restaurantId, tenant.restaurantId)))
      .limit(1);
    if (!bill) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");

    const items = await db.select({
      id: orderItems.id,
      itemName: orderItems.itemNameSnapshot,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPriceSnapshot,
      discountAmount: orderItems.discountAmount,
      taxAmount: orderItems.taxAmount,
      lineTotal: orderItems.lineTotal,
      notes: orderItems.notes,
      taxRate: menuItems.taxRate,
      itemCode: menuItems.itemCode,
    }).from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(eq(orderItems.orderId, bill.orderId), eq(orderItems.organizationId, tenant.organizationId), eq(orderItems.restaurantId, tenant.restaurantId)));
    const billPayments = await db.select().from(payments).where(and(eq(payments.billId, bill.id), eq(payments.restaurantId, tenant.restaurantId))).orderBy(desc(payments.createdAt));
    return {
      ...bill,
      subtotal: money(bill.subtotal),
      discountTotal: money(bill.discountTotal),
      taxTotal: money(bill.taxTotal),
      grandTotal: money(bill.grandTotal),
      paidAmount: money(bill.paidAmount),
      remainingAmount: money(bill.remainingAmount),
      items: items.map((item) => ({ ...item, unitPrice: money(item.unitPrice), discountAmount: money(item.discountAmount), taxAmount: money(item.taxAmount), taxRate: money(item.taxRate), lineTotal: money(item.lineTotal) })),
      payments: billPayments.map((payment) => ({ ...payment, amount: money(payment.amount) })),
    };
  }

  async generateBill(tenant: Tenant, orderId: string) {
    return db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.organizationId, tenant.organizationId), eq(orders.restaurantId, tenant.restaurantId))).limit(1);
      if (!order) throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
      if (["COMPLETED", "CANCELLED"].includes(order.status)) throw new AppError("This order cannot be billed", 409, "ORDER_NOT_BILLABLE");
      const [itemCount] = await tx.select({ value: count() }).from(orderItems).where(and(eq(orderItems.orderId, order.id), eq(orderItems.organizationId, tenant.organizationId), eq(orderItems.restaurantId, tenant.restaurantId)));
      if (!itemCount.value) throw new AppError("Cannot bill an order with no items", 409, "ORDER_HAS_NO_ITEMS");
      const [existing] = await tx.select().from(bills).where(eq(bills.orderId, order.id)).limit(1);
      if (existing) return existing;
      const [bill] = await tx.insert(bills).values({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        billNumber: createPublicId("INV"),
        orderId: order.id,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        taxTotal: order.taxTotal,
        grandTotal: order.grandTotal,
        remainingAmount: order.grandTotal,
        paymentStatus: "PENDING",
      }).returning();
      await tx.insert(auditLogs).values(this.auditValues(tenant, "BILL_GENERATED", "BILLING", "bill", bill.id, bill.billNumber));
      return bill;
    });
  }

  async payBill(tenant: Tenant, billId: string, input: PaymentInput) {
    return db.transaction(async (tx) => {
      const [bill] = await tx.select().from(bills).where(and(eq(bills.id, billId), eq(bills.restaurantId, tenant.restaurantId))).limit(1);
      if (!bill) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
      if (bill.paymentStatus === "SUCCESS") throw new AppError("Payment has already been completed", 409, "BILL_ALREADY_PAID");
      const paid = money(bill.paidAmount) + input.amount;
      const total = money(bill.grandTotal);
      const status = paid >= total ? "SUCCESS" : "PARTIALLY_PAID";
      await tx.insert(payments).values({
        organizationId: tenant.organizationId,
        restaurantId: tenant.restaurantId,
        billId: bill.id,
        amount: input.amount.toFixed(2),
        method: input.method,
        status: "SUCCESS",
        paidAt: new Date(),
        createdByEmployeeId: tenant.role === "RECEPTION" ? tenant.userId : undefined,
      });
      const [updated] = await tx.update(bills).set({ paidAmount: paid.toFixed(2), remainingAmount: Math.max(0, total - paid).toFixed(2), paymentStatus: status }).where(eq(bills.id, bill.id)).returning();
      if (status === "SUCCESS") {
        const [order] = await tx.select({ id: orders.id, tableId: orders.tableId, waiterId: orders.waiterId, customerId: orders.customerId }).from(orders).where(eq(orders.id, bill.orderId)).limit(1);
        await tx.update(orders).set({ status: "COMPLETED", updatedAt: new Date() }).where(eq(orders.id, bill.orderId));

        const activeAssignments = await tx
          .select({ id: customerTableAssignments.id, tableId: customerTableAssignments.tableId })
          .from(customerTableAssignments)
          .where(and(
            eq(customerTableAssignments.organizationId, tenant.organizationId),
            eq(customerTableAssignments.restaurantId, tenant.restaurantId),
            eq(customerTableAssignments.status, "ACTIVE"),
            or(
              eq(customerTableAssignments.orderId, bill.orderId),
              order?.customerId ? eq(customerTableAssignments.customerId, order.customerId) : undefined
            )
          ));

        const tableIdsToRelease = new Set<string>();
        if (order?.tableId) tableIdsToRelease.add(order.tableId);
        for (const a of activeAssignments) {
          tableIdsToRelease.add(a.tableId);
        }

        if (tableIdsToRelease.size > 0) {
          await tx
            .update(restaurantTables)
            .set({ status: "AVAILABLE", updatedAt: new Date() })
            .where(and(
              inArray(restaurantTables.id, Array.from(tableIdsToRelease)),
              eq(restaurantTables.organizationId, tenant.organizationId),
              eq(restaurantTables.restaurantId, tenant.restaurantId)
            ));
        }

        if (activeAssignments.length > 0) {
          await tx
            .update(customerTableAssignments)
            .set({ status: "RELEASED", releasedAt: new Date() })
            .where(inArray(customerTableAssignments.id, activeAssignments.map((a) => a.id)));
        }

        if (order?.waiterId) {
          const context = await this.orderNotificationContext(tx, tenant, order.id);
          const tableLabel = context?.tableNumber ? `Table T-${context.tableNumber}` : "Table";
          await tx.insert(notifications).values({
            scope: "USER",
            organizationId: tenant.organizationId,
            restaurantId: tenant.restaurantId,
            recipientEmployeeId: order.waiterId,
            type: "PAYMENT_COMPLETED",
            title: "Payment Completed",
            message: `Payment of ₹${money(bill.grandTotal)} for ${tableLabel} (${bill.billNumber}) completed. All assigned tables are now available.`,
            entityType: "bill",
            entityId: bill.id,
            dedupeKey: `bill:${bill.id}:paid`,
          }).onConflictDoNothing();
        }
      }
      await tx.insert(auditLogs).values(this.auditValues(tenant, "BILL_PAYMENT_RECORDED", "BILLING", "bill", bill.id, bill.billNumber));
      return updated;
    });
  }

  async uploadMenuImage(tenant: Tenant, file: File, requestId?: string) {
    return uploadImageToCloudinary({
      file,
      folder: `restaurant-pos/menu/${tenant.restaurantId}`,
      restaurantId: tenant.restaurantId,
      requestId,
    });
  }

  private async deleteCloudinaryImage(publicId?: string | null) {
    if (!publicId) return;

    if (publicId.startsWith("local_")) {
      try {
        const parts = publicId.replace(/^local_/, "").split("_");
        const restaurantId = parts[0];
        const filename = parts.slice(1).join("_");
        const filePath = path.join(process.cwd(), "public", "uploads", "menu", restaurantId, filename);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch {
        // Ignore local cleanup error
      }
      return;
    }

    try {
      await deleteImageFromCloudinary(publicId);
    } catch {
      // Ignore cleanup errors to ensure DB operations complete smoothly
    }
  }

  private async assertCategory(tenant: Tenant, categoryId: string) {
    const [category] = await db.select({ id: menuCategories.id }).from(menuCategories).where(and(eq(menuCategories.id, categoryId), eq(menuCategories.organizationId, tenant.organizationId), eq(menuCategories.restaurantId, tenant.restaurantId))).limit(1);
    if (!category) throw new AppError("Menu category not found", 404, "MENU_CATEGORY_NOT_FOUND");
  }

  private async assertTableNumberAvailable(tenant: Tenant, tableNumber: string, ignoreId?: string) {
    const rows = await db.select({ id: restaurantTables.id }).from(restaurantTables).where(and(eq(restaurantTables.organizationId, tenant.organizationId), eq(restaurantTables.restaurantId, tenant.restaurantId), eq(restaurantTables.tableNumber, tableNumber))).limit(2);
    const duplicate = rows.find((row) => row.id !== ignoreId);
    if (duplicate) throw new AppError("Table number already exists in this restaurant", 409, "TABLE_NUMBER_EXISTS");
  }

  private async tableHasActiveOrder(tenant: Tenant, tableId: string) {
    const [row] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.organizationId, tenant.organizationId), eq(orders.restaurantId, tenant.restaurantId), eq(orders.tableId, tableId), inArray(orders.status, ["DRAFT", "PLACED", "CONFIRMED", "PREPARING", "READY", "SERVED"]))).limit(1);
    return Boolean(row);
  }

  private async assertTableBelongsToTenant(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], tenant: Tenant, tableId: string, requireOccupied = false) {
    const [table] = await tx
      .select()
      .from(restaurantTables)
      .where(and(eq(restaurantTables.id, tableId), eq(restaurantTables.organizationId, tenant.organizationId), eq(restaurantTables.restaurantId, tenant.restaurantId)))
      .limit(1);
    if (!table) throw new AppError("Table not found", 404, "TABLE_NOT_FOUND");
    if (requireOccupied && table.status !== "OCCUPIED") throw new AppError("Table must be occupied before creating an order", 409, "TABLE_NOT_OCCUPIED");
  }

  private async assertCustomerBelongsToTenant(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], tenant: Tenant, customerId: string) {
    const [customer] = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, tenant.organizationId), eq(customers.restaurantId, tenant.restaurantId)))
      .limit(1);
    if (!customer) throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }

  private async prepareOrderLines(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], tenant: Tenant, items: AddOrderItems["items"]) {
    const itemIds = items.map((item) => item.menuItemId);
    const rows = await tx.select().from(menuItems).where(and(eq(menuItems.restaurantId, tenant.restaurantId), eq(menuItems.organizationId, tenant.organizationId), inArray(menuItems.id, itemIds)));
    if (rows.length !== itemIds.length) throw new AppError("One or more menu items are invalid", 422, "ORDER_MENU_ITEM_INVALID");
    const byId = new Map(rows.map((row) => [row.id, row]));
    return items.map((item) => {
      const menuItem = byId.get(item.menuItemId)!;
      if (!menuItem.isActive || !menuItem.isAvailable) throw new AppError(`${menuItem.name} is not available`, 409, "MENU_ITEM_UNAVAILABLE");
      const unit = money(menuItem.price);
      const tax = (unit * money(menuItem.taxRate) / 100) * item.quantity;
      const lineTotal = unit * item.quantity + tax;
      return { item, menuItem, unit, tax, lineTotal };
    });
  }

  private async orderNotificationContext(tx: Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db, tenant: Tenant, orderId: string) {
    const [context] = await tx
      .select({
        orderNumber: orders.orderNumber,
        status: orders.status,
        tableNumber: restaurantTables.tableNumber,
        customerName: customers.name,
        waiterName: employees.fullName,
        itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      })
      .from(orders)
      .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(employees, eq(orders.waiterId, employees.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.id, orderId), eq(orders.organizationId, tenant.organizationId), eq(orders.restaurantId, tenant.restaurantId)))
      .groupBy(orders.id, restaurantTables.tableNumber, customers.name, employees.fullName)
      .limit(1);
    return context;
  }

  private async notifyKitchenOrder(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], tenant: Tenant, orderId: string, type: string, title: string, eventKey: string) {
    const context = await this.orderNotificationContext(tx, tenant, orderId);
    if (!context) return;

    const tableLabel = context.tableNumber ? `Table ${context.tableNumber}` : "unassigned table";
    const itemLabel = Number(context.itemCount ?? 0) === 1 ? "1 item" : `${Number(context.itemCount ?? 0)} items`;
    const waiterLabel = context.waiterName ? ` from ${context.waiterName}` : "";
    const message = `Order ${context.orderNumber} received from ${tableLabel}${waiterLabel}. ${itemLabel}.`;

    await tx.insert(notifications).values({
      scope: "RESTAURANT" as const,
      organizationId: tenant.organizationId,
      restaurantId: tenant.restaurantId,
      recipientRole: "KITCHEN",
      type,
      title,
      message,
      entityType: "order",
      entityId: orderId,
      dedupeKey: `order:${orderId}:${eventKey}:kitchen`,
    }).onConflictDoNothing();
  }

  private auditValues(tenant: Tenant, action: string, module: string, entityType: string, entityId: string, entityPublicId?: string) {
    return { organizationId: tenant.organizationId, restaurantId: tenant.restaurantId, actorAdminId: tenant.role === "RESTAURANT_ADMIN" ? tenant.userId : undefined, actorEmployeeId: tenant.role !== "RESTAURANT_ADMIN" ? tenant.userId : undefined, actorRole: tenant.role, module, action, entityType, entityId, entityPublicId };
  }

  private async audit(tenant: Tenant, action: string, module: string, entityType: string, entityId: string, entityPublicId?: string) {
    await db.insert(auditLogs).values(this.auditValues(tenant, action, module, entityType, entityId, entityPublicId));
  }
}
