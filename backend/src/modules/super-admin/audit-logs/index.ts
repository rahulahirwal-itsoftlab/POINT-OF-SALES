import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { AuditController } from "./audit.controller.js";

export const auditRoutes = new Hono();
const controller = new AuditController();

auditRoutes.get("/", requirePermission("audit:read"), (c) => controller.list(c));
auditRoutes.get("/filters", requirePermission("audit:read"), (c) => controller.listFilters(c));
auditRoutes.get("/:id", requirePermission("audit:read"), (c) => controller.detail(c));
