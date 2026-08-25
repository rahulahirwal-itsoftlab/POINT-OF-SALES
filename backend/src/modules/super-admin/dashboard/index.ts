import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { DashboardController } from "./dashboard.controller.js";

export const dashboardRoutes = new Hono();
const controller = new DashboardController();

dashboardRoutes.get("/", requirePermission("dashboard:read"), (c) => controller.overview(c));
