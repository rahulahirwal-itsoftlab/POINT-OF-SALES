import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.middleware.js";
import { resolveTenant } from "../middleware/tenant.middleware.js";
import { requireActiveSubscription } from "../middleware/subscription.middleware.js";
import { appConfig } from "../config/app-config.js";
import { authRoutes } from "../modules/auth/index.js";
import { restaurantRoutes } from "../modules/restaurants/index.js";
import { subscriptionRoutes } from "../modules/subscriptions/index.js";
import { licenseRoutes } from "../modules/licenses/index.js";
import { menuRoutes } from "../modules/menu/index.js";
import { tableRoutes } from "../modules/tables/index.js";
import { customerRoutes } from "../modules/customers/index.js";
import { orderRoutes } from "../modules/orders/index.js";
import { kitchenRoutes } from "../modules/kitchen/index.js";
import { billingRoutes } from "../modules/billing/index.js";
import { paymentRoutes } from "../modules/payments/index.js";
import { auditLogRoutes } from "../modules/audit-logs/index.js";
import { notificationRoutes } from "../modules/notifications/index.js";
import { dashboardRoutes } from "../modules/dashboard/index.js";
import { inventoryRoutes } from "../modules/inventory/index.js";
import { restaurantAdminRoutes } from "../modules/restaurant-admin/index.js";
import { staffPosRoutes } from "../modules/staff-pos/index.js";
import { superAdminRoutes } from "../modules/super-admin/index.js";
import { franchiseAdminRoutes } from "../modules/franchise-admin/index.js";

export function registerRoutes(app: Hono) {
  const api = appConfig.apiPrefix;

  app.route(`${api}/auth`, authRoutes);
  app.route(`${api}/super-admin`, superAdminRoutes);
  app.route(`${api}/franchise-admin`, franchiseAdminRoutes);

  // Restaurant Level Middlewares
  const restaurantApp = new Hono();
  restaurantApp.use("*", requireAuth);
  restaurantApp.use("*", resolveTenant);
  restaurantApp.use("*", requireActiveSubscription);

  restaurantApp.route(`/restaurants`, restaurantRoutes);
  restaurantApp.route(`/subscriptions`, subscriptionRoutes);
  restaurantApp.route(`/licenses`, licenseRoutes);
  restaurantApp.route(`/menu`, menuRoutes);
  restaurantApp.route(`/tables`, tableRoutes);
  restaurantApp.route(`/customers`, customerRoutes);
  restaurantApp.route(`/orders`, orderRoutes);
  restaurantApp.route(`/kitchen`, kitchenRoutes);
  restaurantApp.route(`/billing`, billingRoutes);
  restaurantApp.route(`/payments`, paymentRoutes);
  restaurantApp.route(`/audit-logs`, auditLogRoutes);
  restaurantApp.route(`/notifications`, notificationRoutes);
  restaurantApp.route(`/dashboard`, dashboardRoutes);
  restaurantApp.route(`/inventory`, inventoryRoutes);
  restaurantApp.route(`/restaurant-admin`, restaurantAdminRoutes);
  restaurantApp.route(`/staff-pos`, staffPosRoutes);

  app.route(api, restaurantApp);
}
