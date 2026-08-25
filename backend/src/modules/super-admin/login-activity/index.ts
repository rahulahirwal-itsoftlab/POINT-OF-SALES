import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { LoginActivityController } from "./login-activity.controller.js";

export const loginActivityRoutes = new Hono();
const controller = new LoginActivityController();

loginActivityRoutes.get("/", requirePermission("login-activity:read"), (c) => controller.list(c));
loginActivityRoutes.get("/:id", requirePermission("login-activity:read"), (c) => controller.detail(c));
