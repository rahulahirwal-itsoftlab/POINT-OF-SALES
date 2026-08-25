import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { dashboardRoutes } from "./dashboard/index.js";
import { superAdminRestaurantRoutes } from "./restaurants/index.js";
import { planRoutes } from "./plans/index.js";
import { subscriptionRoutes } from "./subscriptions/index.js";
import { licenseRoutes } from "./licenses/index.js";
import { paymentRoutes } from "./payments/index.js";
import { auditRoutes } from "./audit-logs/index.js";
import { loginActivityRoutes } from "./login-activity/index.js";
import { notificationRoutes } from "./notifications/index.js";
import { profileRoutes } from "./profile/index.js";
import { revenueRoutes } from "./revenue/index.js";
import { settingsRoutes } from "./settings/index.js";

export const superAdminRoutes = new Hono();

superAdminRoutes.use("*", requireAuth, requireRole("SUPER_ADMIN"));

superAdminRoutes.route("/dashboard", dashboardRoutes);
superAdminRoutes.route("/revenue", revenueRoutes);
superAdminRoutes.route("/restaurants", superAdminRestaurantRoutes);
superAdminRoutes.route("/plans", planRoutes);
superAdminRoutes.route("/subscriptions", subscriptionRoutes);
superAdminRoutes.route("/licenses", licenseRoutes);
superAdminRoutes.route("/payments", paymentRoutes);
superAdminRoutes.route("/audit-logs", auditRoutes);
superAdminRoutes.route("/login-activity", loginActivityRoutes);
superAdminRoutes.route("/notifications", notificationRoutes);
superAdminRoutes.route("/profile", profileRoutes);
superAdminRoutes.route("/settings", settingsRoutes);
