import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  authSubjectTypeEnum,
  employeeRoleEnum,
  licenseStatusEnum,
  loginActivityStatusEnum,
  notificationScopeEnum,
  orderStatusEnum,
  organizationStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  restaurantStatusEnum,
  subscriptionStatusEnum,
  tableStatusEnum,
  userRoleEnum,
  userStatusEnum,
} from "./enums.js";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 160 }),
    phone: varchar("phone", { length: 32 }),
    status: organizationStatusEnum("status").notNull().default("ACTIVE"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("organizations_status_idx").on(table.status),
    createdAtIdx: index("organizations_created_at_idx").on(table.createdAt),
  }),
);

export const restaurants = pgTable(
  "restaurants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    publicId: varchar("public_id", { length: 32 }).notNull().unique(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    legalName: varchar("legal_name", { length: 200 }),
    ownerName: varchar("owner_name", { length: 160 }),
    phone: varchar("phone", { length: 32 }),
    alternatePhone: varchar("alternate_phone", { length: 32 }),
    email: varchar("email", { length: 160 }),
    address: text("address"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 120 }),
    country: varchar("country", { length: 120 }).default("India"),
    postalCode: varchar("postal_code", { length: 32 }),
    taxNumber: varchar("tax_number", { length: 80 }),
    businessType: varchar("business_type", { length: 40 }),
    cuisineType: varchar("cuisine_type", { length: 80 }),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    logo: text("logo"),
    website: text("website"),
    status: restaurantStatusEnum("status").notNull().default("ACTIVE"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdx: index("restaurants_organization_idx").on(table.organizationId),
    codeIdx: index("restaurants_code_idx").on(table.code),
    emailIdx: index("restaurants_email_idx").on(table.email),
    statusIdx: index("restaurants_status_idx").on(table.status),
    createdAtIdx: index("restaurants_created_at_idx").on(table.createdAt),
  }),
);

export const franchises = pgTable(
  "franchises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 32 }).notNull().unique(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 160 }),
    phone: varchar("phone", { length: 32 }),
    maxSuperAdmins: integer("max_super_admins").notNull().default(10),
    status: organizationStatusEnum("status").notNull().default("ACTIVE"),
    licenseKey: varchar("license_key", { length: 64 }).notNull().unique(),
    licenseStatus: licenseStatusEnum("license_status").notNull().default("ACTIVE"),
    licenseExpiresAt: timestamp("license_expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("franchises_code_idx").on(table.code),
    statusIdx: index("franchises_status_idx").on(table.status),
    licenseStatusIdx: index("franchises_license_status_idx").on(table.licenseStatus),
  }),
);

export const franchiseAdmins = pgTable(
  "franchise_admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 32 }).notNull().unique(),
    franchiseId: uuid("franchise_id").notNull().references(() => franchises.id),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 160 }).notNull().unique(),
    phone: varchar("phone", { length: 32 }),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("FRANCHISE_STEWARD"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    franchiseIdx: index("franchise_admins_franchise_idx").on(table.franchiseId),
    emailIdx: index("franchise_admins_email_idx").on(table.email),
    statusIdx: index("franchise_admins_status_idx").on(table.status),
  }),
);

export const superAdmins = pgTable(
  "super_admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 32 }).notNull().unique(),
    franchiseId: uuid("franchise_id").references(() => franchises.id),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 160 }).notNull().unique(),
    phone: varchar("phone", { length: 32 }),
    passwordHash: text("password_hash").notNull(),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    franchiseIdx: index("super_admins_franchise_idx").on(table.franchiseId),
    emailIdx: index("super_admins_email_idx").on(table.email),
    statusIdx: index("super_admins_status_idx").on(table.status),
  }),
);

export const admins = pgTable(
  "admins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 32 }).notNull().unique(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    email: varchar("email", { length: 160 }).notNull().unique(),
    phone: varchar("phone", { length: 32 }),
    passwordHash: text("password_hash").notNull(),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdx: index("admins_organization_idx").on(table.organizationId),
    restaurantIdx: index("admins_restaurant_idx").on(table.restaurantId),
    emailIdx: index("admins_email_idx").on(table.email),
    statusIdx: index("admins_status_idx").on(table.status),
  }),
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 32 }).notNull().unique(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
    employeeCode: varchar("employee_code", { length: 64 }).notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    email: varchar("email", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    passwordHash: text("password_hash").notNull(),
    role: employeeRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdx: index("employees_organization_idx").on(table.organizationId),
    restaurantIdx: index("employees_restaurant_idx").on(table.restaurantId),
    emailIdx: index("employees_email_idx").on(table.email),
    roleIdx: index("employees_role_idx").on(table.role),
    statusIdx: index("employees_status_idx").on(table.status),
    restaurantEmployeeCodeUnique: uniqueIndex("employees_restaurant_employee_code_unique").on(table.restaurantId, table.employeeCode),
    restaurantEmployeeEmailUnique: uniqueIndex("employees_restaurant_email_unique").on(table.restaurantId, table.email),
  }),
);

export const plans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  planNumber: varchar("plan_number", { length: 32 }).notNull().unique().default(sql`('PLAN-' || lpad(nextval('subscription_plan_number_seq')::text, 6, '0'))`),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  planType: varchar("plan_type", { length: 24 }).notNull().default("PREDEFINED"),
  organizationId: uuid("organization_id").references(() => organizations.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  yearlyPrice: numeric("yearly_price", { precision: 12, scale: 2 }).notNull().default("0"),
  durationMonths: integer("duration_months").notNull().default(1),
  gstPercentage: numeric("gst_percentage", { precision: 5, scale: 2 }).notNull().default("18"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  maxUsers: integer("max_users"),
  waiterLimit: integer("waiter_limit"),
  kitchenLimit: integer("kitchen_limit"),
  receptionistLimit: integer("receptionist_limit"),
  maxTables: integer("max_tables"),
  maxMenuItems: integer("max_menu_items"),
  isActive: boolean("is_active").notNull().default(true),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
    planId: uuid("plan_id").notNull().references(() => plans.id),
    planNameSnapshot: varchar("plan_name_snapshot", { length: 120 }),
    waiterLimitSnapshot: integer("waiter_limit_snapshot"),
    kitchenLimitSnapshot: integer("kitchen_limit_snapshot"),
    receptionistLimitSnapshot: integer("receptionist_limit_snapshot"),
    baseAmountSnapshot: numeric("base_amount_snapshot", { precision: 12, scale: 2 }),
    gstPercentageSnapshot: numeric("gst_percentage_snapshot", { precision: 5, scale: 2 }),
    gstAmountSnapshot: numeric("gst_amount_snapshot", { precision: 12, scale: 2 }),
    finalAmountSnapshot: numeric("final_amount_snapshot", { precision: 12, scale: 2 }),
    durationMonthsSnapshot: integer("duration_months_snapshot"),
    billingCycle: varchar("billing_cycle", { length: 40 }).notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    status: subscriptionStatusEnum("status").notNull().default("PENDING"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    renewalDate: timestamp("renewal_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdx: index("subscriptions_organization_idx").on(table.organizationId),
    restaurantIdx: index("subscriptions_restaurant_idx").on(table.restaurantId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
    endDateIdx: index("subscriptions_end_date_idx").on(table.endDate),
  }),
);

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    licenseKey: varchar("license_key", { length: 64 }).notNull().unique(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
    subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id),
    status: licenseStatusEnum("status").notNull().default("ACTIVE"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdx: index("licenses_organization_idx").on(table.organizationId),
    restaurantIdx: index("licenses_restaurant_idx").on(table.restaurantId),
    statusIdx: index("licenses_status_idx").on(table.status),
    expiresAtIdx: index("licenses_expires_at_idx").on(table.expiresAt),
  }),
);

export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  categoryId: uuid("category_id").notNull().references(() => menuCategories.id),
  itemCode: varchar("item_code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  isAvailable: boolean("is_available").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const restaurantTables = pgTable("restaurant_tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  tableNumber: varchar("table_number", { length: 32 }).notNull(),
  capacity: integer("capacity").notNull(),
  status: tableStatusEnum("status").notNull().default("AVAILABLE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  customerCode: varchar("customer_code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 160 }),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerTableAssignments = pgTable(
  "customer_table_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    tableId: uuid("table_id").notNull().references(() => restaurantTables.id),
    orderId: uuid("order_id").references(() => orders.id),
    status: varchar("status", { length: 24 }).notNull().default("ACTIVE"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (table) => ({
    organizationIdx: index("customer_table_assignments_organization_idx").on(table.organizationId),
    restaurantIdx: index("customer_table_assignments_restaurant_idx").on(table.restaurantId),
    customerIdx: index("customer_table_assignments_customer_idx").on(table.customerId),
    tableIdx: index("customer_table_assignments_table_idx").on(table.tableId),
    orderIdx: index("customer_table_assignments_order_idx").on(table.orderId),
    statusIdx: index("customer_table_assignments_status_idx").on(table.status),
  }),
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
    orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),
    customerId: uuid("customer_id").references(() => customers.id),
    tableId: uuid("table_id").references(() => restaurantTables.id),
    waiterId: uuid("waiter_id").references(() => employees.id),
    status: orderStatusEnum("status").notNull().default("DRAFT"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discountTotal: numeric("discount_total", { precision: 12, scale: 2 }).notNull().default("0"),
    taxTotal: numeric("tax_total", { precision: 12, scale: 2 }).notNull().default("0"),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    restaurantIdx: index("orders_restaurant_idx").on(table.restaurantId),
    statusIdx: index("orders_status_idx").on(table.status),
  }),
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id),
  itemNameSnapshot: varchar("item_name_snapshot", { length: 160 }).notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
}, (table) => ({
  organizationIdx: index("order_items_organization_idx").on(table.organizationId),
  restaurantIdx: index("order_items_restaurant_idx").on(table.restaurantId),
  orderIdx: index("order_items_order_idx").on(table.orderId),
}));

export const inventoryCategories = pgTable("inventory_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index("inventory_categories_tenant_idx").on(table.organizationId, table.restaurantId),
  restaurantNameUnique: uniqueIndex("inventory_categories_restaurant_name_unique").on(table.restaurantId, table.name),
}));

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  categoryId: uuid("category_id").notNull().references(() => inventoryCategories.id),
  name: varchar("name", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 80 }),
  unit: varchar("unit", { length: 24 }).notNull(),
  currentQuantity: numeric("current_quantity", { precision: 14, scale: 4 }).notNull().default("0"),
  minimumQuantity: numeric("minimum_quantity", { precision: 14, scale: 4 }).notNull().default("0"),
  costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 4 }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index("inventory_items_tenant_idx").on(table.organizationId, table.restaurantId),
  categoryIdx: index("inventory_items_category_idx").on(table.categoryId),
  restaurantNameUnique: uniqueIndex("inventory_items_restaurant_name_unique").on(table.restaurantId, table.name),
  restaurantSkuUnique: uniqueIndex("inventory_items_restaurant_sku_unique").on(table.restaurantId, table.sku),
}));

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id),
  movementType: varchar("movement_type", { length: 40 }).notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 24 }).notNull(),
  previousQuantity: numeric("previous_quantity", { precision: 14, scale: 4 }).notNull(),
  newQuantity: numeric("new_quantity", { precision: 14, scale: 4 }).notNull(),
  reason: text("reason"),
  referenceType: varchar("reference_type", { length: 80 }),
  referenceId: uuid("reference_id"),
  orderId: uuid("order_id").references(() => orders.id),
  orderItemId: uuid("order_item_id").references(() => orderItems.id),
  performedByAdminId: uuid("performed_by_admin_id").references(() => admins.id),
  performedByEmployeeId: uuid("performed_by_employee_id").references(() => employees.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index("stock_movements_tenant_idx").on(table.organizationId, table.restaurantId),
  itemIdx: index("stock_movements_item_idx").on(table.inventoryItemId),
  referenceIdx: index("stock_movements_reference_idx").on(table.referenceType, table.referenceId),
  orderItemConsumptionUnique: uniqueIndex("stock_movements_order_item_consumption_unique").on(table.orderItemId, table.inventoryItemId, table.movementType),
}));

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  menuItemId: uuid("menu_item_id").notNull().references(() => menuItems.id),
  servingQuantity: numeric("serving_quantity", { precision: 12, scale: 4 }).notNull().default("1"),
  servingUnit: varchar("serving_unit", { length: 40 }).notNull().default("plate"),
  isActive: boolean("is_active").notNull().default(true),
  createdByAdminId: uuid("created_by_admin_id").references(() => admins.id),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => admins.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index("recipes_tenant_idx").on(table.organizationId, table.restaurantId),
  menuItemIdx: index("recipes_menu_item_idx").on(table.menuItemId),
  activeMenuItemUnique: uniqueIndex("recipes_active_menu_item_unique").on(table.restaurantId, table.menuItemId, table.isActive),
}));

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  recipeId: uuid("recipe_id").notNull().references(() => recipes.id),
  inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 24 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  recipeIdx: index("recipe_ingredients_recipe_idx").on(table.recipeId),
  inventoryItemIdx: index("recipe_ingredients_inventory_item_idx").on(table.inventoryItemId),
  recipeItemUnique: uniqueIndex("recipe_ingredients_recipe_item_unique").on(table.recipeId, table.inventoryItemId),
}));

export const orderItemInventoryConsumptions = pgTable("order_item_inventory_consumptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id),
  recipeId: uuid("recipe_id").references(() => recipes.id),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index("order_item_inventory_consumptions_tenant_idx").on(table.organizationId, table.restaurantId),
  orderItemUnique: uniqueIndex("order_item_inventory_consumptions_order_item_unique").on(table.orderItemId),
}));

export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
  billNumber: varchar("bill_number", { length: 32 }).notNull().unique(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountTotal: numeric("discount_total", { precision: 12, scale: 2 }).notNull(),
  taxTotal: numeric("tax_total", { precision: 12, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  remainingAmount: numeric("remaining_amount", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    billId: uuid("bill_id").references(() => bills.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    transactionReference: varchar("transaction_reference", { length: 160 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdBySuperAdminId: uuid("created_by_super_admin_id").references(() => superAdmins.id),
    createdByAdminId: uuid("created_by_admin_id").references(() => admins.id),
    createdByEmployeeId: uuid("created_by_employee_id").references(() => employees.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    restaurantIdx: index("payments_restaurant_idx").on(table.restaurantId),
    statusIdx: index("payments_status_idx").on(table.status),
    createdAtIdx: index("payments_created_at_idx").on(table.createdAt),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: varchar("request_id", { length: 128 }),
    organizationId: uuid("organization_id").references(() => organizations.id),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id),
    actorSuperAdminId: uuid("actor_super_admin_id").references(() => superAdmins.id),
    actorAdminId: uuid("actor_admin_id").references(() => admins.id),
    actorEmployeeId: uuid("actor_employee_id").references(() => employees.id),
    actorRole: userRoleEnum("actor_role").notNull(),
    module: varchar("module", { length: 120 }).notNull().default("SYSTEM"),
    action: varchar("action", { length: 120 }).notNull(),
    description: text("description"),
    entityType: varchar("entity_type", { length: 120 }).notNull(),
    entityId: uuid("entity_id"),
    entityPublicId: varchar("entity_public_id", { length: 120 }),
    adminId: uuid("admin_id").references(() => admins.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    licenseId: uuid("license_id").references(() => licenses.id),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
    oldValues: jsonb("old_values").$type<Record<string, unknown> | null>(),
    newValues: jsonb("new_values").$type<Record<string, unknown> | null>(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdx: index("audit_logs_organization_idx").on(table.organizationId),
    restaurantIdx: index("audit_logs_restaurant_idx").on(table.restaurantId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    moduleIdx: index("audit_logs_module_idx").on(table.module),
    requestIdIdx: index("audit_logs_request_id_idx").on(table.requestId),
    entityIdIdx: index("audit_logs_entity_id_idx").on(table.entityId),
    adminIdx: index("audit_logs_admin_idx").on(table.adminId),
    subscriptionIdx: index("audit_logs_subscription_idx").on(table.subscriptionId),
    licenseIdx: index("audit_logs_license_idx").on(table.licenseId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

export const loginActivity = pgTable(
  "login_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    superAdminId: uuid("super_admin_id").references(() => superAdmins.id),
    adminId: uuid("admin_id").references(() => admins.id),
    employeeId: uuid("employee_id").references(() => employees.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id),
    status: loginActivityStatusEnum("status").notNull(),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
    device: varchar("device", { length: 160 }),
    browser: varchar("browser", { length: 160 }),
    failureReason: varchar("failure_reason", { length: 200 }),
    loginAt: timestamp("login_at", { withTimezone: true }).notNull().defaultNow(),
    logoutAt: timestamp("logout_at", { withTimezone: true }),
  },
  (table) => ({
    superAdminIdx: index("login_activity_super_admin_idx").on(table.superAdminId),
    adminIdx: index("login_activity_admin_idx").on(table.adminId),
    employeeIdx: index("login_activity_employee_idx").on(table.employeeId),
    statusIdx: index("login_activity_status_idx").on(table.status),
    loginAtIdx: index("login_activity_login_at_idx").on(table.loginAt),
  }),
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: authSubjectTypeEnum("subject_type").notNull().default("SUPER_ADMIN"),
    franchiseAdminId: uuid("franchise_admin_id").references(() => franchiseAdmins.id),
    superAdminId: uuid("super_admin_id").references(() => superAdmins.id),
    adminId: uuid("admin_id").references(() => admins.id),
    employeeId: uuid("employee_id").references(() => employees.id),
    sessionTokenHash: varchar("session_token_hash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ipAddress: varchar("ip_address", { length: 80 }),
    userAgent: text("user_agent"),
  },
  (table) => ({
    franchiseAdminIdx: index("auth_sessions_franchise_admin_idx").on(table.franchiseAdminId),
    superAdminIdx: index("auth_sessions_super_admin_idx").on(table.superAdminId),
    adminIdx: index("auth_sessions_admin_idx").on(table.adminId),
    employeeIdx: index("auth_sessions_employee_idx").on(table.employeeId),
    subjectIdx: index("auth_sessions_subject_idx").on(table.subjectType),
    tokenHashIdx: index("auth_sessions_token_hash_idx").on(table.sessionTokenHash),
    expiresAtIdx: index("auth_sessions_expires_at_idx").on(table.expiresAt),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    superAdminId: uuid("super_admin_id").references(() => superAdmins.id),
    adminId: uuid("admin_id").references(() => admins.id),
    employeeId: uuid("employee_id").references(() => employees.id),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    superAdminIdx: index("password_reset_tokens_super_admin_idx").on(table.superAdminId),
    adminIdx: index("password_reset_tokens_admin_idx").on(table.adminId),
    employeeIdx: index("password_reset_tokens_employee_idx").on(table.employeeId),
    tokenHashIdx: index("password_reset_tokens_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: notificationScopeEnum("scope").notNull().default("USER"),
    organizationId: uuid("organization_id").references(() => organizations.id),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id),
    recipientSuperAdminId: uuid("recipient_super_admin_id").references(() => superAdmins.id),
    recipientAdminId: uuid("recipient_admin_id").references(() => admins.id),
    recipientEmployeeId: uuid("recipient_employee_id").references(() => employees.id),
    recipientRole: varchar("recipient_role", { length: 60 }),
    type: varchar("type", { length: 120 }).notNull().default("SYSTEM"),
    title: varchar("title", { length: 160 }).notNull(),
    message: text("message").notNull(),
    entityType: varchar("entity_type", { length: 120 }),
    entityId: uuid("entity_id"),
    dedupeKey: varchar("dedupe_key", { length: 200 }),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdx: index("notifications_organization_idx").on(table.organizationId),
    restaurantIdx: index("notifications_restaurant_idx").on(table.restaurantId),
    recipientEmployeeIdx: index("notifications_recipient_employee_idx").on(table.recipientEmployeeId),
    recipientAdminIdx: index("notifications_recipient_admin_idx").on(table.recipientAdminId),
    recipientSuperAdminIdx: index("notifications_recipient_super_admin_idx").on(table.recipientSuperAdminId),
    recipientRoleIdx: index("notifications_recipient_role_idx").on(table.recipientRole),
    restaurantRecipientRoleIdx: index("notifications_restaurant_recipient_role_idx").on(table.restaurantId, table.recipientRole),
    readIdx: index("notifications_read_idx").on(table.isRead),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
    typeIdx: index("notifications_type_idx").on(table.type),
    entityIdx: index("notifications_entity_idx").on(table.entityType, table.entityId),
    dedupeUnique: uniqueIndex("notifications_dedupe_key_unique").on(table.dedupeKey),
  }),
);

export const adminInvitations = pgTable(
  "admin_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    superAdminId: uuid("super_admin_id").references(() => superAdmins.id),
    adminId: uuid("admin_id").references(() => admins.id),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBySuperAdminId: uuid("created_by_super_admin_id").references(() => superAdmins.id),
    createdByAdminId: uuid("created_by_admin_id").references(() => admins.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    superAdminIdx: index("admin_invitations_super_admin_idx").on(table.superAdminId),
    adminIdx: index("admin_invitations_admin_idx").on(table.adminId),
    restaurantIdx: index("admin_invitations_restaurant_idx").on(table.restaurantId),
    tokenHashIdx: index("admin_invitations_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("admin_invitations_expires_at_idx").on(table.expiresAt),
  }),
);

export const platformSettings = pgTable(
  "platform_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platformName: varchar("platform_name", { length: 160 }).notNull().default("POS System"),
    supportEmail: varchar("support_email", { length: 160 }),
    supportPhone: varchar("support_phone", { length: 32 }),
    defaultCurrency: varchar("default_currency", { length: 10 }).notNull().default("INR"),
    defaultTimezone: varchar("default_timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
    licenseWarningDays: integer("license_warning_days").notNull().default(7),
    defaultMonthlyPrice: numeric("default_monthly_price", { precision: 12, scale: 2 }).notNull().default("0"),
    defaultYearlyPrice: numeric("default_yearly_price", { precision: 12, scale: 2 }).notNull().default("0"),
    maintenanceMode: boolean("maintenance_mode").notNull().default(false),
    updatedBySuperAdminId: uuid("updated_by_super_admin_id").references(() => superAdmins.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export const platformSettingsRelations = relations(platformSettings, ({ one }) => ({
  updatedBy: one(superAdmins, {
    fields: [platformSettings.updatedBySuperAdminId],
    references: [superAdmins.id],
  }),
}));

export const organizationRelations = relations(organizations, ({ many }) => ({
  restaurants: many(restaurants),
  admins: many(admins),
  employees: many(employees),
  subscriptions: many(subscriptions),
  licenses: many(licenses),
  payments: many(payments),
  orders: many(orders),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
}));

export const restaurantRelations = relations(restaurants, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [restaurants.organizationId],
    references: [organizations.id],
  }),
  admins: many(admins),
  employees: many(employees),
  subscriptions: many(subscriptions),
  licenses: many(licenses),
  payments: many(payments),
  orders: many(orders),
  auditLogs: many(auditLogs),
  adminInvitations: many(adminInvitations),
}));

export const superAdminRelations = relations(superAdmins, ({ many }) => ({
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  authSessions: many(authSessions),
  passwordResetTokens: many(passwordResetTokens),
  adminInvitations: many(adminInvitations, { relationName: "invitedSuperAdmin" }),
}));

export const authSessionRelations = relations(authSessions, ({ one }) => ({
  superAdmin: one(superAdmins, {
    fields: [authSessions.superAdminId],
    references: [superAdmins.id],
  }),
  admin: one(admins, {
    fields: [authSessions.adminId],
    references: [admins.id],
  }),
  employee: one(employees, {
    fields: [authSessions.employeeId],
    references: [employees.id],
  }),
}));

export const passwordResetTokenRelations = relations(passwordResetTokens, ({ one }) => ({
  superAdmin: one(superAdmins, {
    fields: [passwordResetTokens.superAdminId],
    references: [superAdmins.id],
  }),
  admin: one(admins, {
    fields: [passwordResetTokens.adminId],
    references: [admins.id],
  }),
  employee: one(employees, {
    fields: [passwordResetTokens.employeeId],
    references: [employees.id],
  }),
}));

export const adminInvitationRelations = relations(adminInvitations, ({ one }) => ({
  superAdmin: one(superAdmins, {
    fields: [adminInvitations.superAdminId],
    references: [superAdmins.id],
    relationName: "invitedSuperAdmin",
  }),
  admin: one(admins, {
    fields: [adminInvitations.adminId],
    references: [admins.id],
  }),
  restaurant: one(restaurants, {
    fields: [adminInvitations.restaurantId],
    references: [restaurants.id],
  }),
  createdBySuperAdmin: one(superAdmins, {
    fields: [adminInvitations.createdBySuperAdminId],
    references: [superAdmins.id],
    relationName: "invitationCreatorSuperAdmin",
  }),
  createdByAdmin: one(admins, {
    fields: [adminInvitations.createdByAdminId],
    references: [admins.id],
    relationName: "invitationCreatorAdmin",
  }),
}));

export const adminRelations = relations(admins, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [admins.organizationId],
    references: [organizations.id],
  }),
  restaurant: one(restaurants, {
    fields: [admins.restaurantId],
    references: [restaurants.id],
  }),
  authSessions: many(authSessions),
  adminInvitations: many(adminInvitations),
}));

export const employeeRelations = relations(employees, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [employees.organizationId],
    references: [organizations.id],
  }),
  restaurant: one(restaurants, {
    fields: [employees.restaurantId],
    references: [restaurants.id],
  }),
  authSessions: many(authSessions),
}));
