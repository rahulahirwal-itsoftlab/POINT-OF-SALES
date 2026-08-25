import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { SubscriptionController } from "./subscription.controller.js";

export const subscriptionRoutes = new Hono();
const controller = new SubscriptionController();

subscriptionRoutes.get("/", requirePermission("subscription:read"), (c) => controller.list(c));
subscriptionRoutes.post("/trigger-expiry", requirePermission("subscription:update"), (c) => controller.triggerExpiry(c));
subscriptionRoutes.post("/notify-expiring", requirePermission("subscription:update"), (c) => controller.notifyExpiringSoon(c));
subscriptionRoutes.get("/:id", requirePermission("subscription:read"), (c) => controller.detail(c));
subscriptionRoutes.post("/", requirePermission("subscription:create"), (c) => controller.create(c));
subscriptionRoutes.patch("/:id", requirePermission("subscription:update"), (c) => controller.update(c));
subscriptionRoutes.post("/:id/renew", requirePermission("subscription:renew"), (c) => controller.renew(c));
subscriptionRoutes.post("/:id/suspend", requirePermission("subscription:suspend"), (c) => controller.suspend(c));
subscriptionRoutes.post("/:id/cancel", requirePermission("subscription:cancel"), (c) => controller.cancel(c));
subscriptionRoutes.post("/:id/reactivate", requirePermission("subscription:update"), (c) => controller.reactivate(c));
