import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { PlanController } from "./plan.controller.js";

export const planRoutes = new Hono();
const controller = new PlanController();

planRoutes.get("/", requirePermission("plan:read"), (c) => controller.list(c));
planRoutes.post("/", requirePermission("plan:create"), (c) => controller.create(c));
planRoutes.get("/:id", requirePermission("plan:read"), (c) => controller.detail(c));
planRoutes.patch("/:id", requirePermission("plan:update"), (c) => controller.update(c));
planRoutes.patch("/:id/status", requirePermission("plan:update"), (c) => controller.changeStatus(c));
