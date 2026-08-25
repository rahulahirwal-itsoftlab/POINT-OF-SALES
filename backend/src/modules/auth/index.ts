import { Hono } from "hono";
import { AuthController } from "./auth.controller.js";
import { loginRateLimit } from "../../middleware/login-rate-limit.middleware.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

export const authRoutes = new Hono();
const controller = new AuthController();

authRoutes.post("/login", loginRateLimit, (c) => controller.login(c));
authRoutes.post("/refresh", (c) => controller.refresh(c));
authRoutes.post("/logout", (c) => controller.logout(c));
authRoutes.get("/me", requireAuth, (c) => controller.me(c));

export * from "./auth.types.js";
