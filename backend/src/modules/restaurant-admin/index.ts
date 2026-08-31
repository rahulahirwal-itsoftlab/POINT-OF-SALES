import { Hono } from "hono";
import { requireRole } from "../../middleware/role.middleware.js";
import { RestaurantAdminController } from "./restaurant-admin.controller.js";

export const restaurantAdminRoutes = new Hono();
const controller = new RestaurantAdminController();

restaurantAdminRoutes.use("*", requireRole("RESTAURANT_ADMIN"));

restaurantAdminRoutes.get("/dashboard", (c) => controller.dashboard(c));
restaurantAdminRoutes.get("/staff", (c) => controller.staff(c));
restaurantAdminRoutes.post("/staff", (c) => controller.createStaff(c));
restaurantAdminRoutes.get("/staff/:id", (c) => controller.staffDetail(c));
restaurantAdminRoutes.patch("/staff/:id", (c) => controller.updateStaff(c));
restaurantAdminRoutes.patch("/staff/:id/status", (c) => controller.changeStaffStatus(c));
restaurantAdminRoutes.get("/bills", (c) => controller.bills(c));
restaurantAdminRoutes.get("/bills/:id", (c) => controller.billDetail(c));
restaurantAdminRoutes.get("/subscription", (c) => controller.subscription(c));
restaurantAdminRoutes.get("/plans", (c) => controller.availablePlans(c));
restaurantAdminRoutes.post("/subscription/renew", (c) => controller.renewSubscription(c));
restaurantAdminRoutes.get("/audit-logs", (c) => controller.auditLogs(c));
restaurantAdminRoutes.get("/activity-logs", (c) => controller.activityLogs(c));
restaurantAdminRoutes.get("/notifications", (c) => controller.notifications(c));
restaurantAdminRoutes.patch("/notifications/read-all", (c) => controller.readAllNotifications(c));
restaurantAdminRoutes.patch("/notifications/:id/read", (c) => controller.readNotification(c));
