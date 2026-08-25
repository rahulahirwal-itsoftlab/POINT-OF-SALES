import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { LicenseController } from "./license.controller.js";

export const licenseRoutes = new Hono();
const controller = new LicenseController();

licenseRoutes.get("/", requirePermission("license:read"), (c) => controller.list(c));
licenseRoutes.get("/expiring", requirePermission("license:read"), (c) => controller.expiring(c));
licenseRoutes.get("/expired", requirePermission("license:read"), (c) => controller.expired(c));
licenseRoutes.get("/:id/history", requirePermission("license:read"), (c) => controller.history(c));
licenseRoutes.get("/:id", requirePermission("license:read"), (c) => controller.detail(c));
licenseRoutes.post("/:id/activate", requirePermission("license:write"), (c) => controller.activate(c));
licenseRoutes.post("/:id/suspend", requirePermission("license:write"), (c) => controller.suspend(c));
licenseRoutes.post("/:id/revoke", requirePermission("license:write"), (c) => controller.revoke(c));
licenseRoutes.post("/:id/renew", requirePermission("license:write"), (c) => controller.renew(c));
licenseRoutes.post("/trigger-expiry", requirePermission("license:write"), (c) => controller.triggerExpiry(c));
