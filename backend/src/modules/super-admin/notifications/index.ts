import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { NotificationController } from "./notification.controller.js";

export const notificationRoutes = new Hono();
const controller = new NotificationController();

notificationRoutes.get("/", requirePermission("notification:read"), (c) => controller.list(c));
notificationRoutes.patch("/read-all", requirePermission("notification:manage"), (c) => controller.markAllRead(c));
notificationRoutes.get("/:id", requirePermission("notification:read"), (c) => controller.detail(c));
notificationRoutes.patch("/:id/read", requirePermission("notification:manage"), (c) => controller.markRead(c));
