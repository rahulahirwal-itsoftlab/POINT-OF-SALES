import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { ProfileController } from "./profile.controller.js";

export const profileRoutes = new Hono();
const controller = new ProfileController();

profileRoutes.get("/", requirePermission("profile:read"), (c) => controller.me(c));
