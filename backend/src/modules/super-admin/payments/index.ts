import { Hono } from "hono";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { PaymentController } from "./payment.controller.js";

export const paymentRoutes = new Hono();
const controller = new PaymentController();

paymentRoutes.get("/", requirePermission("payment:read"), (c) => controller.list(c));
paymentRoutes.get("/:id", requirePermission("payment:read"), (c) => controller.detail(c));
