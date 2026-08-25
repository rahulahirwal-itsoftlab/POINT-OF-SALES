import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { SettingsController } from "./settings.controller.js";

export const settingsRoutes = new Hono();
const controller = new SettingsController();

settingsRoutes.get("/", requirePermission("settings:read"), (c) => controller.get(c));
settingsRoutes.patch("/", requirePermission("settings:write"), (c) => controller.update(c));

export * from "./settings.types.js";
export * from "./settings.validation.js";
export * from "./settings.repository.js";
export * from "./settings.service.js";
export * from "./settings.controller.js";
