import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { FranchiseAdminController } from "./franchise-admin.controller.js";

export const franchiseAdminRoutes = new Hono();
const controller = new FranchiseAdminController();

franchiseAdminRoutes.use("*", requireAuth, requireRole("FRANCHISE_STEWARD"));

franchiseAdminRoutes.get("/dashboard", (c) => controller.dashboard(c));
franchiseAdminRoutes.get("/super-admins", (c) => controller.listSuperAdmins(c));
franchiseAdminRoutes.post("/super-admins", (c) => controller.createSuperAdmin(c));
franchiseAdminRoutes.get("/super-admins/:id", (c) => controller.getSuperAdmin(c));
franchiseAdminRoutes.patch("/super-admins/:id", (c) => controller.updateSuperAdmin(c));
franchiseAdminRoutes.patch("/super-admins/:id/status", (c) => controller.toggleSuperAdminStatus(c));
franchiseAdminRoutes.get("/license", (c) => controller.getLicense(c));
franchiseAdminRoutes.post("/license/renew", (c) => controller.renewLicense(c));
franchiseAdminRoutes.get("/notifications", (c) => controller.notifications(c));
franchiseAdminRoutes.get("/audit-logs", (c) => controller.auditLogs(c));
