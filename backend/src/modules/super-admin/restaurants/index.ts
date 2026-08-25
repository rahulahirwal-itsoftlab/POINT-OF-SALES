import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { RestaurantController } from "./restaurant.controller.js";

export const superAdminRestaurantRoutes = new Hono();
const controller = new RestaurantController();

superAdminRestaurantRoutes.get("/", requirePermission("restaurant:read"), (c) => controller.list(c));
superAdminRestaurantRoutes.post("/", requirePermission("restaurant:create"), (c) => controller.create(c));
superAdminRestaurantRoutes.get("/:id", requirePermission("restaurant:read"), (c) => controller.detail(c));
superAdminRestaurantRoutes.patch("/:id", requirePermission("restaurant:update"), (c) => controller.update(c));
superAdminRestaurantRoutes.delete("/:id", requirePermission("restaurant:delete"), (c) => controller.delete(c));
superAdminRestaurantRoutes.patch("/:id/status", requirePermission("restaurant:update"), (c) => controller.changeStatus(c));
superAdminRestaurantRoutes.patch("/:id/activate", requirePermission("restaurant:activate"), (c) => controller.setStatus(c, "ACTIVE"));
superAdminRestaurantRoutes.patch("/:id/deactivate", requirePermission("restaurant:update"), (c) => controller.setStatus(c, "INACTIVE"));
superAdminRestaurantRoutes.patch("/:id/block", requirePermission("restaurant:block"), (c) => controller.setStatus(c, "BLOCKED"));
superAdminRestaurantRoutes.patch("/:id/unblock", requirePermission("restaurant:activate"), (c) => controller.setStatus(c, "ACTIVE"));
